import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { createSoloBuildCommands } from '../city-road-build-commands.js';

// Repeated touch/click events may arrive before the first IndexedDB commit.
// They must not produce a second spend or a second edit for the same voxel.
test('simultaneous placement inputs commit one voxel and one supply deduction', async () => {
  let saved = {
    version: 1, seed: 'double-tap', revision: 0,
    inventory: { supplies: 16 },
    journal: createVoxelEditJournal('double-tap').snapshot()
  };
  let commits = 0;
  const store = {
    async read() { return structuredClone(saved); },
    async compareAndSwap(_key, revision, next) {
      if (revision !== saved.revision) return false;
      saved = structuredClone(next);
      commits++;
      return true;
    }
  };
  const commands = createSoloBuildCommands(store, 'double-tap');
  const input = {
    player: { x: 2, y: 1, z: 2 },
    position: { x: 2, z: 2 },
    groundHeight: 1,
    // Even if the world callback has not yet refreshed, the durable journal
    // must reject the already-committed voxel.
    isOccupied: () => false
  };
  const outcomes = await Promise.allSettled([
    commands.placeWorkbench(input),
    commands.placeWorkbench(input)
  ]);
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(outcomes.filter(result => result.status === 'rejected').length, 1);
  assert.equal(commits, 1);
  assert.equal(saved.revision, 1);
  assert.equal(saved.inventory.supplies, 8);
  assert.equal(saved.journal.edits.length, 1);
  assert.deepEqual(await commands.read(), saved);
});
