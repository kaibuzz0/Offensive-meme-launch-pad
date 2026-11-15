import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { commitWorkbenchBuild } from '../city-road-build-commit.js';

const key = 'road-build:cas-failure-seed';
const initial = () => ({
  version: 1, seed: 'cas-failure-seed', revision: 0,
  inventory: { supplies: 8 },
  journal: createVoxelEditJournal('cas-failure-seed').snapshot()
});
const action = () => ({
  kind: 'place-workbench', expectedRevision: 0,
  player: { x: 2, y: 1, z: 2 },
  position: { x: 2, z: 2 }, groundHeight: 1,
  isOccupied: () => false
});

test('failed durable CAS does not debit inventory or publish a voxel edit', async () => {
  for (const failure of ['conflict', 'storage-error']) {
    const persisted = initial();
    const original = structuredClone(persisted);
    let attempts = 0;
    const store = {
      async read(recordKey) {
        assert.equal(recordKey, key);
        return persisted;
      },
      async compareAndSwap(recordKey, expectedRevision, replacement) {
        attempts++;
        assert.equal(recordKey, key);
        assert.equal(expectedRevision, 0);
        assert.equal(replacement.inventory.supplies, 0);
        assert.equal(replacement.journal.edits.length, 1);
        if (failure === 'storage-error') throw new Error('disk transaction aborted');
        return false;
      }
    };
    await assert.rejects(
      commitWorkbenchBuild(store, key, action()),
      failure === 'conflict' ? /building transaction conflict/ : /disk transaction aborted/
    );
    assert.equal(attempts, 1);
    assert.deepEqual(persisted, original);
    assert.equal(persisted.journal.edits.length, 0);
  }
});

test('invalid occupancy rejects before durable CAS', async () => {
  const persisted = initial();
  let attempts = 0;
  const store = {
    async read() { return persisted; },
    async compareAndSwap() { attempts++; return true; }
  };
  await assert.rejects(commitWorkbenchBuild(store, key, {
    ...action(), isOccupied: () => undefined
  }), /occupied voxel/);
  assert.equal(attempts, 0);
  assert.equal(persisted.inventory.supplies, 8);
});
