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

test('crafting requires placed workbench and saves exactly once per seed',()=>{
 const store=storage(),a=api(),b=a.create('craft-seed',store);
 assert.equal(b.craftTorch(player,site),false);
 assert.equal(b.place(true,player,site),true);
 assert.equal(b.craftTorch({x:99,z:99},site),false);
 assert.equal(b.craftTorch(player,site),true);
 assert.equal(b.crafted,true);
 assert.equal(b.craftTorch(player,site),false);
 assert.equal(a.create('craft-seed',store).crafted,true);
 assert.equal(a.create('other-seed',store).crafted,false);
});
test('craft save failures and unplaced forged torch do not unlock crafting',()=>{
 const a=api(),store=storage();
 store.setItem(a.CRAFT_KEY+'seed','torch-1');
 assert.equal(a.create('seed',store).crafted,false);
 const failed={getItem:k=>store.getItem(k),setItem:(k,v)=>{
  if(k.startsWith(a.CRAFT_KEY))throw Error('quota');
  store.setItem(k,v);
 }};
 const b=a.create('seed',failed);
 assert.equal(b.place(true,player,site),true);
 assert.equal(b.craftTorch(player,site),false);
 assert.equal(b.crafted,false);
});

test('crafting uses saved bench location rather than nearby supply cache',()=>{
 const a=api(),store=storage(),b=a.create('bench-proximity',store);
 assert.equal(b.place(true,player,site),true);
 // Near supply cache but 14 blocks from the actual placed workbench.
 assert.equal(b.craftTorch({x:1,z:20},site),false);
 // Outside cache radius but within the bench interaction radius.
 assert.equal(b.craftTorch({x:24,z:24},site),true);
 assert.equal(a.create('bench-proximity',store).crafted,true);
});

test('two open tabs cannot duplicate a torch or overwrite a stale crafting record',()=>{
 const a=api(),store=storage();
 const first=a.create('same-seed',store);
 assert.equal(first.place(true,player,site),true);
 const second=a.create('same-seed',store);
 assert.equal(first.craftTorch(player,site),true);
 assert.equal(second.craftTorch(player,site),false);
 assert.equal(store.getItem(a.CRAFT_KEY+'same-seed'),'torch-1');
 assert.equal(a.create('same-seed',store).crafted,true);
 const third=a.create('other-seed',store);
 assert.equal(third.place(true,player,site),true);
 store.setItem(a.CRAFT_KEY+'other-seed','unsupported-future-version');
 assert.equal(third.craftTorch(player,site),false);
 assert.equal(store.getItem(a.CRAFT_KEY+'other-seed'),'unsupported-future-version');
});

test('stale tabs cannot overwrite a workbench and future saves are preserved',()=>{
 const a=api(),store=storage();
 const first=a.create('shared',store),stale=a.create('shared',store);
 assert.equal(first.place(true,player,site),true);
 const original=store.getItem(a.KEY+'shared');
 assert.equal(stale.place(true,player,{x:20,z:30}),false);
 assert.equal(store.getItem(a.KEY+'shared'),original);
 const future=a.create('future',store);
 store.setItem(a.KEY+'future',JSON.stringify({version:2,seed:'future',kind:'workbench',x:2,z:3}));
 assert.equal(future.place(true,player,site),false);
 assert.equal(JSON.parse(store.getItem(a.KEY+'future')).version,2);
});

test('crafting rejects removed or replaced workbench records after controller load',()=>{
 const a=api(),store=storage(),b=a.create('replaced',store);
 assert.equal(b.place(true,player,site),true);
 store.setItem(a.KEY+'replaced',JSON.stringify({version:2,seed:'replaced',kind:'workbench',x:15,z:24}));
 assert.equal(b.craftTorch(player,site),false);
 assert.equal(store.getItem(a.CRAFT_KEY+'replaced'),null);
 store.setItem(a.KEY+'replaced',JSON.stringify({version:1,seed:'replaced',kind:'workbench',x:16,z:24}));
 assert.equal(b.craftTorch(player,site),false);
 assert.equal(store.getItem(a.CRAFT_KEY+'replaced'),null);
});

test('open tabs observe completed builds and crafting without reload',()=>{
 const a=api(),store=storage(),first=a.create('live-tabs',store),second=a.create('live-tabs',store);
 assert.equal(second.placed,null);
 assert.equal(first.place(true,player,site),true);
 assert.equal(second.placed.kind,'workbench');
 assert.equal(second.canPlace(true,player,site),false);
 assert.equal(first.craftTorch(player,site),true);
 assert.equal(second.crafted,true);
 assert.equal(second.craftTorch(player,site),false);
});
test('removed or future-version records are not displayed by stale tabs',()=>{
 const a=api(),store=storage(),first=a.create('live-invalid',store);
 assert.equal(first.place(true,player,site),true);
 assert.equal(first.craftTorch(player,site),true);
 store.setItem(a.KEY+'live-invalid',JSON.stringify({version:2,seed:'live-invalid',kind:'workbench',x:15,z:24}));
 assert.equal(first.placed,null);
 assert.equal(first.crafted,false);
 assert.equal(first.craftTorch(player,site),false);
});

test('malformed or out-of-range road sites never persist invalid workbench coordinates',()=>{
 const a=api(),store=storage(),b=a.create('bad-road-site',store);
 for(const invalid of [null,{}, {x:NaN,z:20},{x:Infinity,z:20},
  {x:10.5,z:20},{x:999999,z:20},{x:10,z:-999999}]){
  assert.equal(b.place(true,player,invalid),false);
  assert.equal(store.getItem(a.KEY+'bad-road-site'),null);
 }
 assert.equal(b.place(true,player,site),true);
 assert.equal(a.create('bad-road-site',store).placed.kind,'workbench');
});
