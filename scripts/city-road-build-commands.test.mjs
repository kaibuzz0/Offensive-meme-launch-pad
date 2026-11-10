import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { createSoloBuildCommands } from '../city-road-build-commands.js';

// In-memory transactional stand-in: tests command/reducer integration, not IDB durability.
function fixture(supplies = 16) {
  let saved = {
    version: 1, seed: 'road-command-seed', revision: 0,
    inventory: { supplies },
    journal: createVoxelEditJournal('road-command-seed').snapshot()
  };
  const store = {
    async read() { return structuredClone(saved); },
    async compareAndSwap(_key, revision, next) {
      if (saved.revision !== revision) return false;
      saved = structuredClone(next);
      return true;
    }
  };
  return { store, snapshot: () => structuredClone(saved) };
}
const action = (x = 2) => ({
  player: { x: 2, y: 1, z: 2 },
  position: { x, z: 2 },
  groundHeight: 1,
  isOccupied: () => false
});
test('committed workbench spends eight supplies and survives controller recreation', async () => {
  const { store, snapshot } = fixture();
  const commands = createSoloBuildCommands(store, 'road:solo');
  const placed = await commands.placeWorkbench(action());
  assert.equal(placed.inventory.supplies, 8);
  assert.equal(placed.revision, 1);
  assert.equal(placed.journal.revision, 1);
  assert.equal(placed.journal.edits.length, 1);
  const reopened = createSoloBuildCommands(store, 'road:solo');
  assert.deepEqual(await reopened.read(), snapshot());
});
test('same-cell duplicate placement never spends a second time', async () => {
  const { store, snapshot } = fixture();
  const commands = createSoloBuildCommands(store, 'road:solo');
  await commands.placeWorkbench(action());
  const before = snapshot();
  await assert.rejects(commands.placeWorkbench(action()), /occupied voxel/);
  assert.deepEqual(snapshot(), before);
});
test('failed reach and insufficient supplies leave inventory and edits unchanged', async () => {
  const limited = fixture(7);
  const limitedCommands = createSoloBuildCommands(limited.store, 'road:solo');
  await assert.rejects(limitedCommands.placeWorkbench(action()), /insufficient supplies/);
  assert.equal(limited.snapshot().revision, 0);
  const far = fixture();
  const farCommands = createSoloBuildCommands(far.store, 'road:solo');
  await assert.rejects(farCommands.placeWorkbench({
    ...action(), player: { x: 100, y: 1, z: 100 }
  }), /out of reach/);
  assert.equal(far.snapshot().inventory.supplies, 16);
  assert.equal(far.snapshot().journal.edits.length, 0);
});
test('concurrent controllers reject stale write without double spending', async () => {
  const { store, snapshot } = fixture();
  const a = createSoloBuildCommands(store, 'road:solo');
  const b = createSoloBuildCommands(store, 'road:solo');
  const results = await Promise.allSettled([
    a.placeWorkbench(action(2)),
    b.placeWorkbench(action(3))
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(snapshot().inventory.supplies, 8);
  assert.equal(snapshot().journal.edits.length, 1);
});
