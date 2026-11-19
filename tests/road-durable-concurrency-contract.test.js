import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { commitRoadSalvage, commitWorkbenchBuild } from '../city-road-build-commit.js';

const clone = value => structuredClone(value);
const seed = 'durable-conflict-fixture';
const initial = () => ({
  version: 1, seed, revision: 0, inventory: { supplies: 0 },
  journal: createVoxelEditJournal(seed).snapshot()
});
const pose = { x: .125, y: .125, z: .125 };
const crate = { x: 0, y: 0, z: 0 };
function storeFor(initialRecord) {
  let saved = clone(initialRecord);
  return {
    async read() { return clone(saved); },
    async compareAndSwap(_key, expected, next) {
      if (saved.revision !== expected) return false;
      saved = clone(next);
      return true;
    },
    snapshot() { return clone(saved); }
  };
}

test('durable gather/build uses one record and reload does not double-spend', async () => {
  const store = storeFor(initial());
  const gathered = await commitRoadSalvage(store, 'player', {
    expectedRevision: 0, player: pose, crate
  });
  assert.equal(gathered.inventory.supplies, 8);
  const built = await commitWorkbenchBuild(store, 'player', {
    kind: 'place-workbench', expectedRevision: 1,
    player: { x: 1, y: 0, z: 1 },
    position: { x: 1, z: 1 }, groundHeight: 0,
    isOccupied: () => false
  });
  assert.equal(built.inventory.supplies, 0);
  assert.equal(built.revision, 2);
  const reloaded = JSON.parse(JSON.stringify(store.snapshot()));
  assert.deepEqual(reloaded, built);
  await assert.rejects(commitRoadSalvage(store, 'player', {
    expectedRevision: 0, player: pose, crate
  }), /stale salvage action/);
  assert.deepEqual(store.snapshot(), reloaded);
});

test('competing stale builder cannot spend supplies or overwrite winner', async () => {
  const store = storeFor(initial());
  await commitRoadSalvage(store, 'player', { expectedRevision: 0, player: pose, crate });
  const action = {
    kind: 'place-workbench', expectedRevision: 1,
    player: { x: 1, y: 0, z: 1 },
    position: { x: 1, z: 1 }, groundHeight: 0,
    isOccupied: () => false
  };
  await commitWorkbenchBuild(store, 'player', action);
  const winner = store.snapshot();
  await assert.rejects(commitWorkbenchBuild(store, 'player', {
    ...action, position: { x: 2, z: 1 }
  }), /stale building action/);
  assert.deepEqual(store.snapshot(), winner);
});
