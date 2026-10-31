/* LOCAL-ONLY world2 room HTTP QA harness. This is not mounted on production or Render.
 * Deliberately binds loopback only. Uses server-owned, expiring guest session tokens.
 */
import http from 'node:http';
import {createWorld2PrototypeRooms} from './city-world2-prototype.mjs';
import {createWorld2Vault} from './city-world2-vault.mjs';

export function createLocalWorld2Server({now=Date.now,origins=['http://localhost:8787','http://127.0.0.1:8787'],
 saveDir=process.env.WORLD2_QA_SAVE_DIR||null}={}){
 const {rooms}=createWorld2PrototypeRooms({now,capacity:8,maxRooms:8});
 const vault=saveDir?createWorld2Vault(saveDir):null;
 const profiles=new Map(),active=new Map();
 function recordFor(token){const s=rooms.sessions.get(token),id=profiles.get(token);
  if(!s||!id)return null;
  return {id,progress:rooms.rooms.get(s.room).engine.exportProgress(s.id)};
 }
 async function saveProfile(token){const data=recordFor(token);if(!data)return null;
  return vault.save(data.id,data.progress);
 }
 function release(token){const id=profiles.get(token);profiles.delete(token);
  if(id&&active.get(id)===token)active.delete(id);
 }
 async function flush(){if(!vault)return;
  await Promise.allSettled([...profiles.keys()].map(async token=>{
   if(!rooms.sessions.has(token)){release(token);return;}
   await saveProfile(token);
  }));
 }
 const respond=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
 const server=http.createServer({requestTimeout:15000,headersTimeout:10000,maxHeaderSize:8192},async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  const origin=req.headers.origin;
  if(origin&&!origins.includes(origin))return respond(res,403,{error:'Origin not allowed.'});
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  let url;try{url=new URL(req.url,'http://127.0.0.1');}catch{return respond(res,400,{error:'Invalid URL.'});}
  if(!url.pathname.startsWith('/api/world2/'))return respond(res,404,{error:'Unknown endpoint.'});
  res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");
  if(req.method==='OPTIONS'){
   res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'});return res.end();
  }
  const path=url.pathname.slice('/api/world2'.length);
  if(req.method!=='GET'&&req.method!=='POST')return respond(res,405,{error:'Method unavailable.'});
  if(path==='/health'&&req.method==='GET')
   return respond(res,200,{status:'ok',protocol:2,worldVersion:2,preview:true,persistence:!!vault,...rooms.health()});
  if(!['/join','/state','/input','/action','/leave','/profile/create','/profile/save'].includes(path))return respond(res,404,{error:'Unknown world2 action.'});
  let body={};
  if(req.method==='POST'){
   if(!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type']||'')))
    return respond(res,415,{error:'JSON content type required.'});
   let data='';
   try{for await(const chunk of req){data+=chunk;if(Buffer.byteLength(data)>4096)
    return respond(res,413,{error:'JSON body limit exceeded.'});}}
   catch{return respond(res,400,{error:'Invalid request body.'});}
   try{body=JSON.parse(data);}catch{return respond(res,400,{error:'Malformed JSON.'});}
   if(!body||typeof body!=='object'||Array.isArray(body))return respond(res,400,{error:'Action body must be an object.'});
  }
  try{
   if(path==='/join'&&req.method==='POST'){
    const {recoveryKey,...requested}=body;
    let saved=null;
    if(recoveryKey!==undefined){
     if(!vault)return respond(res,404,{error:'QA profile persistence is disabled.'});
     saved=await vault.load(recoveryKey);
     rooms.reap();
     const previous=active.get(saved.id);
     if(previous&&rooms.sessions.has(previous))return respond(res,409,{error:'This QA profile is active in another session.'});
     if(previous)release(previous);
    }
    const joined=rooms.join(requested,req.socket.remoteAddress||'local');
    if(saved){
     try{
      const session=rooms.auth(joined.session);
      rooms.rooms.get(session.room).engine.restoreProgress(session.id,saved.progress);
     }catch(e){rooms.leave(joined.session);throw e;}
     profiles.set(joined.session,saved.id);active.set(saved.id,joined.session);
     joined.state=rooms.snapshot(rooms.auth(joined.session));
    }
    return respond(res,201,joined);
   }
   const token=String(req.headers.authorization||'').replace(/^Bearer /i,'');
   if(!/^[a-f0-9]{64}$/i.test(token))return respond(res,401,{error:'Bearer token required.'});
   const session=rooms.auth(token);
   if(path==='/profile/create'&&req.method==='POST'){
    if(!vault)return respond(res,404,{error:'QA profile persistence is disabled.'});
    if(profiles.has(token))return respond(res,409,{error:'This guest already has a saved QA profile.'});
    const engine=rooms.rooms.get(session.room).engine;
    const created=await vault.create(engine.exportProgress(session.id));
    profiles.set(token,created.id);active.set(created.id,token);
    return respond(res,201,{recoveryKey:created.recoveryKey,revision:created.revision,
     message:'Keep this private recovery key. It will not be shown again.'});
   }
   if(path==='/profile/save'&&req.method==='POST'){
    if(!vault)return respond(res,404,{error:'QA profile persistence is disabled.'});
    if(!profiles.has(token))return respond(res,404,{error:'Create a QA profile before saving.'});
    const result=await saveProfile(token);
    return respond(res,200,{saved:true,revision:result.revision});
   }
   if(path==='/state'&&req.method==='GET')return respond(res,200,rooms.snapshot(session));
   if(path==='/input'&&req.method==='POST'){rooms.input(session,body);return respond(res,200,{ok:true});}
   if(path==='/action'&&req.method==='POST'){
    const result=rooms.action(session,body);
    if(profiles.has(token))await saveProfile(token);
    return respond(res,200,result);
   }
   if(path==='/leave'&&req.method==='POST'){
    if(profiles.has(token))await saveProfile(token);
    rooms.leave(token);release(token);return respond(res,200,{ok:true});
   }
   return respond(res,404,{error:'Unknown world2 action.'});
  }catch(e){return respond(res,Number.isSafeInteger(e?.status)?e.status:400,{error:String(e?.message||'Request refused.')});}
 });
 let interval=null,checkpoint=null;
 server.on('listening',()=>{
  interval=setInterval(()=>rooms.advance(),50);interval.unref();
  if(vault){checkpoint=setInterval(()=>{void flush();},4000);checkpoint.unref();}
 });
 server.on('close',()=>{
  if(interval){clearInterval(interval);interval=null;}
  if(checkpoint){clearInterval(checkpoint);checkpoint=null;}
 });
 return {server,rooms,listen:(port=8788)=>new Promise((resolve,reject)=>{
  if(server.listening)return resolve(server.address());
  server.once('error',reject);server.listen(port,'127.0.0.1',()=>{
   server.removeListener('error',reject);resolve(server.address());
  });
 }),close:async()=>{await flush();return new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const host=createLocalWorld2Server();const a=await host.listen();
 console.log('World2 local QA API http://127.0.0.1:'+a.port+'/api/world2/health');
}
