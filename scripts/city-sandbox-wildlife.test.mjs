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
const {spawnChunk,spawnChunkOnTerrain,habitatFor,cappedFlockStep,MAX_PER_CHUNK}=wildlife;

test('seed and chunk coordinates yield stable wildlife independent of call order',()=>{
 const a=spawnChunk(741,12,-4,'forest');
 spawnChunk(741,-1,3,'desert');
 assert.deepEqual(spawnChunk(741,12,-4,'forest'),a);
 assert.notDeepEqual(spawnChunk(741,13,-4,'forest'),a);
 assert.ok(a.length<=MAX_PER_CHUNK);
 assert.ok(a.every(e=>e.x>=192&&e.x<208&&e.z>=-64&&e.z<-48));
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
 assert.ok(first.every(c=>c.y===51+Math.floor(c.x)%3&&c.habitat==='forest'));
 assert.deepEqual(first.map(({id,x,z,heading})=>({id,x,z,heading})),
  spawnChunk(world.seed,2,-3,{group:'evergreen',name:'Ancient Forest'}).map(({id,x,z,heading})=>({id,x,z,heading})));
});
test('terrain adapter rejects incompatible chunk dimensions and unsafe ground',()=>{
 const world={seed:22,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>({
  height:60,group:'grassland',biomeName:'Prairie',water:true,river:false,slope:0
 })};
 assert.deepEqual(spawnChunkOnTerrain(world,0,0),[]);
 assert.throws(()=>spawnChunkOnTerrain({...world,CHUNK_SIZE:32},0,0),RangeError);
 assert.throws(()=>spawnChunkOnTerrain({...world,seed:'bad'},0,0),TypeError);
 const steep={...world,surfaceAt:()=>({height:60,group:'grassland',water:false,river:false,slope:25})};
 assert.deepEqual(spawnChunkOnTerrain(steep,0,0),[]);
});
test('terrain adapter places aquatic wildlife below water surface only',()=>{
 const wet={seed:7,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>({
  height:103,water:true,river:false,waterLevel:112,group:'ocean',biomeName:'Deep Ocean',slope:0
 })};
 const fish=spawnChunkOnTerrain(wet,0,0);
 assert.ok(fish.every(c=>c.species==='fish'&&c.y===104));
 assert.deepEqual(spawnChunkOnTerrain({...wet,surfaceAt:()=>({...wet.surfaceAt(),water:false})},0,0),[]);
});
