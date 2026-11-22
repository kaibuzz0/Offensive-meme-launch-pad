'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const wildlife=require('../city-sandbox-wildlife.js');

test('canonical road and curb exclude ground wildlife without resampling terrain',()=>{
 const surface=(road,curb)=>({height:120,group:'grassland',biomeName:'plains',slope:1,road,curb,water:false,river:false});
 let chosen=null;
 for(let seed=0;seed<500;seed++){
  const world={seed,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>surface(false,false)};
  const animals=wildlife.spawnChunkOnTerrain(world,0,0);
  if(animals.some(a=>!['songbird','hawk','owl','eagle','duck','seabird','bat'].includes(a.species))){chosen=seed;break;}
 }
 assert.notEqual(chosen,null,'fixture must include terrestrial wildlife');
 const dryWorld={seed:chosen,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>surface(false,false)};
 const normal=wildlife.spawnChunkOnTerrain(dryWorld,0,0);
 for(const flag of ['road','curb']){
  let reads=0;
  const world={seed:chosen,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>{reads++;return surface(flag==='road',flag==='curb');}};
  const placed=wildlife.spawnChunkOnTerrain(world,0,0);
  assert.equal(placed.filter(a=>!['songbird','hawk','owl','eagle','duck','seabird','bat'].includes(a.species)).length,0);
  assert.deepEqual(placed.map(a=>a.id),normal.filter(a=>['songbird','hawk','owl','eagle','duck','seabird','bat'].includes(a.species)).map(a=>a.id));
  assert.ok(reads<=7,'one center and at most six candidate columns');
 }
});
