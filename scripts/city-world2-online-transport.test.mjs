import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const script=fs.readFileSync(new URL('../city-world2-online-transport.js',import.meta.url),'utf8');
function API(request,base){const ctx={};vm.runInNewContext(script,ctx);return ctx.CityWorld2OnlineTransport.create({request,...(base?{base}:{})});}
const token='f'.repeat(64);
const snapshot=(revision=1)=>({worldVersion:2,revision,self:{id:'alice',x:1,credits:180},players:[],guards:[],territory:[]});
const fake=(status,data)=>({ok:status>=200&&status<300,status,json:async()=>data});
test('local authoritative transport rejects every non-loopback API',()=>{
 assert.throws(()=>API(async()=>fake(200,{}),'https://bad.example/api/world2'),/approved/);
 assert.throws(()=>API(async()=>fake(200,{}),'http://192.168.1.2:8788/api/world2'),/approved/);
 assert.throws(()=>API(async()=>fake(200,{}),'http://127.0.0.1:8788/api/world2/evil'),/approved/);
});
test('temporary bearer token stays in header, not URL or storage, and leaves cleanly',async()=>{
 const calls=[];const t=API(async(url,options)=>{calls.push({url,...options});if(url.endsWith('/join'))return fake(201,{session:token,state:snapshot()});
  if(url.endsWith('/state'))return fake(200,snapshot(2));
  if(url.endsWith('/action'))return fake(200,{message:'Approved',state:snapshot(3)});
  if(url.endsWith('/leave'))return fake(200,{ok:true});return fake(200,{ok:true});});
 assert.equal(t.isJoined(),false);await assert.rejects(t.state(),/Join/);
 assert.equal((await t.join({name:'Alice',avatar:'offensive'})).worldVersion,2);
 assert.equal(t.isJoined(),true);
 await t.input({x:1,y:0,fire:true,aimX:0,aimY:-1});
 await t.input({x:0,y:1});
 await t.state();const res=await t.action('buyGear',{item:'jacket'});
 assert.equal(res.message,'Approved');assert.equal(t.lastSnapshot().revision,3);
 await t.leave();assert.equal(t.isJoined(),false);assert.equal(t.lastSnapshot(),null);
 assert.equal(calls.length,6);
 assert.ok(calls.every(c=>!c.url.includes(token)),'token must never enter a URL');
 assert.ok(calls.every(c=>c.cache==='no-store'));
 const moves=calls.filter(c=>c.url.endsWith('/input')).map(c=>JSON.parse(c.body));
 assert.deepEqual(moves.map(m=>m.seq),[1,2]);
 assert.equal(moves[0].fire,true);
 assert.ok(calls.filter(c=>!c.url.endsWith('/join')).every(c=>c.headers.Authorization==='Bearer '+token));
 assert.equal(calls.find(c=>c.url.endsWith('/join')).headers.Authorization,undefined);
});
test('stale and malformed authoritative snapshots fail closed',async()=>{
 let revision=2;
 const t=API(async(url)=>{
  if(url.endsWith('/join'))return fake(201,{session:token,state:snapshot(2)});
  return fake(200,snapshot(revision));});
 await t.join();
 revision=1;assert.equal((await t.state()).revision,2,'stale poll cannot rewind a newer state');
 revision=3;assert.equal((await t.state()).revision,3);
});
test('an HTTP 401 revokes the in-memory guest credential and prevents further commands',async()=>{
 const t=API(async(url)=>url.endsWith('/join')?fake(201,{session:token,state:snapshot()}):fake(401,{error:'Guest expired'}));
 await t.join();
 await assert.rejects(t.state(),/Guest expired/);
 assert.equal(t.isJoined(),false);
 await assert.rejects(t.action('buyGear',{item:'jacket'}),/Join/);
});
test('rejects forged action structures and invalid inputs before network submission',async()=>{
 const t=API(async(url)=>url.endsWith('/join')?fake(201,{session:token,state:snapshot()}):fake(200,{ok:true}));
 await t.join();
 await assert.rejects(t.input({x:Infinity,y:0}),/Invalid/);
 await assert.rejects(t.input({x:10,y:0}),/Invalid/);
 await assert.rejects(t.action('',{}),/Invalid/);
 await assert.rejects(t.action('buyGear',[]),/Invalid/);
});
test('concurrent joining is refused; a delayed reply after disconnect cannot rejoin',async()=>{
 let resolve;
 const t=API(async()=>new Promise(r=>{resolve=r;}));
 const first=t.join();await assert.rejects(t.join(),/already active/);
 t.disconnect();resolve(fake(201,{session:token,state:snapshot()}));
 await assert.rejects(first,/session changed/);assert.equal(t.isJoined(),false);
});
