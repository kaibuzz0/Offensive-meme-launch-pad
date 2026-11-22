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
