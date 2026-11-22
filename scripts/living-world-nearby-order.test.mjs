import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../city-sandbox-wildlife.js', import.meta.url), 'utf8');
const context = { module: { exports: {} } };
runInNewContext(source, context);
const { createChunkWildlifeManager } = context.module.exports;

test('nearby wildlife ordering is independent of active chunk LRU order', () => {
  const world = {
    seed: 2026,
    CHUNK_SIZE: 16,
    SEA_LEVEL: 112,
    surfaceAt: () => ({ height: 130, slope: 0, group: 'grassland', biomeName: 'plains', water: false, river: false })
  };
  const first = createChunkWildlifeManager(world);
  const second = createChunkWildlifeManager(world);
  const chunks = [[0, 0], [1, 0], [0, 1], [1, 1]];
  for (const [x, z] of chunks) first.enter(x, z);
  for (const [x, z] of [...chunks].reverse()) second.enter(x, z);
  const ids = manager => Array.from(manager.nearby(16, 16, 256), animal => animal.id);
  const expected = ids(first);
  assert.deepEqual(ids(second), expected);
  assert.deepEqual(expected, [...expected].sort());
  assert.equal(Object.isFrozen(first.nearby(16, 16, 256)), true);
  first.enter(0, 0); // LRU reorder must not change encounter ordering.
  assert.deepEqual(ids(first), expected);
});
