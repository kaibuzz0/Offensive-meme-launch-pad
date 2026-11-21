'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const wildlife = require('../city-sandbox-wildlife.js');

test('terrestrial wildlife does not occupy canonical fortress road or curb', () => {
  let reads = 0;
  const world = {
    seed: 1127, CHUNK_SIZE: 16, SEA_LEVEL: 112,
    surfaceAt(x, z) {
      reads++;
      return { height: 120, group: 'grassland', biomeName: 'plains',
        slope: 1, road: true, curb: true, water: false, river: false };
    }
  };
  for (let cx = -3; cx <= 3; cx++) {
    for (let cz = -3; cz <= 3; cz++) {
      const actors = wildlife.spawnChunkOnTerrain(world, cx, cz);
      assert.equal(actors.filter(a => !['songbird', 'hawk', 'owl', 'eagle', 'duck', 'seabird', 'bat'].includes(a.species)).length, 0);
    }
  }
  assert.ok(reads > 0);
});

test('road filtering does not change deterministic raw spawn identifiers', () => {
  const a = wildlife.spawnChunk(1127, 0, 0, 'plains');
  const b = wildlife.spawnChunk(1127, 0, 0, 'plains');
  assert.deepEqual(a, b);
});
