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
