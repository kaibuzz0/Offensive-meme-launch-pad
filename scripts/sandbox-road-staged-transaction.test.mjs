import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { buildWorkbenchState } from '../city-road-build-transaction.js';

const seed = 'road-build-atomic-preview-test';
function initial() {
  return {
    version: 1, seed, revision: 0,
    inventory: { supplies: 16 },
    journal: createVoxelEditJournal(seed).snapshot()
  };
}
function action(expectedRevision = 0, isOccupied = () => false) {
  return {
    kind: 'place-workbench', expectedRevision,
    player: { x: 0, y: 0.5, z: 0 },
    position: { x: 1, z: 1 }, groundHeight: 0,
    isOccupied
  };
}

test('workbench returns one inventory-and-voxel candidate without touching source', () => {
  const original = initial();
  const before = JSON.stringify(original);
  const next = buildWorkbenchState(original, action());
  assert.equal(JSON.stringify(original), before);
  assert.equal(next.inventory.supplies, 8);
  assert.equal(next.revision, 1);
  assert.equal(next.journal.revision, 1);
  assert.equal(next.journal.edits.length, 1);
  assert.equal(next.journal.edits[0].block, 'workbench');
  assert.equal(createVoxelEditJournal(seed, next.journal).size, 1);
  assert.throws(() => buildWorkbenchState(next, action(0)), /stale building action/);
});

test('occupancy failure and insufficient resources cannot debit inventory or edit voxels', () => {
  const original = initial();
  const before = JSON.stringify(original);
  assert.throws(() => buildWorkbenchState(original, action(0, () => true)), /occupied voxel/);
  assert.equal(JSON.stringify(original), before);
  const empty = { ...original, inventory: { supplies: 7 } };
  assert.throws(() => buildWorkbenchState(empty, action()), /insufficient supplies/);
  assert.equal(JSON.stringify(empty.journal), JSON.stringify(original.journal));
});

test('a candidate can be serialized and restored without a second spend', () => {
  const saved = JSON.parse(JSON.stringify(buildWorkbenchState(initial(), action())));
  assert.equal(saved.inventory.supplies, 8);
  assert.equal(createVoxelEditJournal(seed, saved.journal).get(4, 1, 4), 'workbench');
  assert.throws(() => buildWorkbenchState(saved, action(0)), /stale building action/);
});
