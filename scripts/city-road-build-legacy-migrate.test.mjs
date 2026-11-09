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

test('occupancy query becoming unavailable after mapping quarantines without durable writes', async () => {
  let queries = 0;
  let writes = 0;
  const result = await migrateLegacyRoadWorkbench({
    storage: storage(JSON.stringify({version:1,seed,kind:'workbench',x:4,z:5})),
    seed, key: seed,
    store: {
      read: async () => { writes++; throw Error('unexpected durable read'); },
      compareAndSwap: async () => { writes++; throw Error('unexpected durable write'); }
    },
    groundHeightAt: () => 1,
    isOccupied: () => {
      queries++;
      if (queries === 1) return false;
      throw Error('chunk unloaded before activation');
    }
  });
  assert.equal(queries, 2);
  assert.equal(writes, 0);
  assert.equal(result.status, 'quarantine');
  assert.equal(result.reason, 'terrain-query-failed');
});

test('full migration commits once, retains supplies and preserves legacy source on repeat', async () => {
  const { createVoxelEditJournal } = await import('../city-sandbox-mining.js');
  const raw = JSON.stringify({ version: 1, seed, kind: 'workbench', x: 4, z: 5 });
  const legacy = storage(raw);
  let record = {
    version: 1, seed, revision: 0, inventory: { supplies: 8 },
    journal: createVoxelEditJournal(seed).snapshot()
  };
  let commits = 0;
  const durable = {
    async read() { return structuredClone(record); },
    async compareAndSwap(_key, revision, next) {
      if (revision !== record.revision) return false;
      commits++;
      record = structuredClone(next);
      return true;
    }
  };
  const args = {
    storage: legacy, seed, key: seed, store: durable,
    groundHeightAt: () => 1, isOccupied: () => false
  };
  const first = await migrateLegacyRoadWorkbench(args);
  assert.deepEqual(first, { status: 'activated', revision: 1 });
  assert.equal(record.inventory.supplies, 8);
  assert.equal(record.journal.edits.length, 1);
  assert.equal(commits, 1);
  assert.equal(legacy.getItem('meme-city-road-build-v1:' + seed), raw);
  const saved = structuredClone(record);
  const again = await migrateLegacyRoadWorkbench(args);
  assert.equal(again.status, 'quarantine');
  assert.deepEqual(record, saved);
  assert.equal(commits, 1);
});
