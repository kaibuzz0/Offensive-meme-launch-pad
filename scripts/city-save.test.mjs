import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={};vm.runInNewContext(fs.readFileSync(new URL('../city-save.js',import.meta.url),'utf8'),context);
const Save=context.CitySave,key='solo-save',backup='solo-save-legacy-backup';
const store=entries=>{const data=new Map(Object.entries(entries||{}));return {data,getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v)};};
test('new game has no recovery copy and can save normally',()=>{
 const storage=store();const result=Save.prepare(storage,key,backup);
 assert.equal(result.data,null);assert.equal(result.blocked,false);assert.equal(storage.data.size,0);
});
test('legacy v1-v4 saves retain an exact recovery snapshot before they can be upgraded',()=>{
 for(let version=1;version<=4;version++){
  const raw=JSON.stringify({version,x:777,y:888,xp:1234,credits:289,inventory:[{uid:'gear-1',item:'jacket'}],plot:[{col:3,row:2,kind:'wall'}]});
  const storage=store({[key]:raw}),first=Save.prepare(storage,key,backup);
  assert.equal(first.blocked,false);assert.equal(first.data.xp,1234);assert.equal(storage.getItem(backup),raw);
  storage.setItem(key,JSON.stringify({version:5,saveVersion:5,worldVersion:1,xp:1234}));
  assert.equal(Save.prepare(storage,key,backup).blocked,false);
  assert.equal(storage.getItem(backup),raw,'never overwrite legacy recovery data');
 }
});
test('modern saves require both explicit schema and compatible world version',()=>{
 const good=JSON.stringify({version:5,saveVersion:5,worldVersion:1});assert.equal(Save.prepare(store({[key]:good}),key,backup).blocked,false);
 for(const bad of [{version:6,saveVersion:6,worldVersion:1},{version:5,saveVersion:5,worldVersion:2},{version:5,worldVersion:1},{version:0},{version:4,worldVersion:2}]){
  const raw=JSON.stringify(bad),storage=store({[key]:raw});const result=Save.prepare(storage,key,backup);
  assert.equal(result.blocked,true,raw);assert.equal(storage.getItem(key),raw);
 }
});
test('malformed saves are not silently overwritten',()=>{
 for(const raw of ['{bad', '[]','null','{}']){
  const storage=store({[key]:raw}),result=Save.prepare(storage,key,backup);
  assert.equal(result.blocked,true);assert.equal(storage.getItem(key),raw);
 }
});
test('storage failure and backup failure disable saving rather than risking legacy progress',()=>{
 const raw=JSON.stringify({version:4,credits:999}),storage=store({[key]:raw});storage.setItem=()=>{throw Error('QuotaExceeded');};
 const result=Save.prepare(storage,key,backup);assert.equal(result.blocked,true);assert.equal(result.data.credits,999);
 const unavailable={getItem(){throw Error('SecurityError');}};assert.equal(Save.prepare(unavailable,key,backup).blocked,true);
});
