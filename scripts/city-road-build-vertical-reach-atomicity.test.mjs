import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { buildWorkbenchState } from '../city-road-build-transaction.js';

function initial() {
  return {
    version: 1, seed: 'vertical-reach-regression', revision: 0,
    inventory: { supplies: 8 },
    journal: createVoxelEditJournal('vertical-reach-regression').snapshot()
  };
}

test('building across a vertical cliff cannot spend supplies or place a voxel', () => {
  const original = initial();
  const before = structuredClone(original);
  assert.throws(() => buildWorkbenchState(original, {
    kind: 'place-workbench', expectedRevision: 0,
    player: { x: 2, y: 40, z: 2 },
    position: { x: 2, z: 2 }, groundHeight: 1,
    isOccupied: () => false
  }), /out of reach/);
  assert.deepEqual(original, before);
});

test('occupied or unavailable terrain cannot debit supplies', () => {
  for (const occupied of [true, undefined]) {
    const original = initial();
    const before = structuredClone(original);
    assert.throws(() => buildWorkbenchState(original, {
      kind: 'place-workbench', expectedRevision: 0,
      player: { x: 2, y: 1, z: 2 },
      position: { x: 2, z: 2 }, groundHeight: 1,
      isOccupied: () => occupied
    }), /occupied voxel/);
    assert.deepEqual(original, before);
  }
});

test('successful placement spends once; stale replay is rejected', () => {
  const original = initial();
  const action = {
    kind: 'place-workbench', expectedRevision: 0,
    player: { x: 2, y: 1, z: 2 },
    position: { x: 2, z: 2 }, groundHeight: 1,
    isOccupied: () => false
  };
  const committed = buildWorkbenchState(original, action);
  assert.equal(committed.inventory.supplies, 0);
  assert.equal(committed.revision, 1);
  assert.equal(committed.journal.edits.length, 1);
  assert.equal(original.inventory.supplies, 8);
  assert.throws(() => buildWorkbenchState(committed, action), /stale building action/);
});
