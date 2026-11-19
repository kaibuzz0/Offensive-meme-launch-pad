import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { createSoloBuildCommands } from '../city-road-build-commands.js';

// Two browser tabs share one durable revision; a stale CAS must never grant
// both tabs the same eight supplies or apply a second voxel edit.
test('competing tabs cannot double-credit one seeded crate', async () => {
  const seed = 'two-tab-road';
  let durable = {
    version: 1, seed, revision: 0, inventory: { supplies: 0 },
    journal: createVoxelEditJournal(seed).snapshot()
  };
  let arrivals = 0;
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  const store = {
    async read() {
      // Force both independent command queues to read the same revision.
      if (arrivals < 2) {
        arrivals++;
        if (arrivals === 2) release();
        await barrier;
      }
      return structuredClone(durable);
    },
    async compareAndSwap(_key, expected, next) {
      if (expected !== durable.revision) return false;
      durable = structuredClone(next);
      return true;
    }
  };
  const crate = () => ({ x: 20, y: 4, z: 20 });
  const a = createSoloBuildCommands(store, 'road', crate);
  const b = createSoloBuildCommands(store, 'road', crate);
  const pose = { x: 5.125, y: 1.125, z: 5.125 };
  const outcomes = await Promise.allSettled([
    a.collectRoadSupplies(pose), b.collectRoadSupplies(pose)
  ]);
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(outcomes.filter(result => result.status === 'rejected').length, 1);
  assert.equal(durable.revision, 1);
  assert.equal(durable.inventory.supplies, 8);
  assert.equal(durable.journal.edits.length, 1);
  assert.deepEqual(await a.read(), await b.read());
});
