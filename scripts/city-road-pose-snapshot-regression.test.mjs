import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { createSoloBuildCommands } from '../city-road-build-commands.js';

// Regression: input objects can be mutated by touch handlers while a queued
// IndexedDB command is waiting. The command must use the invocation-time pose.
const seed = 'road-pose-snapshot';
const crate = Object.freeze({ x: 20, y: 4, z: 20 });
function storeFixture() {
  let record = { version: 1, seed, revision: 0,
    inventory: { supplies: 0 }, journal: createVoxelEditJournal(seed).snapshot() };
  let writes = 0;
  return {
    store: {
      async read() { return structuredClone(record); },
      async compareAndSwap(_key, revision, next) {
        writes++;
        if (record.revision !== revision) return false;
        record = structuredClone(next);
        return true;
      }
    },
    snapshot: () => structuredClone(record),
    writes: () => writes
  };
}

test('queued pickup cannot become reachable after caller mutates a faraway pose', async () => {
  const { store, snapshot, writes } = storeFixture();
  const commands = createSoloBuildCommands(store, 'road', () => crate);
  const pose = { x: 999, y: 999, z: 999 };
  const pending = commands.collectRoadSupplies(pose);
  pose.x = 5.125; pose.y = 1.125; pose.z = 5.125;
  await assert.rejects(pending, /out of reach/);
  assert.equal(writes(), 0);
  assert.equal(snapshot().inventory.supplies, 0);
  assert.equal(snapshot().journal.edits.length, 0);
});

test('queued pickup retains reachable invocation pose despite later UI movement', async () => {
  const { store, snapshot, writes } = storeFixture();
  const commands = createSoloBuildCommands(store, 'road', () => crate);
  const pose = { x: 5.125, y: 1.125, z: 5.125 };
  const pending = commands.collectRoadSupplies(pose);
  pose.x = 999; pose.y = 999; pose.z = 999;
  const committed = await pending;
  assert.equal(committed.inventory.supplies, 8);
  assert.equal(snapshot().inventory.supplies, 8);
  assert.equal(writes(), 1);
  assert.equal(snapshot().journal.edits.length, 1);
});
