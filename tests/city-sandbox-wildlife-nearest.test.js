'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const wildlife = require('../city-sandbox-wildlife.js');

test('nearest uses only loaded wildlife and agrees with proximity ordering', () => {
 let samples = 0;
 const world = {
  seed: 17, CHUNK_SIZE: 16, SEA_LEVEL: 0,
  surfaceAt() { samples++; return {height: 10, slope: 0, group: 'forest', water: false, river: false}; }
 };
 const manager = wildlife.createChunkWildlifeManager(world, {maxChunks: 4});
 let population = [];
 for(let cx = 0; cx < 20 && !population.length; cx++){
  manager.clear();
  population = manager.enter(cx, 0);
 }
 assert.ok(population.length > 0, 'test seed must produce a creature');
 const target = population[0];
 const before = samples;
 assert.strictEqual(manager.nearest(target.x, target.z, 0), target);
 assert.strictEqual(manager.nearest(target.x, target.z, 256), target);
 assert.strictEqual(manager.nearest(target.x + 10000, target.z, 1), null);
 assert.strictEqual(samples, before, 'interaction queries must not sample terrain');
 assert.strictEqual(manager.nearby(target.x, target.z, 0)[0], target);
 manager.clear();
 assert.strictEqual(manager.nearest(target.x, target.z, 256), null);
});

test('nearest rejects invalid radius and coordinates without changing loaded chunks', () => {
 const world = {
  seed: 5, CHUNK_SIZE: 16, SEA_LEVEL: 0,
  surfaceAt() { return {height: 8, slope: 0, group: 'plains'}; }
 };
 const manager = wildlife.createChunkWildlifeManager(world);
 manager.enter(0, 0);
 const before = manager.snapshot();
 for(const args of [[NaN,0,1],[0,Infinity,1],[0,0,-1],[0,0,257]]){
  assert.throws(() => manager.nearest(...args), RangeError);
 }
 assert.strictEqual(manager.snapshot(), before);
});
