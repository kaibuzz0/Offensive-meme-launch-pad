'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createChunkWildlifeManager}=require('../city-sandbox-wildlife.js');
const world={seed:123,CHUNK_SIZE:16,SEA_LEVEL:0,surfaceAt(x,z){return {height:8,slope:0,group:'forest'};}};
test('syncAround caps active chunks and reuses unchanged snapshots',()=>{
 const manager=createChunkWildlifeManager(world,{maxChunks:4});
 const first=manager.syncAround(8,8,2);
 assert.equal(manager.activeChunks(),4);
 assert.strictEqual(manager.syncAround(8,8,2),first);
 assert.deepEqual(manager.syncAround(8,8,2),first);
 assert.equal(manager.activeChunks(),4);
});
test('syncAround validates before mutating active populations',()=>{
 const manager=createChunkWildlifeManager(world,{maxChunks:3});
 const original=manager.syncAround(-1,-1,1);
 for(const args of [[NaN,0,1],[0,Infinity,1],[0,0,9],[0,0,-1],[0,0,0.5]]){
  assert.throws(()=>manager.syncAround(...args));
  assert.strictEqual(manager.snapshot(),original);
 }
});
test('syncAround preserves stable populations after returning to same chunk',()=>{
 const manager=createChunkWildlifeManager(world,{maxChunks:3});
 const original=manager.syncAround(8,8,1);
 manager.syncAround(100,100,1);
 assert.deepEqual(manager.syncAround(8,8,1),original);
});

test('enter keeps recently visited chunks resident without resampling terrain',()=>{
 let probes=0;
 const countedWorld={...world,surfaceAt(x,z){probes++;return world.surfaceAt(x,z);}};
 const manager=createChunkWildlifeManager(countedWorld,{maxChunks:2});
 const first=manager.enter(0,0);
 manager.enter(1,0);
 const before=probes;
 assert.strictEqual(manager.enter(0,0),first);
 assert.equal(probes,before);
 manager.enter(2,0); // Evicts older (1,0), not recently visited (0,0).
 assert.strictEqual(manager.enter(0,0),first);
 assert.equal(probes>before,true);
 const after=probes;
 manager.enter(1,0); // Recreates the evicted population.
 assert.ok(probes>after);
 assert.equal(manager.activeChunks(),2);
});

test('proximity broad phase preserves exact results across negative chunk borders',()=>{
 const manager=createChunkWildlifeManager(world,{maxChunks:8});
 manager.sync([[-2,0],[-1,0],[0,0],[1,0],[2,0]]);
 const population=manager.snapshot();
 for(const [x,z,radius] of [[-16,8,0],[-16,8,1],[-0.1,8,16],[16,8,32],[0,8,256]]){
  const expected=population.filter(a=>(a.x-x)**2+(a.z-z)**2<=radius**2);
  assert.deepEqual(manager.nearby(x,z,radius),expected);
  const closest=[...expected].sort((a,b)=>{
   const da=(a.x-x)**2+(a.z-z)**2,db=(b.x-x)**2+(b.z-z)**2;
   return da-db||(a.id<b.id?-1:a.id>b.id?1:0);
  })[0]??null;
  assert.deepEqual(manager.nearest(x,z,radius),closest);
 }
});
