import http from 'node:http';
import {holdingsService} from './city-holdings.mjs';
import {createRooms} from './city-rooms.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const scope={};for(const file of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-clans.js','city-monk.js'])vm.runInNewContext(await fs.readFile(path.join(root,file),'utf8'),scope);
const {Engine}=scope.MemeCityCore;
const tokenScope={window:{}};for(const f of ['tokens.js','launchpad-config.js'])vm.runInNewContext(await fs.readFile(path.join(root,f),'utf8'),tokenScope);
const mints=Object.fromEntries([tokenScope.window.LAUNCHPAD_CONFIG.platformToken,...tokenScope.window.MEME_TOKENS.filter(t=>t.mint)].map(t=>[t.id,t.mint]));
const contentTypes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mp4':'video/mp4','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const files=new Set(['index.html','beta.html','creators.html','city.html','city-roadmap.html','city.css','city.js','city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-clans.js','city-monk.js','city-room-visuals.js','city-rise-visuals.js','city-visuals.js','city-districts.js','city-network.js','city-room-client.js','styles.css','app.js','tokens.js','launchpad-config.js','trade-core.js','trade.js','share-core.js','social.js','pwa.js','sw.js','manifest.webmanifest','offline.html','launchpad.js','launchpad.css']);
export function createCityServer({origins=[],now=()=>Date.now()}={}){
 const holdings=holdingsService({mints,now});
 const service=createRooms(Engine,{now}),engine=service.first.engine,sessions=service.sessions,streams=new Map();
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 const server=http.createServer({requestTimeout:15000,headersTimeout:10000,maxHeaderSize:8192},async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  const origin=req.headers.origin,own=`${req.socket.encrypted?'https':'http'}://${req.headers.host}`;
  const originAllowed=!origin||origin===own||origin===`https://${req.headers.host}`||origins.includes(origin);
  if(origin&&originAllowed){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  let url;try{url=new URL(req.url,'http://local');}catch{return json(res,400,{error:'Invalid URL.'});}
  if(url.pathname.startsWith('/api/city/')){
   if(!originAllowed)return json(res,403,{error:'Origin is not allowed.'});
   res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");
   if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Max-Age':'600'});return res.end();}
   try{
    const route=url.pathname.slice('/api/city'.length);
    if(route==='/health'&&req.method==='GET')return json(res,200,service.health());
    let body={};if(req.method==='POST'){
     if(!String(req.headers['content-type']).startsWith('application/json'))return json(res,415,{error:'Use application/json.'});
     let data='';for await(const chunk of req){data+=chunk;if(Buffer.byteLength(data)>4096)return json(res,413,{error:'Request is too large.'});}try{body=JSON.parse(data);}catch{return json(res,400,{error:'Invalid JSON.'});}if(!body||typeof body!=='object'||Array.isArray(body))return json(res,400,{error:'Invalid action body.'});
    }
    if(route==='/join'&&req.method==='POST'){
     return json(res,201,service.join(body,req.socket.remoteAddress||'unknown'));
    }
    const token=String(req.headers.authorization||'').replace(/^Bearer /,''),session=service.auth(token);
    if(route==='/wallet/challenge'&&req.method==='POST')return json(res,200,holdings.challenge(session,body.address));
    if(route==='/wallet/check'&&req.method==='POST')return json(res,200,await holdings.check(session,service.rooms.get(session.room).engine.player(session.id),body));
    if(route==='/wallet/disconnect'&&req.method==='POST'){session.walletEpoch=(session.walletEpoch||0)+1;delete session.walletAddress;delete session.walletChallenge;service.rooms.get(session.room).engine.player(session.id).holder=null;return json(res,200,{ok:true});}
    if(route==='/events'&&req.method==='GET'){
     streams.get(token)?.end();streams.set(token,res);res.writeHead(200,{'Content-Type':'application/x-ndjson','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no'});res.write(JSON.stringify(service.snapshot(session))+'\n');req.on('close',()=>{if(streams.get(token)===res)streams.delete(token);});return;
    }
    if(route==='/input'&&req.method==='POST'){service.input(session,body);return json(res,200,{ok:true});}
    if(route==='/action'&&req.method==='POST')return json(res,200,service.action(session,body));
    if(route==='/state'&&req.method==='GET')return json(res,200,service.snapshot(session));
    if(route==='/leave'&&req.method==='POST'){streams.get(token)?.end();streams.delete(token);service.leave(token);return json(res,200,{ok:true});}
    return json(res,404,{error:'Unknown room endpoint.'});
   }catch(e){return json(res,e.status||400,{error:e.message});}
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
  try{
   const relative=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';
   if(relative==='city-network.js'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});return res.end("window.MEME_CITY_NETWORK=Object.freeze({enabled:true,apiBase:'/api/city'});");}
   if(!files.has(relative)&&!/^assets\/[a-zA-Z0-9_/-]+\.(webp|png|svg|jpg|mp4)$/.test(relative)&&!/^tokens\/[a-z-]+\/(index.html)?$/.test(relative)){res.writeHead(404);return res.end('Not found');}
   const file=path.resolve(root,relative.endsWith('/')?relative+'index.html':relative);if(!file.startsWith(root)){res.writeHead(403);return res.end();}
   const data=await fs.readFile(file),headers={'Content-Type':contentTypes[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Content-Length':data.length};
   if(path.extname(file)==='.mp4'){
    headers['Accept-Ranges']='bytes';
    if(req.headers.range&&req.method==='GET'){
     const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
     let start=match?.[1]?Number(match[1]):0,end=match?.[2]?Number(match[2]):data.length-1;
     if(match&&!match[1]&&match[2]){start=Math.max(0,data.length-Number(match[2]));end=data.length-1;}
     if(!match||(!match[1]&&!match[2])||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=data.length||start>end){res.writeHead(416,{'Content-Range':`bytes */${data.length}`});return res.end();}
     end=Math.min(end,data.length-1);res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});return res.end(data.subarray(start,end+1));
    }
   }
   res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404);res.end('Not found');}
 });
 const tick=setInterval(()=>service.advance(),50);
 const publish=setInterval(()=>{for(const [token,res]of streams){const s=sessions.get(token);if(!s){res.end();streams.delete(token);continue;}if(res.writableLength>262144){res.destroy();streams.delete(token);continue;}res.write(JSON.stringify(service.snapshot(s))+'\n');}},100);
 const reap=setInterval(()=>service.reap(),5000);
 server.maxConnections=256;server.keepAliveTimeout=5000;server.maxHeadersCount=40;
 server.on('close',()=>{clearInterval(tick);clearInterval(publish);clearInterval(reap);for(const r of streams.values())r.end();});
 return {server,engine,service};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const portFlag=process.argv.indexOf('--port');
 const port=Number(process.env.PORT||(portFlag>=0?process.argv[portFlag+1]:8787)),origins=String(process.env.CITY_ALLOWED_ORIGINS||'https://kaibuzz0.github.io').split(',').filter(Boolean);
 const {server}=createCityServer({origins});server.listen(port,'0.0.0.0',()=>console.log(`Meme City room server listening on port ${port}. Open /city.html. Temporary play-credit accounts only.`));
}
