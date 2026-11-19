import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { commitWorkbenchBuild } from '../city-road-build-commit.js';

const seed = 'durable-readback-seed';
const fresh = () => ({
  version: 1, seed, revision: 0, inventory: { supplies: 8 },
  journal: createVoxelEditJournal(seed).snapshot()
});
const action = {
  kind: 'place-workbench', expectedRevision: 0,
  player: { x: 2, y: 1, z: 2 }, position: { x: 2, z: 2 },
  groundHeight: 1, isOccupied: () => false
};

test('CAS acknowledgement without persistence cannot report construction success', async () => {
  const original = fresh();
  const store = {
    async read() { return structuredClone(original); },
    async compareAndSwap() { return true; }
  };
  await assert.rejects(
    commitWorkbenchBuild(store, 'road:readback', action),
    /building commit readback mismatch/
  );
  assert.deepEqual(await store.read(), original);
});

test('same revision with wrong inventory or voxel content fails readback', async () => {
  let saved = fresh();
  const store = {
    async read() { return structuredClone(saved); },
    async compareAndSwap(_key, _revision, next) {
      saved = structuredClone(next);
      saved.inventory.supplies += 1;
      return true;
    }
  };
  await assert.rejects(
    commitWorkbenchBuild(store, 'road:readback', action),
    /building commit readback mismatch/
  );
});

test('verified durable winner is detached from subsequent caller mutations', async () => {
  let saved = fresh();
  const store = {
    async read() { return structuredClone(saved); },
    async compareAndSwap(_key, _revision, next) {
      saved = structuredClone(next);
      return true;
    }
  };
  const result = await commitWorkbenchBuild(store, 'road:readback', action);
  assert.equal(result.inventory.supplies, 0);
  assert.equal(result.journal.edits.length, 1);
  result.inventory.supplies = 999;
  result.journal.edits[0].block = 'air';
  assert.equal(saved.inventory.supplies, 0);
  assert.equal(saved.journal.edits[0].block, 'workbench');
});
