import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { createSoloBuildCommands } from '../city-road-build-commands.js';

// A mined-air journal edit does not imply that the generated world is empty.
// The effective-world occupancy query is required for every placement.
function setup(isOccupied) {
  let saved = {
    version: 1, seed: 'effective-occupancy', revision: 0,
    inventory: { supplies: 16 },
    journal: createVoxelEditJournal('effective-occupancy').snapshot()
  };
  const store = {
    async read() { return structuredClone(saved); },
    async compareAndSwap(_key, revision, next) {
      if (revision !== saved.revision) return false;
      saved = structuredClone(next);
      return true;
    }
  };
  const command = createSoloBuildCommands(store, 'effective-occupancy');
  const input = {
    player: { x: 2, y: 1, z: 2 },
    position: { x: 2, z: 2 },
    groundHeight: 1,
    isOccupied
  };
  return { command, input, snapshot: () => structuredClone(saved) };
}

test('generated terrain occupancy prevents spending and journal mutation', async () => {
  const { command, input, snapshot } = setup(() => true);
  await assert.rejects(command.placeWorkbench(input), /occupied voxel/);
  assert.equal(snapshot().revision, 0);
  assert.equal(snapshot().inventory.supplies, 16);
  assert.equal(snapshot().journal.edits.length, 0);
});

test('unknown occupancy is fail-closed rather than treated as empty', async () => {
  for (const value of [undefined, null, 0, 1, 'empty', {}]) {
    const { command, input, snapshot } = setup(() => value);
    await assert.rejects(command.placeWorkbench(input), /occupied voxel/);
    assert.equal(snapshot().inventory.supplies, 16);
    assert.equal(snapshot().journal.edits.length, 0);
  }
});

test('explicit empty cell commits once and persists after controller recreation', async () => {
  const { command, input, snapshot } = setup(() => false);
  const result = await command.placeWorkbench(input);
  assert.equal(result.revision, 1);
  assert.equal(result.inventory.supplies, 8);
  assert.equal(result.journal.edits.length, 1);
  assert.deepEqual(await command.read(), snapshot());
  await assert.rejects(command.placeWorkbench(input), /occupied voxel/);
  assert.equal(snapshot().inventory.supplies, 8);
});
