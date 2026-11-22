import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const sandbox = {};
vm.runInNewContext(readFileSync(new URL('../city-migration.js', import.meta.url), 'utf8'), sandbox);
const migration = sandbox.CityMigration;
const keys = {active:'active',backup:'backup',preview:'preview'};
const sourceRaw = JSON.stringify({version:5,saveVersion:5,worldVersion:1,x:1,y:2});
function fixture(save, notices=[]) {
  const values = new Map([
    ['active',sourceRaw], ['backup',sourceRaw],
    ['preview',JSON.stringify({kind:'world2-preview-only',sourceRaw,
      save:{version:6,saveVersion:6,worldVersion:2,x:12,y:13,area:'hub',...save},notices})]
  ]);
  return {getItem:key=>values.get(key)??null};
}
test('valid staged coordinates remain reviewable',()=>{
  assert.equal(migration.inspectStage(fixture({}),keys).status,'ready-for-review');
});
test('rejects nonfinite or malformed staged coordinates',()=>{
  for (const bad of [{x:null},{x:'12'},{y:null},{y:'13'},{area:''},{area:5},{area:'x'.repeat(129)}]) {
    assert.equal(migration.inspectStage(fixture(bad),keys).status,'invalid');
  }
});
test('rejects malformed and unbounded staged notices',()=>{
  for (const notices of [null,{},[7],['x'.repeat(2049)],Array(257).fill('x')]) {
    assert.equal(migration.inspectStage(fixture({},notices),keys).status,'invalid');
  }
});
test('rejects source drift and preserves active and backup',()=>{
  const storage=fixture({});
  const original=storage.getItem('active');
  const changed={getItem:key=>key==='active'?'changed':storage.getItem(key)};
  assert.equal(migration.inspectStage(changed,keys).status,'conflict');
  assert.equal(storage.getItem('active'),original);
  assert.equal(storage.getItem('backup'),original);
});

test('inspection rejects aliased or empty storage keys without reading storage',()=>{
  const storage={getItem:()=>{throw new Error('should not read');}};
  for(const keys of [
    {active:'active',backup:'active',preview:'preview'},
    {active:'active',backup:'backup',preview:'backup'},
    {active:'',backup:'backup',preview:'preview'}
  ]) assert.equal(migration.inspectStage(storage,keys).status,'invalid');
});

test('rejects matching but malformed or unsupported protected source',()=>{
  for(const raw of ['{broken', 'null', JSON.stringify({version:7,worldVersion:1}),
    JSON.stringify({version:5,saveVersion:5,worldVersion:2})]){
    const values=new Map([['active',raw],['backup',raw],['preview',JSON.stringify({
      kind:'world2-preview-only',sourceRaw:raw,
      save:{version:6,saveVersion:6,worldVersion:2,x:12,y:13,area:'hub'},notices:[]
    })]]);
    assert.equal(migration.inspectStage({getItem:k=>values.get(k)??null},keys).status,'invalid');
  }
});

test('inspection rejects protected saves with unmappable active sessions',()=>{
  for (const activity of [{contract:{id:'job'}},{blockJob:{id:'block'}},{defense:true},{room:'arena'},{rising:{arena:true}}]) {
    const raw=JSON.stringify({version:5,saveVersion:5,worldVersion:1,x:1,y:2,...activity});
    const values=new Map([['active',raw],['backup',raw],['preview',JSON.stringify({
      kind:'world2-preview-only',sourceRaw:raw,
      save:{version:6,saveVersion:6,worldVersion:2,x:12,y:13,area:'hub'},notices:[]
    })]]);
    assert.equal(migration.inspectStage({getItem:k=>values.get(k)??null},keys).status,'invalid');
    assert.equal(values.get('active'),raw);
    assert.equal(values.get('backup'),raw);
  }
});

test('rejects tampered staged inventory, progression, and world edits without changing backups',()=>{
  const original={version:5,saveVersion:5,worldVersion:1,x:1,y:2,
    inventory:{wood:4},xp:12,worldEdits:[{x:3,y:4,id:'stone'}]};
  const raw=JSON.stringify(original);
  const valid={...original,version:6,saveVersion:6,worldVersion:2,x:12,y:13,area:'hub'};
  const check=(save)=>{
    const values=new Map([['active',raw],['backup',raw],['preview',JSON.stringify({
      kind:'world2-preview-only',sourceRaw:raw,save,notices:[]
    })]]);
    const status=migration.inspectStage({getItem:k=>values.get(k)??null},keys).status;
    assert.equal(values.get('active'),raw);
    assert.equal(values.get('backup'),raw);
    return status;
  };
  assert.equal(check(valid),'ready-for-review');
  assert.equal(check({...valid,inventory:{wood:400}}),'invalid');
  assert.equal(check({...valid,xp:1200}),'invalid');
  assert.equal(check({...valid,worldEdits:[{x:3,y:4,id:'gold'}]}),'invalid');
  assert.equal(check({...valid,unearnedReward:99}),'invalid');
});


test('rejects injected defender posts and extra post metadata while preserving recovery',()=>{
  const original={version:5,saveVersion:5,worldVersion:1,x:1,y:2,
    crew:[{id:'guard-a',post:{x:4,y:5}},{id:'guard-b'}]};
  const raw=JSON.stringify(original);
  const base={...original,version:6,saveVersion:6,worldVersion:2,x:12,y:13,area:'hub',
    crew:[{id:'guard-a',post:{x:14,y:15}},{id:'guard-b'}]};
  const inspect=(save)=>{
    const values=new Map([['active',raw],['backup',raw],['preview',JSON.stringify({
      kind:'world2-preview-only',sourceRaw:raw,save,notices:[]
    })]]);
    const result=migration.inspectStage({getItem:k=>values.get(k)??null},keys);
    assert.equal(values.get('active'),raw);
    assert.equal(values.get('backup'),raw);
    return result.status;
  };
  assert.equal(inspect(base),'ready-for-review');
  assert.equal(inspect({...base,crew:[base.crew[0],{id:'guard-b',post:{x:9,y:9}}]}),'invalid');
  assert.equal(inspect({...base,crew:[{id:'guard-a',post:{x:14,y:15,reward:999}},base.crew[1]]}),'invalid');
});
