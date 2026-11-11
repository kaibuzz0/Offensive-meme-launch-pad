import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { createSoloBuildCommands } from '../city-road-build-commands.js';

function fixture() {
  let record = { version: 1, seed: 'road-commands', revision: 0,
    inventory: { supplies: 0 },
    journal: createVoxelEditJournal('road-commands').snapshot() };
  const store = {
    async read() { return structuredClone(record); },
    async compareAndSwap(_key, revision, next) {
      if (record.revision !== revision) return false;
      record = structuredClone(next);
      return true;
    }
  };
  return { store, read: () => structuredClone(record) };
}
const player = { x: 5.125, y: 1.125, z: 5.125 };
const crate = { x: 20, y: 4, z: 20 };

test('queued double pickup credits one crate once, persists marker', async () => {
  const { store, read } = fixture();
  const commands = createSoloBuildCommands(store, 'road', () => crate);
  const results = await Promise.allSettled([
    commands.collectRoadSupplies(player),
    commands.collectRoadSupplies(player)
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter(result => result.status === 'rejected').length, 1);
  assert.equal(read().inventory.supplies, 8);
  assert.equal(read().journal.edits.length, 1);
  const reloaded = createSoloBuildCommands(store, 'road', () => crate);
  assert.equal((await reloaded.read()).inventory.supplies, 8);
  await assert.rejects(reloaded.collectRoadSupplies(player), /already collected/);
});

test('failed compare-and-swap cannot credit supplies or consume crate', async () => {
  const { store, read } = fixture();
  store.compareAndSwap = async () => false;
  const commands = createSoloBuildCommands(store, 'road', () => crate);
  await assert.rejects(commands.collectRoadSupplies(player), /another session/);
  assert.equal(read().inventory.supplies, 0);
  assert.equal(read().journal.edits.length, 0);
});

test('no seeded resolver fails closed without touching saved inventory', async () => {
  const { store, read } = fixture();
  const commands = createSoloBuildCommands(store, 'road');
  await assert.rejects(commands.collectRoadSupplies(player), /resolver required/);
  assert.equal(read().revision, 0);
});
