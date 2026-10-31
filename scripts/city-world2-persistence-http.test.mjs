import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createLocalWorld2Server} from '../server/city-world2-local.mjs';
async function fixture(fn){
 const dir=await mkdtemp(path.join(tmpdir(),'city-world2-local-qa-'));
 try{await fn(dir);}finally{await rm(dir,{recursive:true,force:true});}
}
async function open(saveDir){
 const host=createLocalWorld2Server({saveDir}),address=await host.listen(0);
 async function call(path,{token,body,method=body?'POST':'GET'}={}){
  const response=await fetch('http://127.0.0.1:'+address.port+'/api/world2'+path,{
   method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},
   ...(body?{body:JSON.stringify(body)}:{})});
  return {status:response.status,data:await response.json()};
 }
 return {host,call};
}
test('local QA persistence remains opt-in and requires a valid guest session',async()=>{
 const {host,call}=await open(null);
 try{
  assert.equal((await call('/health')).data.persistence,false);
  assert.equal((await call('/profile/create',{body:{}})).status,401);
  const {data:join}=await call('/join',{body:{name:'No account',avatar:'offensive'}});
  assert.equal((await call('/profile/create',{token:join.session,body:{}})).status,404);
  assert.equal((await call('/profile/save',{token:join.session,body:{}})).status,404);
  assert.equal((await call('/join',{body:{name:'No',avatar:'offensive',recoveryKey:'nope'}})).status,404);
 }finally{await host.close();}
});
test('saved world2 guest restores mission, credits, gear, fortress, squad after local server restart',async()=>{
 await fixture(async dir=>{
  let first=await open(dir),key;
  try{
   const response=await first.call('/join',{body:{name:'Saved player',avatar:'offensive'}});
   const token=response.data.session;
   const created=await first.call('/profile/create',{token,body:{}});
   assert.equal(created.status,201);key=created.data.recoveryKey;
   assert.match(key,/^[A-Za-z0-9_-]{43}$/);
   assert.equal((await first.call('/profile/create',{token,body:{}})).status,409);
   const session=first.host.rooms.auth(token),e=first.host.rooms.first.engine,p=e.player(session.id);
   const door= e.journeys.get(session.id).snapshot();
   assert.equal(door.index,0);
   // All mutations happen through the same validated world2 room actions as the real browser.
   p.x=first.host.rooms.first.engine.territory.zones[0].x+250;
   p.y=first.host.rooms.first.engine.territory.zones[0].y+250;
   const shop=first.host.rooms.first.engine; // The canonical shop door comes from the loader.
   const {R}=await import('../server/city-world2-prototype.mjs').then(m=>m.createWorld2PrototypeRooms());
   const entry=R.resolve('door:shop');p.x=entry.x;p.y=entry.y;
   assert.equal((await first.call('/action',{token,body:{type:'enterBuilding',building:'shop'}})).status,200);
   // The server owns the interior terminal coordinates; this is a test-only position fixture.
   p.room.x=720;p.room.y=500;
   const interior=await import('../server/city-world2-prototype.mjs').then(m=>m.createWorld2PrototypeRooms());
   p.room.x=interior.I.ROOM.activity.x;p.room.y=interior.I.ROOM.activity.y;
   assert.equal((await first.call('/action',{token,body:{type:'buyGear',item:'jacket',credits:999999}})).status,200);
   const gear=p.inventory[0].uid;
   assert.equal((await first.call('/action',{token,body:{type:'equipGear',uid:gear}})).status,200);
   p.room.x=interior.I.ROOM.exit.x;p.room.y=interior.I.ROOM.exit.y;
   assert.equal((await first.call('/action',{token,body:{type:'exitBuilding'}})).status,200);
   const firstStop=R.resolve('checkpoint:0');p.x=firstStop.x;p.y=firstStop.y;
   assert.equal((await first.call('/action',{token,body:{type:'claimJourney',xp:999999}})).status,200);
   p.x=4536+3*64+32+90;p.y=4600+3*64+32;
   assert.equal((await first.call('/action',{token,body:{type:'buildPlot',col:3,row:3,kind:'banner'}})).status,200);
   assert.equal((await first.call('/action',{token,body:{type:'hireDefender',role:'sentry'}})).status,200);
   const saved=await first.call('/profile/save',{token,body:{}});
   assert.equal(saved.status,200);assert.ok(saved.data.revision>1);
   const state=(await first.call('/state',{token})).data.self;
   assert.equal(state.plot.length,1);assert.equal(state.journey.index,1);assert.equal(state.defense.crew.length,1);
   assert.equal(state.inventory[0].item,'jacket');
   await first.call('/leave',{token,body:{}});
  }finally{await first.host.close();}
  const second=await open(dir);
  try{
   const join=await second.call('/join',{body:{name:'Impostor display name',avatar:'offensive',recoveryKey:key}});
   assert.equal(join.status,201,JSON.stringify(join.data));
   const {self}=join.data.state;
   assert.equal(self.name,'Saved player');
   assert.equal(self.inventory.length,1);assert.equal(self.inventory[0].item,'jacket');
   assert.equal(self.equipped.outfit,self.inventory[0].uid);
   assert.equal(self.plot.length,1);assert.equal(self.plot[0].kind,'banner');
   assert.equal(self.journey.index,1);assert.equal(self.defense.crew.length,1);
   assert.equal(self.xp,45);
   const other=await second.call('/join',{body:{name:'Other device',avatar:'offensive',recoveryKey:key}});
   assert.equal(other.status,409,'same profile cannot be opened by two live sessions');
   assert.equal((await second.call('/action',{token:join.data.session,body:{type:'claimJourney'}})).status,400,
    'previous mission step cannot be claimed again at spawn');
   await second.call('/leave',{token:join.data.session,body:{}});
  }finally{await second.host.close();}
 });
});
test('wrong recovery credentials cannot read or overwrite a local QA profile',async()=>{
 await fixture(async dir=>{
  const {host,call}=await open(dir);
  try{
   const {data:join}=await call('/join',{body:{name:'Owner',avatar:'offensive'}});
   const {data:profile}=await call('/profile/create',{token:join.session,body:{}});
   const denied=await call('/join',{body:{name:'Attacker',avatar:'offensive',recoveryKey:profile.recoveryKey.slice(0,-1)+'A'}});
   assert.notEqual(denied.status,201);
   const guest=await call('/join',{body:{name:'Guest',avatar:'offensive'}});
   assert.equal((await call('/profile/save',{token:guest.data.session,body:{}})).status,404);
   assert.equal((await call('/state',{token:join.session})).data.self.credits,180);
  }finally{await host.close();}
 });
});
