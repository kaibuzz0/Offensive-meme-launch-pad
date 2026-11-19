import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { createSoloBuildCommands } from '../city-road-build-commands.js';

// A read made while a pickup is pending must never expose a speculative balance.
// Both operations use the same durable record and same-tab command queue.
test('queued read waits for the committed pickup and returns a detached snapshot', async () => {
  const seed = 'road-queue-read';
  let saved = { version: 1, seed, revision: 0, inventory: { supplies: 0 },
    journal: createVoxelEditJournal(seed).snapshot() };
  let releaseCommit;
  const gate = new Promise(resolve => { releaseCommit = resolve; });
  let enteredCommit;
  const entered = new Promise(resolve => { enteredCommit = resolve; });
  const store = {
    async read() { return structuredClone(saved); },
    async compareAndSwap(_key, expected, candidate) {
      enteredCommit();
      await gate;
      if (saved.revision !== expected) return false;
      saved = structuredClone(candidate);
      return true;
    }
  };
  const crate = { x: 20, y: 4, z: 20 };
  const commands = createSoloBuildCommands(store, 'road', () => crate);
  const pickup = commands.collectRoadSupplies({ x: 5.125, y: 1.125, z: 5.125 });
  await entered;
  let readSettled = false;
  const read = commands.read().then(value => { readSettled = true; return value; });
  await Promise.resolve();
  assert.equal(readSettled, false, 'read must wait for the pending commit');
  assert.equal(saved.inventory.supplies, 0, 'no optimistic resource credit');
  releaseCommit();
  const [committed, observed] = await Promise.all([pickup, read]);
  assert.equal(committed.inventory.supplies, 8);
  assert.equal(observed.inventory.supplies, 8);
  assert.equal(observed.revision, 1);
  observed.inventory.supplies = 999;
  observed.journal.edits.length = 0;
  assert.equal(saved.inventory.supplies, 8, 'UI cannot mutate durable inventory');
  assert.equal(saved.journal.edits.length, 1, 'UI cannot mutate durable edits');
});

test('queued read recovers the durable winner after a failed CAS', async () => {
  const seed = 'road-queue-conflict';
  let saved = { version: 1, seed, revision: 0, inventory: { supplies: 0 },
    journal: createVoxelEditJournal(seed).snapshot() };
  const store = {
    async read() { return structuredClone(saved); },
    async compareAndSwap() { return false; }
  };
  const commands = createSoloBuildCommands(store, 'road', () => ({ x: 20, y: 4, z: 20 }));
  const pickup = commands.collectRoadSupplies({ x: 5.125, y: 1.125, z: 5.125 });
  const read = commands.read();
  await assert.rejects(pickup, /another session/);
  const observed = await read;
  assert.equal(observed.revision, 0);
  assert.equal(observed.inventory.supplies, 0);
  assert.equal(observed.journal.edits.length, 0);
});
