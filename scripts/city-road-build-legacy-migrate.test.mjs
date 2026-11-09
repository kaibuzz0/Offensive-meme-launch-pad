import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateLegacyRoadWorkbench } from '../city-road-build-legacy-migrate.js';

const seed = 'migration-seed';
const storage = (build, craft = null) => ({
  getItem(key) {
    if (key === 'meme-city-road-build-v1:' + seed) return build;
    if (key === 'meme-city-road-craft-v1:' + seed) return craft;
    return null;
  }
});

test('absent legacy record leaves durable store untouched', async () => {
  let reads = 0;
  const result = await migrateLegacyRoadWorkbench({
    storage: storage(null), seed, key: seed,
    store: { read: async () => { reads++; } },
    groundHeightAt: () => { throw Error('unexpected'); },
    isOccupied: () => { throw Error('unexpected'); }
  });
  assert.equal(result.status, 'absent');
  assert.equal(reads, 0);
});

test('invalid legacy data is quarantined without writing', async () => {
  const result = await migrateLegacyRoadWorkbench({
    storage: storage('{bad'), seed, key: seed,
    store: { read: async () => { throw Error('unexpected'); } },
    groundHeightAt: () => 0, isOccupied: () => false
  });
  assert.equal(result.status, 'quarantine');
  assert.equal(result.reason, 'invalid-json');
});

test('occupied legacy placement never touches durable store', async () => {
  const result = await migrateLegacyRoadWorkbench({
    storage: storage(JSON.stringify({version:1,seed,kind:'workbench',x:4,z:5})),
    seed, key: seed, store: { read: async () => { throw Error('unexpected'); } },
    groundHeightAt: () => 1, isOccupied: () => true
  });
  assert.equal(result.status, 'quarantine');
  assert.equal(result.reason, 'occupied-target');
});

test('terrain query failure preserves original record', async () => {
  const result = await migrateLegacyRoadWorkbench({
    storage: storage(JSON.stringify({version:1,seed,kind:'workbench',x:4,z:5})),
    seed, key: seed, store: { read: async () => { throw Error('unexpected'); } },
    groundHeightAt: () => { throw Error('unloaded chunk'); },
    isOccupied: () => false
  });
  assert.equal(result.status, 'quarantine');
  assert.equal(result.reason, 'terrain-query-failed');
});
