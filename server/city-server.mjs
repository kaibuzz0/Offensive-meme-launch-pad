import http from 'node:http';
import {randomBytes} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const scope={};vm.runInNewContext(await fs.readFile(path.join(root,'city-core.js'),'utf8'),scope);
const {Engine}=scope.MemeCityCore;
const contentTypes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const files=new Set(['index.html','beta.html','creators.html','city.html','city-roadmap.html','city.css','city.js','city-core.js','city-network.js','styles.css','app.js','tokens.js','launchpad-config.js','trade-core.js','trade.js','share-core.js','social.js','pwa.js','sw.js','manifest.webmanifest','offline.html','launchpad.js','launchpad.css']);
export function createCityServer({origins=[],now=()=>Date.now()}={}){
 const engine=new Engine(),sessions=new Map(),streams=new Map(),joinLimits=new Map();let last=now();
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  const origin=req.headers.origin,own=`${req.socket.encrypted?'https':'http'}://${req.headers.host}`;
  const originAllowed=!origin||origin===own||origins.includes(origin);
  if(origin&&originAllowed){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  const url=new URL(req.url,'http://local');
  if(url.pathname.startsWith('/api/city/')){
   if(!originAllowed)return json(res,403,{error:'Origin is not allowed.'});
   if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Max-Age':'600'});return res.end();}
   try{
    const route=url.pathname.slice('/api/city'.length);
    if(route==='/health'&&req.method==='GET')return json(res,200,{status:'ok',mode:'temporary-play-credit-room',players:engine.players.size,capacity:32});
    let body={};if(req.method==='POST'){
     if(!String(req.headers['content-type']).startsWith('application/json'))return json(res,415,{error:'Use application/json.'});
     let data='';for await(const chunk of req){data+=chunk;if(Buffer.byteLength(data)>4096)return json(res,413,{error:'Request is too large.'});}try{body=JSON.parse(data);}catch{return json(res,400,{error:'Invalid JSON.'});}if(!body||typeof body!=='object'||Array.isArray(body))return json(res,400,{error:'Invalid action body.'});
    }
    if(route==='/join'&&req.method==='POST'){
     const ip=req.socket.remoteAddress||'unknown',stamp=now();let limit=joinLimits.get(ip);if(!limit||stamp-limit.start>600000){limit={start:stamp,count:0};joinLimits.set(ip,limit);}if(++limit.count>12)return json(res,429,{error:'Too many joins. Try again later.'});
     const token=randomBytes(32).toString('hex'),id=randomBytes(8).toString('hex');engine.join(id,body.name,body.avatar);sessions.set(token,{id,lastSeen:stamp,window:stamp,count:0,lastInput:stamp});return json(res,201,{session:token,state:engine.snapshot(id)});
    }
    const token=String(req.headers.authorization||'').replace(/^Bearer /,''),session=sessions.get(token);if(!session)return json(res,401,{error:'Session expired. Reload to rejoin.'});
    const stamp=now();session.lastSeen=stamp;if(stamp-session.window>1000){session.window=stamp;session.count=0;}if(++session.count>35)return json(res,429,{error:'Too many requests.'});
    if(route==='/events'&&req.method==='GET'){
     streams.get(token)?.end();streams.set(token,res);res.writeHead(200,{'Content-Type':'application/x-ndjson','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no'});res.write(JSON.stringify(engine.snapshot(session.id))+'\n');req.on('close',()=>{if(streams.get(token)===res)streams.delete(token);});return;
    }
    if(route==='/input'&&req.method==='POST'){engine.input(session.id,body.x,body.y);session.lastInput=stamp;return json(res,200,{ok:true});}
    if(route==='/action'&&req.method==='POST'){const message=engine.action(session.id,body);return json(res,200,{message,state:engine.snapshot(session.id)});}
    if(route==='/state'&&req.method==='GET')return json(res,200,engine.snapshot(session.id));
    if(route==='/leave'&&req.method==='POST'){streams.get(token)?.end();streams.delete(token);engine.leave(session.id);sessions.delete(token);return json(res,200,{ok:true});}
    return json(res,404,{error:'Unknown room endpoint.'});
   }catch(e){return json(res,400,{error:e.message});}
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
  try{
   const relative=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';
   if(relative==='city-network.js'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});return res.end("window.MEME_CITY_NETWORK=Object.freeze({enabled:true,apiBase:'/api/city'});");}
   if(!files.has(relative)&&!/^assets\/[a-zA-Z0-9_/-]+\.(webp|png|svg)$/.test(relative)&&!/^tokens\/[a-z-]+\/(index.html)?$/.test(relative)){res.writeHead(404);return res.end('Not found');}
   const file=path.resolve(root,relative.endsWith('/')?relative+'index.html':relative);if(!file.startsWith(root)){res.writeHead(403);return res.end();}
   const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':contentTypes[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404);res.end('Not found');}
 });
 const tick=setInterval(()=>{const stamp=now(),dt=(stamp-last)/1000;last=stamp;for(const s of sessions.values())if(stamp-s.lastInput>500)engine.input(s.id,0,0);engine.tick(dt);},50);
 const publish=setInterval(()=>{for(const [token,res]of streams){const s=sessions.get(token);if(!s)continue;if(res.writableLength>262144){res.destroy();streams.delete(token);continue;}res.write(JSON.stringify(engine.snapshot(s.id))+'\n');}},200);
 const reap=setInterval(()=>{const stamp=now();for(const [token,s]of sessions)if(stamp-s.lastSeen>45000){streams.get(token)?.end();streams.delete(token);engine.leave(s.id);sessions.delete(token);}for(const [ip,l]of joinLimits)if(stamp-l.start>600000)joinLimits.delete(ip);},5000);
 server.on('close',()=>{clearInterval(tick);clearInterval(publish);clearInterval(reap);for(const r of streams.values())r.end();});
 return {server,engine};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const portFlag=process.argv.indexOf('--port');
 const port=Number(process.env.PORT||(portFlag>=0?process.argv[portFlag+1]:8787)),origins=String(process.env.CITY_ALLOWED_ORIGINS||'https://kaibuzz0.github.io').split(',').filter(Boolean);
 const {server}=createCityServer({origins});server.listen(port,'0.0.0.0',()=>console.log(`Meme City room server listening on port ${port}. Open /city.html. Temporary play-credit accounts only.`));
}
