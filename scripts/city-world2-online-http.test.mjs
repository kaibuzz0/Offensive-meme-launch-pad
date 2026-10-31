import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createLocalWorld2Server} from '../server/city-world2-local.mjs';
const transportSource=fs.readFileSync(new URL('../city-world2-online-transport.js',import.meta.url),'utf8');
function transport(port){
 const scope={};vm.runInNewContext(transportSource,scope,{filename:'city-world2-online-transport.js'});
 const request=(url,options)=>fetch(url.replace('127.0.0.1:8788','127.0.0.1:'+port),{
  ...options,headers:{...options.headers,Origin:'http://127.0.0.1:8787'}});
 return scope.CityWorld2OnlineTransport.create({request});
}
test('two real HTTP clients synchronize world2 server-owned state without sharing secrets',async()=>{
 const host=createLocalWorld2Server();
 try{
  const addr=await host.listen(0),a=transport(addr.port),b=transport(addr.port);
  const alice=await a.join({name:'Alice',avatar:'offensive'});
  const bob=await b.join({name:'Bob',avatar:'offensive'});
  assert.equal(alice.roomInfo.code,'public-1');
  assert.equal(bob.players.length,2);
  assert.ok(bob.players.some(x=>x.name==='Alice'));
  assert.equal(bob.players.find(x=>x.name==='Alice').inventory,undefined,'peer inventory remains private');
  assert.equal(bob.self.credits,180);
  const before=bob.players.find(x=>x.name==='Alice').x;
  await a.input({x:1,y:0,fire:false,aimX:1,aimY:0});
  host.rooms.first.engine.tick(.1);host.rooms.first.revision++;
  const moved=await b.state();const next=moved.players.find(x=>x.name==='Alice');
  assert.ok(next.x>before,'server-driven movement is visible to second client');
  await assert.rejects(a.action('buyGear',{item:'jacket',credits:999999}),/counter/);
  await assert.rejects(a.action('enterBuilding',{building:'shop',x:5000,y:4290}),/doorway/);
  assert.equal((await a.state()).self.credits,180,'client cannot fabricate a balance');
  assert.equal((await b.state()).self.credits,180,'other guest credits unaffected');
  await a.leave();
  assert.equal(a.isJoined(),false);
  assert.equal((await b.state()).players.length,1);
  await b.leave();
 }finally{await host.close();}
});
test('private world2 QA rooms isolate separate browser transports',async()=>{
 const host=createLocalWorld2Server();
 try{
  const addr=await host.listen(0),a=transport(addr.port),b=transport(addr.port),third=transport(addr.port);
  const privateRoom=await a.join({name:'Private host',createRoom:true});
  const code=privateRoom.roomInfo.code;
  assert.match(code,/^[A-F0-9]{18}$/);
  const p=await b.join({name:'Guest with code',code});
  assert.equal(p.roomInfo.code,code);assert.equal(p.players.length,2);
  const publicRoom=await third.join({name:'Public visitor'});
  assert.equal(publicRoom.roomInfo.code,'public-1');
  assert.equal(publicRoom.players.length,1,'public guest does not appear in private room');
  assert.equal((await a.state()).players.length,2,'private participants share only their room');
  await Promise.all([a.leave(),b.leave(),third.leave()]);
 }finally{await host.close();}
});

test('real HTTP fortress commands charge once, verify range and never expose another guest private plot',async()=>{
 const host=createLocalWorld2Server();
 try{
  const addr=await host.listen(0),a=transport(addr.port),b=transport(addr.port);
  await a.join({name:'Builder',avatar:'offensive'});
  await b.join({name:'Observer',avatar:'offensive'});
  await assert.rejects(a.action('buildPlot',{col:4,row:3,kind:'wall',credits:999999}),/245/);
  const player=[...host.rooms.first.engine.players.values()].find(p=>p.name==='Builder');
  player.x=4536+4*64+32+90;player.y=4600+3*64+32;host.rooms.first.revision++;
  await a.action('buildPlot',{col:4,row:3,kind:'banner',credits:999999});
  const built=await a.state();
  assert.equal(built.self.credits,174);
  assert.equal(built.self.plot.length,1);
  assert.deepEqual(built.self.plot[0],{col:4,row:3,kind:'banner',rotation:0});
  const peer=await b.state();
  assert.equal(peer.self.plot.length,0);
  assert.equal(peer.players.find(p=>p.name==='Builder').plot,undefined);
  await assert.rejects(a.action('buildPlot',{col:4,row:3,kind:'banner'}),/occupied/);
  await a.action('removePlot',{col:4,row:3,credits:999999});
  assert.equal((await a.state()).self.credits,177);
  await assert.rejects(a.action('removePlot',{col:4,row:3}),/No structure/);
  assert.equal((await b.state()).self.credits,180);
  await Promise.all([a.leave(),b.leave()]);
 }finally{await host.close();}
});


test('real HTTP fortress squad commands isolate hired defenders and server raid rewards',async()=>{
 const host=createLocalWorld2Server();
 try{
  const addr=await host.listen(0),alice=transport(addr.port),bob=transport(addr.port);
  await alice.join({name:'Fortress owner',avatar:'offensive'});
  await bob.join({name:'Other guest',avatar:'offensive'});
  await assert.rejects(alice.action('hireDefender',{role:'sentry',credits:999999}),/private fortress lot/);
  const p=[...host.rooms.first.engine.players.values()].find(x=>x.name==='Fortress owner');
  p.x=4536+8*64;p.y=4600+5*64;host.rooms.first.revision++;
  await alice.action('hireDefender',{role:'sentry',credits:999999});
  assert.equal((await alice.state()).self.credits,160);
  assert.equal((await alice.state()).self.defense.crew.length,1);
  assert.equal((await bob.state()).self.defense.crew.length,0);
  assert.equal((await bob.state()).players.find(x=>x.name==='Fortress owner').defense,undefined);
  const start=await alice.action('startRaid',{credits:999999,x:0,y:0});
  assert.match(start.message,/raid wave 1/);
  const snap=await alice.state();assert.equal(snap.self.defense.raid.status,'active');
  assert.ok(snap.self.defense.raiders.length>=2);
  assert.equal((await bob.state()).self.defense.raid.status,'idle');
  await assert.rejects(bob.action('damageRaider',{target:snap.self.defense.raiders[0].id,damage:999999}),/unavailable/);
  assert.equal((await alice.state()).self.credits,160);
  await Promise.all([alice.leave(),bob.leave()]);
 }finally{await host.close();}
});
