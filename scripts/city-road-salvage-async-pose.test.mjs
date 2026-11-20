import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { commitRoadSalvage } from '../city-road-build-commit.js';

test('pending salvage captures crate and player coordinates before async read', async () => {
  let saved = {
    version: 1, seed: 'salvage-pose-race', revision: 0,
    inventory: { supplies: 0 },
    journal: createVoxelEditJournal('salvage-pose-race').snapshot()
  };
  let releaseRead;
  const blocked = new Promise(resolve => { releaseRead = resolve; });
  let signalRead;
  const reading = new Promise(resolve => { signalRead = resolve; });
  const store = {
    async read() {
      signalRead();
      await blocked;
      return structuredClone(saved);
    },
    async compareAndSwap(_key, revision, next) {
      if (saved.revision !== revision) return false;
      saved = structuredClone(next);
      return true;
    }
  };
  const action = {
    expectedRevision: 0,
    player: { x: 0.125, y: 0.125, z: 0.125 },
    crate: { x: 0, y: 0, z: 0 }
  };
  const pending = commitRoadSalvage(store, 'salvage-pose-race', action);
  await reading;
  action.player.x = 999;
  action.crate.x = 999;
  action.expectedRevision = 99;
  releaseRead();
  const committed = await pending;
  assert.equal(committed.revision, 1);
  assert.equal(committed.inventory.supplies, 8);
  assert.equal(committed.journal.edits.length, 1);
  assert.deepEqual(committed.journal.edits[0], {
    x: 0, y: 0, z: 0, block: 'salvaged-crate'
  });
  assert.deepEqual(saved, committed);
});
