import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { createSoloBuildCommands } from '../city-road-build-commands.js';

function initial() {
  return {
    version: 1, seed: 'queue-race', revision: 0,
    inventory: { supplies: 16 },
    journal: createVoxelEditJournal('queue-race').snapshot()
  };
}

test('placement captures caller coordinates before an asynchronous storage read', async () => {
  let saved = initial();
  let releaseRead;
  const blocked = new Promise(resolve => { releaseRead = resolve; });
  let started;
  const reading = new Promise(resolve => { started = resolve; });
  const store = {
    async read() { started(); await blocked; return structuredClone(saved); },
    async compareAndSwap(_key, revision, next) {
      assert.equal(revision, saved.revision);
      saved = structuredClone(next);
      return true;
    }
  };
  const commands = createSoloBuildCommands(store, 'queue-race');
  const input = {
    player: { x: 2, y: 1, z: 2 },
    position: { x: 2, z: 2 },
    groundHeight: 1,
    isOccupied: () => false
  };
  const placing = commands.placeWorkbench(input);
  await reading;
  input.player.x = 999;
  input.position.x = 999;
  input.groundHeight = 999;
  releaseRead();
  const committed = await placing;
  assert.equal(committed.revision, 1);
  assert.equal(committed.inventory.supplies, 8);
  assert.equal(saved.journal.edits.length, 1);
});

test('failed cross-session CAS never exposes uncommitted inventory or voxel edits', async () => {
  const saved = initial();
  let attempts = 0;
  const store = {
    async read() { return structuredClone(saved); },
    async compareAndSwap() { attempts++; return false; }
  };
  const commands = createSoloBuildCommands(store, 'queue-race');
  await assert.rejects(commands.placeWorkbench({
    player: { x: 2, y: 1, z: 2 },
    position: { x: 2, z: 2 },
    groundHeight: 1,
    isOccupied: () => false
  }), /changed in another session/);
  assert.equal(attempts, 1);
  assert.equal(saved.revision, 0);
  assert.equal(saved.inventory.supplies, 16);
  assert.equal(saved.journal.edits.length, 0);
});
