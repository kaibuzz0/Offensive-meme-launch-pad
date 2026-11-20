'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createChunkWildlifeManager}=require('../city-sandbox-wildlife.js');
const world={seed:42,CHUNK_SIZE:16,SEA_LEVEL:0,surfaceAt(x,z){return {height:10,group:'forest',slope:0};}};
test('voxel invalidation removes only owning cached chunk including negative boundaries',()=>{
 const manager=createChunkWildlifeManager(world,{maxChunks:4});
 manager.enter(-1,-1);manager.enter(0,0);manager.enter(1,0);
 assert.equal(manager.activeChunks(),3);
 assert.equal(manager.invalidateAtVoxel(-1,-1),true);
 assert.equal(manager.activeChunks(),2);
 assert.equal(manager.invalidateAtVoxel(-1,-1),false);
 assert.equal(manager.invalidateAtVoxel(16,0),true);
 assert.equal(manager.activeChunks(),1);
 assert.equal(manager.invalidateAtVoxel(0,0),true);
 assert.equal(manager.activeChunks(),0);
});
test('invalid coordinates do not mutate active wildlife',()=>{
 const manager=createChunkWildlifeManager(world);
 manager.enter(0,0);
 for(const coords of [[NaN,0],[0,Infinity],[0.5,0],[Number.MAX_SAFE_INTEGER+1,0]]){
  assert.throws(()=>manager.invalidateAtVoxel(...coords),TypeError);
  assert.equal(manager.activeChunks(),1);
 }
});
test('reentry samples edited terrain without changing deterministic creature IDs',()=>{
 let height=10;
 const editedWorld={...world,surfaceAt(x,z){return {height,group:'forest',slope:0};}};
 const manager=createChunkWildlifeManager(editedWorld);
 const before=manager.enter(0,0);
 height=12;
 assert.equal(manager.invalidateAtVoxel(0,0),true);
 const after=manager.enter(0,0);
 assert.deepEqual(after.map(a=>a.id),before.map(a=>a.id));
 assert.deepEqual(after.map(a=>a.y),before.map(a=>a.y+2));
});
