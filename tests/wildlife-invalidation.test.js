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

test('committed batch invalidates unique owning chunks, including negative coordinates',()=>{
 const manager=createChunkWildlifeManager(world,{maxChunks:4});
 manager.enter(-1,-1);manager.enter(0,0);manager.enter(1,0);
 assert.equal(manager.invalidateCommittedVoxels([{x:-1,z:-1},{x:-16,z:-16},{x:0,z:0},{x:1,z:1}]),2);
 assert.equal(manager.activeChunks(),1);
 assert.equal(manager.invalidateCommittedVoxels([{x:0,z:0}]),0);
 assert.equal(manager.activeChunks(),1);
});
test('malformed committed batch is rejected without partial invalidation',()=>{
 const manager=createChunkWildlifeManager(world,{maxChunks:4});
 manager.enter(-1,-1);manager.enter(0,0);
 const before=manager.snapshot();
 assert.throws(()=>manager.invalidateCommittedVoxels([{x:-1,z:-1},{x:0.5,z:0}]),TypeError);
 assert.deepEqual(manager.snapshot(),before);
 assert.equal(manager.activeChunks(),2);
 assert.throws(()=>manager.invalidateCommittedVoxels(Array(4097).fill({x:0,z:0})),RangeError);
 assert.equal(manager.activeChunks(),2);
});

test('terrain columns are sampled at most once per chunk and refresh after committed edits',()=>{
 let height=10, calls=0;
 const terrain={...world,surfaceAt(x,z){calls++;return {height,group:'forest',slope:0};}};
 const manager=createChunkWildlifeManager(terrain);
 const first=manager.enter(0,0);
 assert.ok(calls<=7,'center plus six candidates is the maximum column sample count');
 const before=calls;
 assert.deepEqual(manager.enter(0,0),first);
 assert.equal(calls,before,'cached chunk does not resample');
 height=13;
 manager.invalidateCommittedVoxels([{x:0,z:0}]);
 const second=manager.enter(0,0);
 assert.deepEqual(second.map(a=>a.id),first.map(a=>a.id));
 assert.deepEqual(second.map(a=>a.y),first.map(a=>a.y+3));
 assert.ok(calls>before,'committed edit forces fresh terrain samples');
});

test('out-of-domain chunk coordinates reject atomically before eviction or terrain queries',()=>{
 let samples=0;
 const terrain={...world,surfaceAt(x,z){samples++;return world.surfaceAt(x,z);}};
 const manager=createChunkWildlifeManager(terrain,{maxChunks:2});
 manager.enter(0,0);
 const before=manager.snapshot(), priorSamples=samples;
 const outside=0x80000000;
 assert.throws(()=>manager.enter(outside,0),RangeError);
 assert.throws(()=>manager.sync([[0,0],[outside,0]]),RangeError);
 assert.throws(()=>manager.leave(outside,0),RangeError);
 assert.equal(manager.activeChunks(),1);
 assert.strictEqual(manager.snapshot()[0],before[0]);
 assert.equal(samples,priorSamples,'invalid chunks never sample terrain');
});


test('out-of-domain committed edit batches reject atomically before cache mutation',()=>{
 const manager=createChunkWildlifeManager(world,{maxChunks:2});
 manager.enter(0,0);manager.enter(-1,0);
 const before=manager.snapshot();
 assert.throws(()=>manager.invalidateCommittedVoxels([{x:0,z:0},{x:0x80000000*16,z:0}]),RangeError);
 assert.deepEqual(manager.snapshot(),before);
 assert.equal(manager.activeChunks(),2);
});

test('single-voxel invalidation rejects out-of-domain chunks without mutating cache',()=>{
 const manager=createChunkWildlifeManager(world,{maxChunks:2});
 manager.enter(0,0);
 const before=manager.snapshot();
 assert.throws(()=>manager.invalidateAtVoxel(0x80000000*16,0),RangeError);
 assert.deepEqual(manager.snapshot(),before);
 assert.equal(manager.activeChunks(),1);
});
