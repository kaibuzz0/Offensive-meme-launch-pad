import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../city-road-building.js',import.meta.url),'utf8');
function api(){
 const sandbox={};vm.runInNewContext(source,sandbox);
 return sandbox.CityRoadBuilding;
}
function storage(){
 const m=new Map();
 return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};
}
const site={x:10,z:20},player={x:10,z:20};
test('cannot place before collecting supplies or outside the cache radius',()=>{
 const b=api().create('seed',storage());
 assert.equal(b.place(false,player,site),false);
 assert.equal(b.place(true,{x:100,z:100},site),false);
 assert.equal(b.placed,null);
});
test('placing a workbench saves once and reloads by seed',()=>{
 const store=storage(),a=api();
 const b=a.create('seed-a',store);
 assert.equal(b.place(true,player,site),true);
 assert.equal(b.placed.kind,'workbench');
 assert.equal(b.placed.x,15);assert.equal(b.placed.z,24);
 assert.equal(b.place(true,player,site),false);
 assert.equal(a.create('seed-a',store).placed.kind,'workbench');
 assert.equal(a.create('seed-b',store).placed,null);
});
test('corrupt and mismatched saves cannot unlock a workbench',()=>{
 const store=storage(),a=api();
 store.setItem(a.KEY+'seed',JSON.stringify({version:1,seed:'other',kind:'workbench',x:15,z:24}));
 assert.equal(a.create('seed',store).placed,null);
 store.setItem(a.KEY+'seed','{invalid');
 assert.equal(a.create('seed',store).placed,null);
});
test('storage failure does not claim a placed workbench',()=>{
 const b=api().create('seed',{getItem:()=>null,setItem:()=>{throw Error('quota');}});
 assert.equal(b.place(true,player,site),false);
 assert.equal(b.placed,null);
});
