'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const wildlife = require('../city-sandbox-wildlife.js');

test('proximity queries remain stable when chunk activation order changes', () => {
  const world = {
    seed: 12345, CHUNK_SIZE: 16, SEA_LEVEL: 0,
    surfaceAt: () => ({ height: 12, group: 'forest', slope: 0 })
  };
  const manager = wildlife.createChunkWildlifeManager(world, { maxChunks: 4 });
  const chunks = [[0, 0], [1, 0], [0, 1], [1, 1]];
  manager.sync(chunks);
  const first = manager.nearby(16, 16, 100).map(a => a.id);
  const closest = manager.nearest(16, 16, 100)?.id;
  manager.sync(chunks.slice().reverse());
  assert.deepEqual(manager.nearby(16, 16, 100).map(a => a.id), first);
  assert.equal(manager.nearest(16, 16, 100)?.id, closest);
  assert.deepEqual(first, first.slice().sort());
});
