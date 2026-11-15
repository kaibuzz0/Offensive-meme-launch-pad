import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { createSoloBuildCommands } from '../city-road-build-commands.js';

// Exercise the public command boundary, not isolated reducers: pickup and
// placement must share one revisioned inventory/voxel record.
test('road supplies gather, build and reload from one durable record', async () => {
  const seed = 'command-route-seed';
  const key = 'road-build:' + seed;
  let persisted = {
    version: 1, seed, revision: 0,
    inventory: { supplies: 0 },
    journal: createVoxelEditJournal(seed).snapshot()
  };
  const store = {
    async read(k) {
      assert.equal(k, key);
      return structuredClone(persisted);
    },
    async compareAndSwap(k, revision, next) {
      assert.equal(k, key);
      if (persisted.revision !== revision) return false;
      persisted = structuredClone(next);
      return true;
    }
  };
  const crate = { x: 8, y: 4, z: 8 };
  const commands = createSoloBuildCommands(store, key, () => crate);
  const player = { x: 2.125, y: 1.125, z: 2.125 };
  const collected = await commands.collectRoadSupplies(player);
  assert.equal(collected.inventory.supplies, 8);
  assert.equal(collected.revision, 1);
  await assert.rejects(commands.collectRoadSupplies(player), /already collected/);
  const built = await commands.placeWorkbench({
    player, position: { x: 3, z: 2 }, groundHeight: 1,
    isOccupied: () => false
  });
  assert.equal(built.inventory.supplies, 0);
  assert.equal(built.revision, 2);
  assert.equal(built.journal.edits.length, 2);
  const reloaded = createSoloBuildCommands(store, key, () => crate);
  assert.deepEqual(await reloaded.read(), built);
  await assert.rejects(reloaded.placeWorkbench({
    player, position: { x: 4, z: 2 }, groundHeight: 1,
    isOccupied: () => false
  }), /insufficient supplies/);
  assert.deepEqual(await reloaded.read(), built);
});
