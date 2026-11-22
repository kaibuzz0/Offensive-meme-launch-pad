import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const sandbox={};
vm.runInNewContext(readFileSync(new URL('../city-migration.js',import.meta.url),'utf8'),sandbox);
const {inspectStage}=sandbox.CityMigration;
const keys={active:'active',backup:'backup',preview:'preview'};
function inspect(original,save){
 const sourceRaw=JSON.stringify(original);
 const values=new Map([
  ['active',sourceRaw],['backup',sourceRaw],
  ['preview',JSON.stringify({kind:'world2-preview-only',sourceRaw,save,notices:[]})]
 ]);
 const result=inspectStage({getItem:k=>values.get(k)??null},keys);
 assert.equal(values.get('active'),sourceRaw);
 assert.equal(values.get('backup'),sourceRaw);
 return result.status;
}
const original={version:5,saveVersion:5,worldVersion:1,x:1,y:2,
 waypoint:{x:3,y:4,area:'hub',label:'safe'},checkpoint:{x:6,y:7,area:'hub'}};
const valid={...original,version:6,saveVersion:6,worldVersion:2,x:12,y:13,area:'hub',
 waypoint:{x:30,y:40,area:'fortress',label:'safe'},checkpoint:null};
test('allows projected navigation targets and explicit unmappable clears',()=>{
 assert.equal(inspect(original,valid),'ready-for-review');
});
test('rejects injected targets, altered metadata and malformed coordinates',()=>{
 assert.equal(inspect(original,{...valid,respawn:{x:1,y:2}}),'invalid');
 assert.equal(inspect(original,{...valid,waypoint:{...valid.waypoint,label:'reward'}}),'invalid');
 assert.equal(inspect(original,{...valid,waypoint:{...valid.waypoint,x:'30'}}),'invalid');
 assert.equal(inspect(original,{...valid,waypoint:{...valid.waypoint,reward:999}}),'invalid');
});
