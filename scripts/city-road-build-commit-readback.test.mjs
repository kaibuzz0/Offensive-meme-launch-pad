import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { createSoloBuildCommands } from '../city-road-build-commands.js';

function record() {
  return {
    version: 1, seed: 'readback-seed', revision: 0,
    inventory: { supplies: 8 },
    journal: createVoxelEditJournal('readback-seed').snapshot()
  };
}
const placement = {
  player: { x: 2, y: 1, z: 2 },
  position: { x: 2, z: 2 },
  groundHeight: 1,
  isOccupied: () => false
};

test('CAS acknowledgement without persisted edit cannot report a saved build', async () => {
  const original = record();
  const store = {
    async read() { return structuredClone(original); },
    async compareAndSwap() { return true; }
  };
  const commands = createSoloBuildCommands(store, 'road:readback');
  await assert.rejects(commands.placeWorkbench(placement), /construction commit readback mismatch/);
  assert.equal((await commands.read()).inventory.supplies, 8);
  assert.equal((await commands.read()).journal.edits.length, 0);
});

test('readback with corrupted metadata fails closed after CAS', async () => {
  let saved = record();
  const store = {
    async read() { return structuredClone(saved); },
    async compareAndSwap(_key, _revision, next) {
      saved = structuredClone(next);
      saved.journal.revision = 0;
      return true;
    }
  };
  const commands = createSoloBuildCommands(store, 'road:readback');
  await assert.rejects(commands.placeWorkbench(placement), /revision mismatch/);
});
