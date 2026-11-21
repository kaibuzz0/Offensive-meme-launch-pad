'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {createChunkWildlifeManager} = require('../city-sandbox-wildlife.js');

test('height-aware nearest rejects wildlife through floors without terrain reads', () => {
 let reads = 0;
 const world = {seed:42, CHUNK_SIZE:16, SEA_LEVEL:0,
  surfaceAt(){reads++;return {height:10,group:'forest',slope:0};}};
 const manager=createChunkWildlifeManager(world);
 let animals=[];
 for(let cx=0;cx<32&&!animals.length;cx++){
  manager.clear();
  animals=manager.enter(cx,0);
 }
 assert.ok(animals.length>0);
 const animal=animals[0], before=reads;
 assert.strictEqual(manager.nearest(animal.x,animal.z,0),animal,'legacy horizontal query remains compatible');
 assert.strictEqual(manager.nearest(animal.x,animal.z,2,animal.y,2),animal);
 assert.strictEqual(manager.nearest(animal.x,animal.z,2,animal.y+20,2),null);
 assert.strictEqual(manager.nearest(animal.x,animal.z,2,animal.y+1,0),null);
 assert.strictEqual(reads,before,'probes must not sample terrain');
 assert.throws(()=>manager.nearest(animal.x,animal.z,2,NaN,2),RangeError);
 assert.throws(()=>manager.nearest(animal.x,animal.z,2,animal.y,-1),RangeError);
 assert.throws(()=>manager.nearest(animal.x,animal.z,2,undefined,2),RangeError);
 manager.clear();
 assert.strictEqual(manager.nearest(animal.x,animal.z,2,animal.y,2),null);
});
