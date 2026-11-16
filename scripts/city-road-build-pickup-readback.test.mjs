import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { createSoloBuildCommands } from '../city-road-build-commands.js';

function initial() {
  return { version: 1, seed: 'pickup-readback', revision: 0,
    inventory: { supplies: 0 },
    journal: createVoxelEditJournal('pickup-readback').snapshot() };
}
const crate = () => ({ x: 0, y: 0, z: 0 });
const player = { x: 0, y: 0, z: 0 };

test('acknowledged but unpersisted pickup cannot report supplies', async () => {
  const original = initial();
  const store = {
    async read() { return structuredClone(original); },
    async compareAndSwap() { return true; }
  };
  const commands = createSoloBuildCommands(store, 'road:pickup', crate);
  await assert.rejects(commands.collectRoadSupplies(player), /collection commit readback mismatch/);
  assert.equal((await commands.read()).inventory.supplies, 0);
});

test('pickup readback rejects a corrupted persisted inventory', async () => {
  let saved = initial();
  const store = {
    async read() { return structuredClone(saved); },
    async compareAndSwap(_key, _revision, next) {
      saved = structuredClone(next);
      saved.inventory.supplies = -1;
      return true;
    }
  };
  const commands = createSoloBuildCommands(store, 'road:pickup', crate);
  await assert.rejects(commands.collectRoadSupplies(player), /invalid|supplies|inventory/i);
});

test('verified pickup survives controller recreation without duplicate rewards', async () => {
  let saved = initial();
  const store = {
    async read() { return structuredClone(saved); },
    async compareAndSwap(_key, revision, next) {
      if (saved.revision !== revision) return false;
      saved = structuredClone(next);
      return true;
    }
  };
  const commands = createSoloBuildCommands(store, 'road:pickup', crate);
  const committed = await commands.collectRoadSupplies(player);
  assert.equal(committed.inventory.supplies, 8);
  const reopened = createSoloBuildCommands(store, 'road:pickup', crate);
  assert.deepEqual(await reopened.read(), saved);
  await assert.rejects(reopened.collectRoadSupplies(player));
  assert.equal(saved.inventory.supplies, 8);
});
