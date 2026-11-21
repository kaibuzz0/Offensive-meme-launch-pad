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


test('voxel edit invalidation respects negative chunk boundaries and leaves neighbors cached',()=>{
 let samples=0;
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>{
  samples++;
  return {height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0};
 }};
 const manager=createChunkWildlifeManager(world,{maxChunks:3});
 const negative=manager.enter(-1,0),zero=manager.enter(0,0),far=manager.enter(-2,0);
 const before=samples;
 assert.equal(manager.invalidateAtVoxel(-1,0),true);
 assert.equal(manager.invalidateAtVoxel(-1,0),false,'repeat edit invalidation is safe');
 assert.strictEqual(manager.enter(0,0),zero,'voxel -1 does not invalidate chunk zero');
 assert.strictEqual(manager.enter(-2,0),far,'voxel -1 does not invalidate chunk -2');
 assert.equal(samples,before,'unaffected cache hits do not resample terrain');
 assert.deepEqual(manager.enter(-1,0),negative,'invalidated population regenerates deterministically');
 assert.ok(samples>before);
 assert.equal(manager.invalidateAtVoxel(-16,0),true,'negative boundary belongs to chunk -1');
 assert.equal(manager.invalidateAtVoxel(-17,0),true,'next negative boundary belongs to chunk -2');
 assert.throws(()=>manager.invalidateAtVoxel(0.5,0),TypeError);
 assert.throws(()=>manager.invalidateAtVoxel(Number.MAX_SAFE_INTEGER+1,0),TypeError);
});

test('wildlife snapshot reuses immutable arrays until a committed population change',()=>{
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>({
  height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0
 })};
 const manager=createChunkWildlifeManager(world,{maxChunks:2});
 const empty=manager.snapshot();
 assert.strictEqual(manager.snapshot(),empty);
 manager.enter(0,0);
 const first=manager.snapshot();
 assert.ok(Object.isFrozen(first));
 assert.strictEqual(manager.snapshot(),first,'render-frame reads must not allocate another array');
 manager.enter(0,0);
 assert.strictEqual(manager.snapshot(),first,'cache hits do not change membership');
 assert.equal(manager.leave(9,9),false);
 assert.strictEqual(manager.snapshot(),first,'failed leave does not invalidate snapshot');
 manager.enter(1,0);
 const second=manager.snapshot();
 assert.notStrictEqual(second,first,'new chunk changes snapshot identity');
 assert.strictEqual(manager.snapshot(),second);
 assert.equal(manager.invalidateAtVoxel(0,0),true);
 const third=manager.snapshot();
 assert.notStrictEqual(third,second,'terrain edit invalidates the visible snapshot');
 assert.strictEqual(manager.snapshot(),third);
 manager.clear();
 assert.equal(manager.activeChunks(),0);
 assert.equal(manager.snapshot().length,0);
 assert.strictEqual(manager.snapshot(),manager.snapshot(),'empty cleared snapshot remains reusable');
});

test('repeated visible-chunk sync preserves snapshot until order or membership changes',()=>{
 let samples=0;
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>{
  samples++;
  return {height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0};
 }};
 const manager=createChunkWildlifeManager(world,{maxChunks:3});
 const first=manager.sync([[0,0],[1,0]]);
 const initialSamples=samples;
 assert.strictEqual(manager.sync([[0,0],[1,0]]),first,'identical frame sync reuses frozen snapshot');
 assert.equal(samples,initialSamples,'identical frame sync does not resample terrain');
 const reordered=manager.sync([[1,0],[0,0]]);
 assert.notStrictEqual(reordered,first,'chunk ordering changes descriptor order');
 assert.strictEqual(manager.sync([[1,0],[0,0]]),reordered);
 assert.equal(samples,initialSamples,'reordering does not regenerate cached creatures');
 manager.invalidateAtVoxel(0,0);
 const edited=manager.sync([[1,0],[0,0]]);
 assert.notStrictEqual(edited,reordered,'invalidated terrain refreshes population snapshot');
 assert.ok(samples>initialSamples);
 assert.strictEqual(manager.sync([[1,0],[0,0]]),edited);
});


test('LRU cache hit updates snapshot order without regenerating creatures',()=>{
 let samples=0;
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>{
  samples++;
  return {height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0};
 }};
 const manager=createChunkWildlifeManager(world,{maxChunks:3});
 const a=manager.enter(0,0),b=manager.enter(1,0);
 const before=manager.snapshot(),sampleCount=samples;
 manager.enter(1,0);
 assert.strictEqual(manager.snapshot(),before,'most-recent hit does not alter ordering');
 assert.strictEqual(manager.enter(0,0),a);
 const reordered=manager.snapshot();
 assert.notStrictEqual(reordered,before,'non-tail hit changes descriptor ordering');
 assert.deepEqual(reordered,[...b,...a]);
 assert.equal(samples,sampleCount,'LRU changes never regenerate terrain or wildlife');
 assert.strictEqual(manager.snapshot(),reordered,'reordered snapshot is cached');
});

test('unchanged visible chunks reuse the exact snapshot including empty populations',()=>{
 let samples=0;
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>{
  samples++;
  return {height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0};
 }};
 const manager=createChunkWildlifeManager(world,{maxChunks:3,maxPerChunk:0});
 const first=manager.sync([[0,0],[1,0]]);
 assert.deepEqual(first,[]);
 const before=samples;
 for(let i=0;i<100;i++)assert.strictEqual(manager.sync([[0,0],[1,0]]),first);
 assert.equal(samples,before,'stable empty populations do not trigger terrain sampling');
 const changed=manager.sync([[1,0],[0,0]]);
 assert.notStrictEqual(changed,first,'reordering still rebuilds the snapshot');
 assert.strictEqual(manager.sync([[1,0],[0,0]]),changed);
});


test('failed terrain sampling during chunk sync preserves active wildlife and snapshot',()=>{
 let fail=false,samples=0;
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:(x,z)=>{
  samples++;
  if(fail&&x>=16)throw new Error('terrain sample unavailable');
  return {height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0};
 }};
 const manager=createChunkWildlifeManager(world,{maxChunks:2});
 const initial=manager.sync([[0,0]]);
 const original=manager.enter(0,0);
 fail=true;
 assert.throws(()=>manager.sync([[0,0],[1,0]]),/terrain sample unavailable/);
 assert.equal(manager.activeChunks(),1,'failed staging cannot evict the previously active chunk');
 assert.strictEqual(manager.snapshot(),initial,'failed staging cannot replace renderer snapshot');
 assert.strictEqual(manager.enter(0,0),original,'previous creature descriptors remain active');
 fail=false;
 const recovered=manager.sync([[0,0],[1,0]]);
 assert.equal(manager.activeChunks(),2);
 assert.notStrictEqual(recovered,initial,'successful retry publishes new population');
 assert.ok(samples>0);
});


test('malformed terrain grade cannot spawn actors on unverified columns',()=>{
 const base={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112};
 const valid={height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0};
 const normal=spawnChunkOnTerrain({...base,surfaceAt:()=>valid},1,0);
 assert.ok(normal.length>0,'fixture must exercise a populated forest chunk');
 for(const slope of [undefined,NaN,Infinity,-1]){
  const invalid=spawnChunkOnTerrain({...base,surfaceAt:()=>({...valid,slope})},1,0);
  assert.deepEqual(invalid,[],'invalid slope must not generate unsafe wildlife placement');
 }
 assert.deepEqual(spawnChunkOnTerrain({...base,surfaceAt:()=>valid},1,0),normal,
  'valid terrain remains deterministic after invalid samples');
});


test('failed chunk entry does not evict the last visible population',()=>{
 let fail=false;
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:(x,z)=>{
  if(fail&&x>=16)throw new Error('terrain unavailable');
  return {height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0};
 }};
 const manager=createChunkWildlifeManager(world,{maxChunks:1});
 const original=manager.enter(0,0),snapshot=manager.snapshot();
 fail=true;
 assert.throws(()=>manager.enter(1,0),/terrain unavailable/);
 assert.equal(manager.activeChunks(),1,'failed entry must not evict active chunk');
 assert.strictEqual(manager.snapshot(),snapshot,'renderer retains prior immutable snapshot');
 assert.strictEqual(manager.enter(0,0),original,'existing descriptors survive failed entry');
 fail=false;
 manager.enter(1,0);
 assert.equal(manager.activeChunks(),1,'successful retry respects chunk cap');
 assert.notStrictEqual(manager.snapshot(),snapshot,'successful retry publishes replacement');
});

test('wildlife hash domain rejects distant 32-bit aliases without touching active chunks',()=>{
 const base={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112};
 let samples=0;
 const world={...base,surfaceAt:()=>{
  samples++;
  return {height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0};
 }};
 const manager=createChunkWildlifeManager(world,{maxChunks:2});
 const original=manager.enter(0,0);
 const snapshot=manager.snapshot();
 const before=samples;
 // x|0 would otherwise hash these coordinates exactly like chunk zero.
 for(const alias of [4294967296,-4294967296,2147483648,-2147483649]){
  assert.throws(()=>spawnChunk(741,alias,0,'forest'),RangeError);
  assert.throws(()=>spawnChunkOnTerrain(world,alias,0),RangeError);
  assert.throws(()=>manager.enter(alias,0),RangeError);
  assert.throws(()=>manager.sync([[0,0],[alias,0]]),RangeError);
 }
 assert.equal(samples,before,'rejected aliases must not sample terrain');
 assert.equal(manager.activeChunks(),1);
 assert.strictEqual(manager.snapshot(),snapshot,'failed staging preserves renderer snapshot');
 assert.strictEqual(manager.enter(0,0),original);
 assert.deepEqual(spawnChunk(741,1,0,'forest'),spawnChunk(741,1,0,'forest'));
});


test('aquatic and aerial wildlife do not require terrestrial slope metadata',()=>{
 const base={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112};
 for(const habitat of [
  {group:'ocean',biomeName:'Ocean',water:true,river:false,waterLevel:90},
  {group:'forest',biomeName:'Forest',water:false,river:false,waterLevel:112}
 ]){
  const column={height:80,slope:0,...habitat};
  const valid={...base,surfaceAt:()=>column};
  const missing={...base,surfaceAt:()=>({...column,slope:undefined})};
  const isFree=species=>habitat.water?species==='fish':
   ['songbird','hawk','owl','eagle','duck','seabird','bat'].includes(species);
  let found=0;
  for(let cx=0;cx<20;cx++)for(let cz=0;cz<20;cz++){
   const expected=spawnChunkOnTerrain(valid,cx,cz).filter(a=>isFree(a.species));
   if(!expected.length)continue;
   found+=expected.length;
   const actual=spawnChunkOnTerrain(missing,cx,cz).filter(a=>isFree(a.species));
   assert.deepEqual(actual,expected,'non-ground actors must not depend on walkable slope');
   if(!habitat.water)assert.ok(spawnChunkOnTerrain(missing,cx,cz).every(a=>isFree(a.species)),
    'missing slope still rejects terrestrial actors');
  }
  assert.ok(found>0,'fixture must exercise at least one eligible species');
 }
});

test('committed edit batches invalidate unique chunks atomically including negative voxels',()=>{
 let samples=0;
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>{
  samples++;
  return {height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0};
 }};
 const manager=createChunkWildlifeManager(world,{maxChunks:3});
 const a=manager.enter(-1,0),b=manager.enter(0,0),c=manager.enter(1,0);
 const snapshot=manager.snapshot(),before=samples;
 assert.throws(()=>manager.invalidateCommittedVoxels([{x:-1,z:0},{x:1.5,z:0}]),TypeError);
 assert.throws(()=>manager.invalidateCommittedVoxels([{x:-1,z:0},{x:2147483648*16,z:0}]),RangeError);
 assert.strictEqual(manager.snapshot(),snapshot,'rejected batch leaves the snapshot untouched');
 assert.equal(manager.activeChunks(),3);
 assert.equal(samples,before,'rejected batch never samples terrain');
 assert.equal(manager.invalidateCommittedVoxels([{x:-1,z:0},{x:-16,z:0},{x:0,z:0}]),2);
 assert.equal(manager.activeChunks(),1);
 assert.strictEqual(manager.enter(1,0),c,'unaffected chunk keeps its descriptor');
 assert.deepEqual(manager.enter(-1,0),a);
 assert.deepEqual(manager.enter(0,0),b);
 assert.equal(manager.invalidateCommittedVoxels([]),0);
 assert.throws(()=>manager.invalidateCommittedVoxels(Array(4097).fill({x:0,z:0})),RangeError);
});


test('zero-duration flock tick preserves position and velocity even above speed cap',()=>{
 const agents=[{id:'a',x:2,z:-3,vx:7,vz:0},{id:'b',x:3,z:-3,vx:0,vz:0}];
 const before=structuredClone(agents);
 const result=cappedFlockStep(agents,0,{speed:3});
 assert.deepEqual(result,before);
 assert.deepEqual(agents,before);
 assert.notStrictEqual(result[0],agents[0]);
});


test('active wildlife proximity queries are bounded, immutable and do not generate terrain',()=>{
 let samples=0;
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>{
  samples++;
  return {height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0};
 }};
 const manager=createChunkWildlifeManager(world,{maxChunks:2});
 manager.sync([[0,0],[1,0]]);
 const before=samples;
 const all=manager.snapshot();
 const near=manager.nearby(8,8,256);
 assert.deepEqual(near,all);
 assert.ok(Object.isFrozen(near));
 assert.ok(near.every(Object.isFrozen));
 assert.deepEqual(manager.nearby(999,999,1),[]);
 assert.equal(samples,before,'query does not sample or activate distant terrain');
 assert.throws(()=>manager.nearby(0,0,257),RangeError);
 assert.throws(()=>manager.nearby(NaN,0,1),RangeError);
 assert.throws(()=>manager.nearby(0,0,-1),RangeError);
 manager.clear();
 assert.deepEqual(manager.nearby(8,8,256),[]);
});


test('height-aware nearby queries filter loaded wildlife without changing horizontal callers',()=>{
 let samples=0;
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>{
  samples++;
  return {height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0};
 }};
 const manager=createChunkWildlifeManager(world,{maxChunks:4});
 // Find a populated deterministic chunk without relying on one fixed location.
 let selected=null;
 for(let cx=0;cx<12&&!selected;cx++)for(let cz=0;cz<12&&!selected;cz++){
  const population=manager.enter(cx,cz);
  if(population.length)selected=population[0];
  else manager.leave(cx,cz);
 }
 assert.ok(selected,'fixture must contain a spawned creature');
 const before=samples;
 assert.ok(manager.nearby(selected.x,selected.z,0).some(a=>a.id===selected.id));
 assert.ok(manager.nearby(selected.x,selected.z,0,selected.y,0).some(a=>a.id===selected.id));
 assert.ok(!manager.nearby(selected.x,selected.z,0,selected.y+2,0).some(a=>a.id===selected.id));
 assert.throws(()=>manager.nearby(selected.x,selected.z,1,selected.y),RangeError);
 assert.throws(()=>manager.nearby(selected.x,selected.z,1,undefined,2),RangeError);
 assert.throws(()=>manager.nearby(selected.x,selected.z,1,selected.y,-1),RangeError);
 assert.equal(samples,before,'proximity checks never query terrain');
});

test('player-centered wildlife streaming prioritizes nearby chunks and preserves stable snapshots',()=>{
 let samples=0;
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>{
  samples++;
  return {height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0};
 }};
 const manager=createChunkWildlifeManager(world,{maxChunks:3});
 const initial=manager.syncAround(8,8,2);
 assert.equal(manager.activeChunks(),3,'large neighborhood is capped');
 assert.strictEqual(manager.syncAround(8,8,2),initial,'same player chunk retains snapshot');
 assert.strictEqual(manager.syncAround(15,15,2),initial,'moving within chunk does not churn');
 const after=samples;
 assert.strictEqual(manager.syncAround(15,15,2),initial);
 assert.equal(samples,after,'repeated sync does not sample terrain');
 assert.deepEqual(initial,manager.snapshot());
 assert.throws(()=>manager.syncAround(0,0,5),RangeError);
 assert.strictEqual(manager.syncAround(0.5,0,2),initial,'fractional player positions must be accepted');
 assert.throws(()=>manager.syncAround(2147483648*16,0,1),RangeError);
 assert.strictEqual(manager.snapshot(),initial,'invalid inputs leave existing population intact');
 const moved=manager.syncAround(-1,-1,1);
 assert.equal(manager.activeChunks(),3);
 assert.notStrictEqual(moved,initial,'crossing chunk boundaries updates active populations');
 assert.strictEqual(manager.syncAround(-1,-1,1),moved);
});

test('first-person fractional positions stream the same chunks as floored voxels',()=>{
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>({
  height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0
 })};
 const manager=createChunkWildlifeManager(world,{maxChunks:4});
 const left=manager.syncAround(-0.25,15.75,1);
 assert.strictEqual(manager.syncAround(-1,15,1),left,'fractional motion within a voxel does not rebuild snapshots');
 const seam=manager.syncAround(0.25,16.25,1);
 assert.strictEqual(manager.syncAround(0,16,1),seam,'positive seam uses the correct chunk');
 assert.notStrictEqual(seam,left,'crossing the seam updates streamed populations');
 assert.ok(manager.activeChunks()<=4);
 const previous=manager.snapshot();
 for(const invalid of [NaN,Infinity,-Infinity,Number.MAX_SAFE_INTEGER+1]){
  assert.throws(()=>manager.syncAround(invalid,0,1),TypeError);
  assert.throws(()=>manager.syncAround(0,invalid,1),TypeError);
 }
 assert.strictEqual(manager.snapshot(),previous,'invalid positions leave the active world unchanged');
});

test('player-centered wildlife streaming clips out-of-range neighbor chunks without losing the center',()=>{
 let samples=0;
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>{
  samples++;
  return {height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0};
 }};
 const manager=createChunkWildlifeManager(world,{maxChunks:4});
 // Chunk hashes and voxel positions are only valid through signed 32-bit
 // chunk coordinates, even though JavaScript can represent larger integers.
 const edge=0x7fffffff;
 const first=manager.syncAround(edge*16+0.5,0,1);
 assert.ok(Object.isFrozen(first));
 assert.ok(manager.activeChunks()<=4);
 assert.ok(first.every(a=>Number(a.id.split(':')[1])<=edge));
 const previous=manager.snapshot(),before=samples;
 assert.strictEqual(manager.syncAround(edge*16+0.75,0,1),previous);
 assert.equal(samples,before,'fractional movement inside a chunk does not regenerate fauna');
 const negative=manager.syncAround(-edge*16-0.5,0,1);
 assert.ok(Object.isFrozen(negative));
 assert.ok(manager.activeChunks()<=4);
 assert.ok(negative.every(a=>Number(a.id.split(':')[1])>=-edge));
});
