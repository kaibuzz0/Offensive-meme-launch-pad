import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../city-save.js',import.meta.url),'utf8');
const context={};vm.runInNewContext(source,context);
const {prepare,SAVE_VERSION,WORLD_VERSION}=context.CitySave;
function storage(initial={}){
 const values=new Map(Object.entries(initial));
 return {values,getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,String(v))};
}
const active='city-save',backup='city-save-backup';
test('old save is backed up byte-for-byte before allowing writes',()=>{
 const raw=' { "version": 4, "credits": 12, "customUnknown": {"a": 1} } ';
 const s=storage({[active]:raw});
 const result=prepare(s,active,backup);
 assert.equal(result.blocked,false);
 assert.equal(s.getItem(active),raw);
 assert.equal(s.getItem(backup),raw);
 assert.equal(result.data.customUnknown.a,1);
});
test('repeated preparation does not replace an existing recovery copy',()=>{
 const old='{"version":3,"credits":9}',current='{"version":4,"credits":11}';
 const s=storage({[active]:current,[backup]:old});
 assert.equal(prepare(s,active,backup).blocked,false);
 assert.equal(s.getItem(backup),old);
});
test('malformed, future and wrong-world saves remain untouched and fail closed',()=>{
 for(const raw of ['{','[]','{"version":99}','{"version":5,"saveVersion":5,"worldVersion":2}','{"version":5,"saveVersion":4,"worldVersion":1}']){
  const s=storage({[active]:raw});
  const result=prepare(s,active,backup);
  assert.equal(result.blocked,true,raw);
  assert.equal(s.getItem(active),raw);
  assert.equal(s.getItem(backup),null);
 }
});
test('storage read and backup write failures disable saving without overwriting active data',()=>{
 const raw='{"version":2,"inventory":["wood"]}';
 const readFail={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
 assert.equal(prepare(readFail,active,backup).blocked,true);
 const s=storage({[active]:raw});
 s.setItem=()=>{throw Error('quota exceeded')};
 assert.equal(prepare(s,active,backup).blocked,true);
 assert.equal(s.getItem(active),raw);
});
test('current-version save loads without creating a backup',()=>{
 const raw=JSON.stringify({version:SAVE_VERSION,saveVersion:SAVE_VERSION,worldVersion:WORLD_VERSION,x:12});
 const s=storage({[active]:raw});
 assert.equal(prepare(s,active,backup).blocked,false);
 assert.equal(s.getItem(backup),null);
});
