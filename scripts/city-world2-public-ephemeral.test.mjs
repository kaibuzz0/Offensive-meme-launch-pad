import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld2EphemeralPublicServer} from '../server/city-world2-ephemeral-public.mjs';
import fs from 'node:fs';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('single existing Render host exposes public v2 ephemeral rooms and retains legacy API',async()=>{
 const app=createWorld2EphemeralPublicServer();
 try{
  await new Promise((resolve,reject)=>{
   app.server.once('error',reject);
   app.server.listen(0,'127.0.0.1',()=>{app.server.off('error',reject);resolve();});
  });
  const base='http://127.0.0.1:'+app.server.address().port,headers={Origin:'https://kaibuzz0.github.io'};
  const health=await fetch(base+'/api/world2/health',{headers});
  assert.equal(health.status,200);
  const state=await health.json();
  assert.equal(state.worldVersion,2);
  assert.equal(state.persistence,false);
  assert.equal(state.preview,true,'must not claim durable release readiness');
  assert.equal(state.releaseReady,false);
  const old=await fetch(base+'/api/city/health',{headers});
  assert.equal(old.status,200,'existing legacy API stays alive for backward compatibility');
  const join=await fetch(base+'/api/world2/join',{
   method:'POST',headers:{...headers,'Content-Type':'application/json'},
   body:JSON.stringify({name:'World 2 player',avatar:'offensive'})
  });
  assert.equal(join.status,201);
  const result=await join.json();assert.equal(result.state.worldVersion,2);
  assert.match(result.session,/^[0-9a-f]{64}$/);
  const snapshot=await fetch(base+'/api/world2/state',{headers:{...headers,Authorization:'Bearer '+result.session}});
  assert.equal(snapshot.status,200);
  assert.equal((await snapshot.json()).self.name,'World 2 player');
  const denied=await fetch(base+'/api/world2/profile/create',{method:'POST',
   headers:{...headers,'Content-Type':'application/json',Authorization:'Bearer '+result.session},
   body:'{}'});
  assert.equal(denied.status,404,'no durable profile creation on free tier');
  const other=await fetch(base+'/api/world2/join',{method:'POST',
   headers:{Origin:'https://evil.example','Content-Type':'application/json'},
   body:JSON.stringify({name:'Outside',avatar:'offensive'})});
  assert.equal(other.status,403,'public API only grants official frontend CORS origin');
  const page=await fetch(base+'/city-world2-production.html');
  assert.equal(page.status,200);assert.match(await page.text(),/PROGRESS IS TEMPORARY/);
  const entrance=await fetch(base+'/city.html',{redirect:'manual'});
  assert.equal(entrance.status,302);
  assert.equal(entrance.headers.get('location'),'https://kaibuzz0.github.io/Offensive-meme-launch-pad/city.html');
  const leave=await fetch(base+'/api/world2/leave',{method:'POST',headers:{...headers,'Content-Type':'application/json',Authorization:'Bearer '+result.session},body:'{}'});
  assert.equal(leave.status,200);
 }finally{
  app.server.closeAllConnections();
  await app.close();
 }
});
test('public v2 frontend has one default play destination and never advertises legacy gameplay',()=>{
 assert.match(read('index.html'),/WORLD V2 · MULTIPLAYER EARLY ACCESS/);
 assert.match(read('city-world2-production.html'),/MEME CITY v2 — LIVE CITY/);
 assert.match(read('city-world2-production.html'),/PROGRESS IS TEMPORARY/);
 assert.doesNotMatch(read('city-world2-production.html'),/Keep playing world-v1|city.html\?legacy=1|v2 deployment candidate/i);
 assert.match(read('city-v2-release-gate.js'),/root.location.replace\('\.\/city-world2-production.html'\)/);
 assert.match(read('city-world2-online-transport.js'),/https:\/\/offensive-meme-city-rooms.onrender.com\/api\/world2/);
});
