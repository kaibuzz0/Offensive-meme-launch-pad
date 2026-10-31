import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalWorld2Server} from '../server/city-world2-local.mjs';
async function harness(fn){
 const h=createLocalWorld2Server(),address=await h.listen(0),url='http://127.0.0.1:'+address.port+'/api/world2';
 async function call(path,{method='GET',token,body,origin}={}){
  const headers={};if(body!==undefined)headers['Content-Type']='application/json';
  if(token)headers.Authorization='Bearer '+token;if(origin)headers.Origin=origin;
  const r=await fetch(url+path,{method,headers,body:body!==undefined?JSON.stringify(body):undefined});
  return {status:r.status,body:await r.json()};
 }
 try{await fn({h,call});}finally{await h.close();}
}
test('local world2 QA server is loopback-only and exposes distinct preview health',async()=>{
 await harness(async({h,call})=>{
  const host=h.server.address();assert.equal(host.address,'127.0.0.1');
  const r=await call('/health');assert.equal(r.status,200);
  assert.equal(r.body.worldVersion,2);assert.equal(r.body.preview,true);
  assert.equal((await call('/api/city/health')).status,404);
  assert.equal((await call('/state')).status,401);
 });
});
test('world2 HTTP guests share snapshots without private inventory or session token leakage',async()=>{
 await harness(async({h,call})=>{
  const a=await call('/join',{method:'POST',body:{name:'Alice',avatar:'offensive'}});
  const b=await call('/join',{method:'POST',body:{name:'Bob',avatar:'offensive'}});
  assert.equal(a.status,201);assert.equal(b.status,201);
  assert.equal(b.body.state.players.length,2);
  const state=await call('/state',{token:b.body.session});
  assert.equal(state.status,200);assert.equal(state.body.worldVersion,2);
  assert.equal(state.body.players[0].inventory,undefined);
  assert.ok(!JSON.stringify(state.body).includes(a.body.session));
  const guest=h.rooms.auth(a.body.session);
  const p=h.rooms.first.engine.player(guest.id);
  const before=p.x;const moved=await call('/input',{method:'POST',token:a.body.session,body:{x:1,y:0,seq:1}});
  assert.equal(moved.status,200);
  h.rooms.first.engine.tick(.05);assert.ok(p.x>before);
  assert.equal((await call('/leave',{method:'POST',token:a.body.session,body:{}})).status,200);
  assert.equal((await call('/state',{token:a.body.session})).status,401);
 });
});
test('HTTP rejects forged currency, teleport, unsupported actions and cross-origin requests',async()=>{
 await harness(async({call})=>{
  assert.equal((await call('/join',{method:'POST',body:{name:'Q',avatar:'offensive'},origin:'https://evil.example'})).status,403);
  const a=await call('/join',{method:'POST',body:{name:'Q',avatar:'offensive'}}),token=a.body.session;
  assert.equal((await call('/action',{method:'POST',token,body:{type:'setCredits',credits:999999}})).status,400);
  assert.equal((await call('/action',{method:'POST',token,body:{type:'enterBuilding',building:'shop',x:5000,y:4000}})).status,400);
  assert.equal((await call('/input',{method:'POST',token,body:{x:999,y:0}})).status,400);
  const state=await call('/state',{token});
  assert.equal(state.body.self.credits,180);
  assert.equal(state.body.self.room,null);
 });
});
test('local origin preflight permits only developer frontends and rejects malformed bodies',async()=>{
 await harness(async({call})=>{
  const permitted=await call('/health',{origin:'http://localhost:8787'});assert.equal(permitted.status,200);
  const denied=await call('/health',{origin:'https://untrusted.example'});assert.equal(denied.status,403);
  const r=await call('/join',{method:'POST',body:[]});assert.equal(r.status,400);
 });
});
