import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// This package is ESM, but wildlife is a classic browser script exposing a
// global API. Evaluate its unmodified source in an ESM data module and export
// that browser API for tests. This keeps objects in Node's native realm, so
// assert.deepStrictEqual compares them without cross-VM prototype mismatch.
const source=readFileSync(new URL('../city-sandbox-wildlife.js',import.meta.url),'utf8');
const {default: wildlife}=await import('data:text/javascript;base64,'+
 Buffer.from(source+'\nexport default globalThis.CitySandboxWildlife;').toString('base64'));
const {spawnChunk,spawnChunkOnTerrain,habitatFor,cappedFlockStep,createChunkWildlifeManager,MAX_PER_CHUNK}=wildlife;

test('seed and chunk coordinates yield stable wildlife independent of call order',()=>{
 const a=spawnChunk(741,12,-4,'forest');
 spawnChunk(741,-1,3,'desert');
 assert.deepEqual(spawnChunk(741,12,-4,'forest'),a);
 assert.notDeepEqual(spawnChunk(741,13,-4,'forest'),a);
 assert.ok(a.length<=MAX_PER_CHUNK);
 assert.ok(a.every(e=>e.x>=192&&e.x<208&&e.z>=-64&&e.z<-48));
});
test('direct seeded wildlife snapshots cannot be mutated by consumers',()=>{
 const animals=spawnChunk(741,12,-4,'forest');
 assert.ok(Object.isFrozen(animals));
 assert.ok(animals.every(Object.isFrozen));
 assert.throws(()=>animals.push({id:'injected'}),TypeError);
 if(animals.length)assert.throws(()=>{animals[0]={id:'changed'};},TypeError);
 assert.deepEqual(spawnChunk(741,12,-4,'forest'),animals);
 assert.ok(Object.isFrozen(spawnChunk(4,0,0,'forest',{maxPerChunk:0})));
});

test('different habitats choose compatible species and are capped',()=>{
 for(const habitat of ['forest','plains','desert','tundra','mountain','wetland','ocean','river','cave']){
  const creatures=spawnChunk(100,4,5,habitat);
  assert.ok(creatures.length<=6);
  assert.ok(creatures.every(c=>c.habitat===habitat));
 }
 assert.equal(habitatFor({name:'Glacial tundra'}),'tundra');
 assert.equal(habitatFor({group:'MANGROVE'}),'wetland');
 assert.deepEqual(spawnChunk(4,0,0,'forest',{maxPerChunk:0}),[]);
 assert.throws(()=>spawnChunk(4,0,0,'forest',{maxPerChunk:7}),RangeError);
});
test('stable spawn IDs distinguish negative chunk coordinates and slots',()=>{
 const ids=new Set();
 for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++)
  for(const c of spawnChunk(44,x,z,'forest')){assert.ok(!ids.has(c.id));ids.add(c.id);}
});
test('flock step is deterministic, bounded and does not mutate input',()=>{
 const flock=[{x:0,z:0,vx:2,vz:0},{x:1,z:1,vx:0,vz:1},{x:3,z:0,vx:-1,vz:0}];
 const original=structuredClone(flock);
 const a=cappedFlockStep(flock,0.1),b=cappedFlockStep(flock,0.1);
 assert.deepEqual(a,b);
 assert.deepEqual(flock,original);
 assert.ok(a.every(c=>Math.hypot(c.vx,c.vz)<=3+1e-9));
 assert.throws(()=>cappedFlockStep(flock,0.5),RangeError);
 assert.throws(()=>cappedFlockStep(Array(65).fill(flock[0]),0.01),RangeError);
});

test('terrain adapter samples voxel height and preserves seed-stable placements',()=>{
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:(x,z)=>({
  height:50+x%3,group:'evergreen',biomeName:'Ancient Forest',water:false,river:false,
  slope:2,mouth:false,sinkhole:false
 })};
 const first=spawnChunkOnTerrain(world,2,-3);
 assert.deepEqual(spawnChunkOnTerrain(world,2,-3),first);
 assert.ok(Object.isFrozen(first));
 assert.ok(first.every(c=>c.habitat==='forest'&&(
  c.species==='songbird'?c.y>=54+Math.floor(c.x)%3:c.y===51+Math.floor(c.x)%3)));
 assert.deepEqual(first.map(({id,x,z,heading})=>({id,x,z,heading})),
  spawnChunk(world.seed,2,-3,{group:'evergreen',name:'Ancient Forest'}).map(({id,x,z,heading})=>({id,x,z,heading})));
});
test('terrain adapter rejects incompatible chunk dimensions and unsafe ground',()=>{
 const world={seed:22,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>({
  height:60,group:'grassland',biomeName:'Prairie',water:true,river:false,slope:0
 })};
 assert.ok(spawnChunkOnTerrain(world,0,0).every(a=>a.species==='songbird'&&a.y>=116));
 assert.throws(()=>spawnChunkOnTerrain({...world,CHUNK_SIZE:32},0,0),RangeError);
 assert.throws(()=>spawnChunkOnTerrain({...world,seed:'bad'},0,0),TypeError);
 const steep={...world,surfaceAt:()=>({height:60,group:'grassland',water:false,river:false,slope:25})};
 assert.ok(spawnChunkOnTerrain(steep,0,0).every(a=>a.species==='songbird'&&a.y>=64));
});
test('terrain adapter places aquatic wildlife below water surface only',()=>{
 const wet={seed:7,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>({
  height:103,water:true,river:false,waterLevel:112,group:'ocean',biomeName:'Deep Ocean',slope:0
 })};
 const fish=spawnChunkOnTerrain(wet,0,0);
 assert.ok(fish.every(c=>c.species==='fish'?c.y===104:c.species==='seabird'&&c.y>=116));
 assert.ok(spawnChunkOnTerrain({...wet,surfaceAt:()=>({...wet.surfaceAt(),water:false})},0,0).every(c=>c.species==='seabird'));
});


test('ocean seabirds fly above water while fish stay submerged',()=>{
 const world={seed:7,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>({
  height:103,water:true,river:false,waterLevel:112,group:'ocean',biomeName:'Deep Ocean',slope:25
 })};
 let birds=0,fish=0;
 for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++){
  const placed=spawnChunkOnTerrain(world,x,z);
  assert.deepEqual(spawnChunkOnTerrain(world,x,z),placed);
  for(const animal of placed){
   assert.ok(['fish','seabird'].includes(animal.species));
   if(animal.species==='seabird'){birds++;assert.ok(animal.y>=116&&animal.y<=120);}
   else {fish++;assert.ok(animal.y>103&&animal.y<112);}
  }
 }
 assert.ok(birds>0&&fish>0,'seeded ocean includes both airborne seabirds and fish');
});

test('ground fauna stay off flooded or steep ground while aerial fauna can pass',()=>{
 const base={seed:100,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>({
  height:80,water:false,river:false,group:'forest',biomeName:'Forest',slope:30
 })};
 let birds=0;
 for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++){
  const placed=spawnChunkOnTerrain(base,x,z);
  for(const a of placed){assert.equal(a.species,'songbird');assert.ok(a.y>=84);birds++;}
 }
 assert.ok(birds>0,'seeded forest supports birds on steep slopes');
 const flooded={...base,surfaceAt:()=>({...base.surfaceAt(),water:true,waterLevel:112})};
 for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++)
  assert.ok(spawnChunkOnTerrain(flooded,x,z).every(a=>a.species==='songbird'&&a.y>=116));
});

test('fish require actual water depth rather than merely a water flag',()=>{
 const dryBed={seed:7,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>({
  height:112,water:true,waterLevel:112,river:false,group:'ocean',biomeName:'Ocean',slope:0
 })};
 for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++)
  assert.ok(spawnChunkOnTerrain(dryBed,x,z).every(a=>a.species==='seabird'));
});

test('chunk lifecycle has deterministic bounded entries, eviction and removal',()=>{
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>({
  height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0
 })};
 const manager=createChunkWildlifeManager(world,{maxChunks:2});
 const first=manager.enter(-1,0);
 assert.strictEqual(manager.enter(-1,0),first);
 manager.enter(0,0);
 assert.equal(manager.activeChunks(),2);
 const snap=manager.sync([[0,0],[1,0]]);
 assert.ok(Object.isFrozen(snap));
 assert.equal(manager.activeChunks(),2);
 assert.ok(snap.length<=12);
 assert.deepEqual(manager.enter(-1,0),first);
 assert.equal(manager.activeChunks(),2);
 assert.ok(manager.leave(-1,0));
 assert.equal(manager.activeChunks(),1);
 manager.clear();
 assert.deepEqual(manager.snapshot(),[]);
 assert.throws(()=>manager.sync([[0,0],[0,0]]),/Duplicate/);
 assert.throws(()=>manager.sync([[0,0],[1,0],[2,0]]),RangeError);
 assert.throws(()=>manager.enter(0.5,0),TypeError);
});

test('failed terrain sampling does not partially evict visible wildlife',()=>{
 let fail=false;
 const world={seed:88,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:(x,z)=>{
  if(fail&&x>=32)throw Error('terrain unavailable');
  return {height:70,group:'forest',biomeName:'Forest',water:false,river:false,slope:0};
 }};
 const manager=createChunkWildlifeManager(world,{maxChunks:2});
 manager.sync([[0,0],[1,0]]);
 const before=manager.snapshot();
 fail=true;
 assert.throws(()=>manager.sync([[1,0],[2,0]]),/terrain unavailable/);
 assert.deepEqual(manager.snapshot(),before);
 assert.equal(manager.activeChunks(),2);
 fail=false;
 const next=manager.sync([[1,0],[2,0]]);
 assert.equal(manager.activeChunks(),2);
 assert.ok(next.every(a=>!a.id.startsWith('88:0:0:')));
 assert.deepEqual(manager.sync([[1,0],[2,0]]),next);
});

test('recently visited wildlife chunk survives bounded eviction',()=>{
 let samples=0;
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>{
  samples++;
  return {height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0};
 }};
 const manager=createChunkWildlifeManager(world,{maxChunks:2});
 const a=manager.enter(0,0);
 manager.enter(1,0);
 const before=samples;
 assert.strictEqual(manager.enter(0,0),a);
 assert.equal(samples,before,'cache hit does not resample terrain');
 manager.enter(2,0); // Evict (1,0), not recently visited (0,0).
 assert.strictEqual(manager.enter(0,0),a);
 assert.equal(manager.activeChunks(),2);
 assert.equal(samples>before,true);
 const after=samples;
 manager.enter(1,0); // Evicted chunk must regenerate deterministically.
 assert.equal(manager.activeChunks(),2);
 assert.ok(samples>after);
 assert.deepEqual(manager.enter(0,0),a);
});

test('terrain wildlife rejects unsafe chunk arithmetic without sampling or changing active chunks',()=>{
 let samples=0;
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>{
  samples++;
  return {height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0};
 }};
 const manager=createChunkWildlifeManager(world,{maxChunks:2});
 const original=manager.enter(0,0);
 const before=samples;
 const tooLarge=Math.floor((Number.MAX_SAFE_INTEGER-15)/16)+1;
 for(const [x,z] of [[tooLarge,0],[-tooLarge,0],[0,tooLarge],[0,-tooLarge]]){
  assert.throws(()=>spawnChunkOnTerrain(world,x,z),RangeError);
  assert.throws(()=>manager.enter(x,z),RangeError);
  assert.throws(()=>manager.sync([[x,z]]),RangeError);
 }
 assert.throws(()=>spawnChunkOnTerrain(world,0.5,0),TypeError);
 assert.equal(samples,before);
 assert.equal(manager.activeChunks(),1);
 assert.deepEqual(manager.enter(0,0),original);
});

test('out-of-domain terrain wildlife is an immutable empty population',()=>{
 let calls=0;
 const world={seed:22,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>{calls++;return null;}};
 const first=spawnChunkOnTerrain(world,62500,0);
 assert.deepEqual(first,[]);
 assert.ok(Object.isFrozen(first),'empty populations obey the same immutable contract as generated populations');
 assert.equal(calls,1,'invalid terrain should not trigger candidate sampling');
 const manager=createChunkWildlifeManager(world,{maxChunks:2});
 assert.ok(Object.isFrozen(manager.enter(62500,0)));
 assert.equal(manager.activeChunks(),1);
 assert.ok(Object.isFrozen(manager.sync([[62500,0]])));
});

test('fish never intersect the bed in shallow water',()=>{
 const world={seed:7,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>({
  height:112,water:true,waterLevel:112.25,river:false,
  group:'ocean',biomeName:'Ocean',slope:0
 })};
 let birds=0;
 for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++){
  const animals=spawnChunkOnTerrain(world,x,z);
  assert.ok(animals.every(a=>a.species!=='fish'),'water shallower than 0.5 voxel cannot contain fish');
  birds+=animals.filter(a=>a.species==='seabird').length;
 }
 assert.ok(birds>0,'shallow water still supports airborne wildlife');
 const deep={...world,surfaceAt:()=>({...world.surfaceAt(),height:110})};
 let fish=0;
 for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++){
  const animals=spawnChunkOnTerrain(deep,x,z);
  for(const a of animals)if(a.species==='fish'){
   fish++;
   assert.ok(a.y>110&&a.y<112,'fish stay between bed and water surface');
  }
 }
 assert.ok(fish>0,'sufficient depth restores seeded fish');
});


test('terrain wildlife samples each column at most once per activation',()=>{
 const counts=new Map();
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:(x,z)=>{
  const key=x+':'+z;
  counts.set(key,(counts.get(key)||0)+1);
  return {height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0};
 }};
 const first=spawnChunkOnTerrain(world,2,-3);
 assert.ok(counts.size<=MAX_PER_CHUNK+1);
 assert.ok([...counts.values()].every(n=>n===1),'repeated candidate columns reuse the sampled terrain');
 counts.clear();
 assert.deepEqual(spawnChunkOnTerrain(world,2,-3),first,'memoization preserves deterministic placement');
 assert.ok([...counts.values()].every(n=>n===1));
});


test('direct seeded spawning rejects unsafe coordinates before hashing or producing duplicate IDs',()=>{
 const maxChunk=Math.floor((Number.MAX_SAFE_INTEGER-15)/16);
 for(const invalid of [Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER+1,Infinity,NaN,1.5]){
  assert.throws(()=>spawnChunk(741,invalid,0,'forest'));
  assert.throws(()=>spawnChunk(741,0,invalid,'forest'));
 }
 assert.throws(()=>spawnChunk(Number.MAX_SAFE_INTEGER+1,0,0,'forest'),TypeError);
 assert.throws(()=>spawnChunk(741,maxChunk+1,0,'forest'),RangeError);
 assert.throws(()=>spawnChunk(741,0,-maxChunk-1,'forest'),RangeError);
 const a=spawnChunk(741,12,-4,'forest');
 assert.deepEqual(spawnChunk(741,12,-4,'forest'),a,'valid seeded populations remain unchanged');
 assert.ok(a.every(animal=>Number.isSafeInteger(Math.floor(animal.x))&&Number.isSafeInteger(Math.floor(animal.z))));
});


test('wildlife manager rejects out-of-domain cached and staged chunks atomically',()=>{
 let samples=0;
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>{
  samples++;
  return {height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0};
 }};
 const manager=createChunkWildlifeManager(world,{maxChunks:2});
 const original=manager.enter(0,0);
 const before=samples;
 const outside=Math.floor((Number.MAX_SAFE_INTEGER-15)/16)+1;
 assert.throws(()=>manager.sync([[1,0],[outside,0]]),RangeError);
 assert.throws(()=>manager.leave(outside,0),RangeError);
 assert.equal(samples,before,'invalid sync must not sample any new chunk');
 assert.equal(manager.activeChunks(),1);
 assert.strictEqual(manager.enter(0,0),original,'failed sync retains existing descriptors');
});

test('wetland frogs inhabit dry banks and shallow water but avoid deep water',()=>{
 const base={seed:7,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>({
  height:110,water:true,river:false,waterLevel:111,group:'wetland',biomeName:'Marsh',slope:0
 })};
 let shallowFrogs=0,dryFrogs=0;
 for(let x=-5;x<=5;x++)for(let z=-5;z<=5;z++){
  const shallow=spawnChunkOnTerrain(base,x,z);
  assert.deepEqual(shallow,spawnChunkOnTerrain(base,x,z));
  for(const a of shallow)if(a.species==='frog'){
   shallowFrogs++;
   assert.equal(a.y,112,'frog stands above shallow water');
  }
  const dry=spawnChunkOnTerrain({...base,surfaceAt:()=>({...base.surfaceAt(),water:false})},x,z);
  dryFrogs+=dry.filter(a=>a.species==='frog').length;
  const deep=spawnChunkOnTerrain({...base,surfaceAt:()=>({...base.surfaceAt(),height:100})},x,z);
  assert.ok(deep.every(a=>a.species!=='frog'),'frog must not spawn in deep water');
 }
 assert.ok(shallowFrogs>0&&dryFrogs>0,'seeded wetland supports amphibians on both banks and shallows');
});

test('terrain edits invalidate only the affected cached wildlife chunk',()=>{
 let height=80,samples=0;
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:(x,z)=>{
  samples++;
  return {height:x<16?height:60,group:'forest',biomeName:'Forest',water:false,river:false,slope:0};
 }};
 const manager=createChunkWildlifeManager(world,{maxChunks:2});
 const before=manager.enter(0,0),neighbor=manager.enter(1,0);
 const count=samples;
 height=84;
 assert.strictEqual(manager.enter(0,0),before,'cache hit stays stable until explicitly invalidated');
 assert.equal(samples,count);
 assert.equal(manager.invalidate(0,0),true);
 assert.equal(manager.activeChunks(),1);
 assert.equal(manager.invalidate(0,0),false,'repeated invalidation is idempotent');
 const updated=manager.enter(0,0);
 assert.deepEqual(updated.map(a=>a.id),before.map(a=>a.id),'terrain edits do not change stable creature IDs');
 assert.ok(updated.every((a,i)=>a.y===before[i].y+4),'regenerated ground and aerial wildlife follow edited height');
 assert.strictEqual(manager.enter(1,0),neighbor,'unaffected chunk is not regenerated');
 assert.throws(()=>manager.invalidate(Number.MAX_SAFE_INTEGER,0),RangeError);
 assert.equal(manager.activeChunks(),2);
});
