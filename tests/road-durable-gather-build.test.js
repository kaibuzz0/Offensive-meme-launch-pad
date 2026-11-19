import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { commitRoadSalvage, commitWorkbenchBuild } from '../city-road-build-commit.js';

function store(initial) {
  let current = structuredClone(initial);
  return {
    async read() { return structuredClone(current); },
    async compareAndSwap(_key, revision, candidate) {
      if (current.revision !== revision) return false;
      current = structuredClone(candidate);
      return true;
    }
  };
}
const initial = () => ({
  version: 1, seed: 'road-commit', revision: 0,
  inventory: { supplies: 0 },
  journal: createVoxelEditJournal('road-commit').snapshot()
});
const pickup = { expectedRevision: 0, player: {x: .125, y: .125, z: .125},
  crate: {x: 0, y: 0, z: 0} };
const build = { kind: 'place-workbench', expectedRevision: 1,
  player: {x: 1, y: 0, z: 1}, position: {x: 1, z: 1},
  groundHeight: 0, isOccupied: () => false };

test('durable pickup and build share one inventory and voxel revision ledger', async () => {
  const db = store(initial());
  const gathered = await commitRoadSalvage(db, 'road', pickup);
  assert.equal(gathered.inventory.supplies, 8);
  assert.equal(gathered.journal.revision, 1);
  await assert.rejects(commitRoadSalvage(db, 'road', pickup), /stale/);
  const built = await commitWorkbenchBuild(db, 'road', build);
  assert.equal(built.inventory.supplies, 0);
  assert.equal(built.journal.revision, 2);
  const restored = JSON.parse(JSON.stringify(await db.read('road')));
  assert.equal(restored.revision, 2);
  assert.equal(createVoxelEditJournal('road-commit', restored.journal).get(0,0,0), 'salvaged-crate');
  await assert.rejects(commitWorkbenchBuild(db, 'road', build), /stale/);
});

test('salvage CAS rejection leaves resources and world unchanged', async () => {
  const original = initial();
  const db = { read: async () => structuredClone(original), compareAndSwap: async () => false };
  await assert.rejects(commitRoadSalvage(db, 'road', pickup), /conflict/);
  assert.equal(original.inventory.supplies, 0);
  assert.equal(original.journal.revision, 0);
});

test('salvage false CAS acknowledgement cannot report success', async () => {
  const db = { read: async () => initial(), compareAndSwap: async () => true };
  await assert.rejects(commitRoadSalvage(db, 'road', pickup), /readback mismatch/);
});
