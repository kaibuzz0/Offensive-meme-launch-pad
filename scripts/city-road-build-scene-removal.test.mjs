import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { diffCommittedConstruction } from '../city-road-build-scene-projection.js';

function snapshot(revision, edits, supplies = 2) {
  const journal = createVoxelEditJournal('starter');
  for (const edit of edits) journal.apply(edit);
  return { version: 1, seed: 'starter', revision,
    inventory: { supplies }, journal: journal.snapshot() };
}

test('removing a committed block produces one renderer removal without changing inventory', () => {
  const block = { x: 4, y: 2, z: -8, block: 'workbench' };
  const before = snapshot(1, [block]);
  const after = snapshot(2, []);
  const originalBefore = structuredClone(before);
  const originalAfter = structuredClone(after);
  const delta = diffCommittedConstruction(before, after, 'starter');
  assert.equal(delta.remove.length, 1);
  assert.equal(delta.remove[0].id, 'edit:starter:4,2,-8');
  assert.equal(delta.upsert.length, 0);
  assert.equal(delta.supplies, 2);
  assert.deepEqual(before, originalBefore);
  assert.deepEqual(after, originalAfter);
  assert.ok(Object.isFrozen(delta));
  assert.ok(Object.isFrozen(delta.remove));
  assert.ok(Object.isFrozen(delta.remove[0]));
  assert.deepEqual(diffCommittedConstruction(after, after, 'starter').remove, []);
});

test('independent voxel changes reconcile as one removal and one addition', () => {
  const before = snapshot(5, [{ x: 1, y: 0, z: 0, block: 'stone' }]);
  const after = snapshot(6, [{ x: 2, y: 0, z: 0, block: 'workbench' }]);
  const delta = diffCommittedConstruction(before, after, 'starter');
  assert.deepEqual(delta.remove.map(edit => edit.id), ['edit:starter:1,0,0']);
  assert.deepEqual(delta.upsert.map(edit => edit.id), ['edit:starter:2,0,0']);
});
