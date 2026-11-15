import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { createCommittedBuildOccupancy } from '../city-road-build-occupancy.js';

function record(seed, edits) {
  const journal = createVoxelEditJournal(seed);
  for (const edit of edits) journal.apply(edit);
  return {
    version: 1, seed, revision: journal.revision,
    inventory: { supplies: 8 }, journal: journal.snapshot()
  };
}

test('committed solid voxels and mined air have distinct occupancy', () => {
  const index = createCommittedBuildOccupancy('fortress');
  index.restore(record('fortress', [
    { x: 4, y: 2, z: -3, block: 'workbench' },
    { x: 5, y: 2, z: -3, block: null }
  ]));
  assert.equal(index.hasBlock(4, 2, -3), true);
  assert.equal(index.getBlock(4, 2, -3), 'workbench');
  assert.equal(index.hasBlock(5, 2, -3), false);
  assert.equal(index.getBlock(5, 2, -3), null);
  assert.equal(index.hasBlock(6, 2, -3), false);
});

test('seed mismatch, stale and conflicting records never partially change occupancy', () => {
  const index = createCommittedBuildOccupancy('fortress');
  const first = record('fortress', [{ x: 1, y: 1, z: 1, block: 'workbench' }]);
  index.restore(first);
  assert.throws(() => index.restore(record('other', [])), /seed mismatch/);
  assert.throws(() => index.restore(record('fortress', [])), /stale/);
  assert.throws(() => index.restore(record('fortress', [
    { x: 2, y: 1, z: 1, block: 'workbench' }
  ])), /conflicting/);
  assert.equal(index.hasBlock(1, 1, 1), true);
  assert.equal(index.hasBlock(2, 1, 1), false);
});

test('replay and presentation reset do not mutate saved record', () => {
  const index = createCommittedBuildOccupancy('fortress');
  const saved = record('fortress', [{ x: 0, y: 0, z: 0, block: 'workbench' }]);
  index.restore(saved);
  index.restore(saved);
  index.clearPresentation();
  assert.equal(index.hasBlock(0, 0, 0), false);
  index.restore(saved);
  assert.equal(index.hasBlock(0, 0, 0), true);
  assert.equal(saved.inventory.supplies, 8);
});

test('effective collision combines seeded terrain and committed edits without trusting unknown cells', () => {
  const index = createCommittedBuildOccupancy('fortress');
  index.restore(record('fortress', [
    { x: 2, y: 1, z: 0, block: null },
    { x: 3, y: 1, z: 0, block: 'workbench' }
  ]));
  let calls = 0;
  const generated = () => { calls++; return true; };
  assert.equal(index.isSolid(2, 1, 0, generated), false);
  assert.equal(index.isSolid(3, 1, 0, generated), true);
  assert.equal(calls, 0, 'journal edits override generator queries');
  assert.equal(index.isSolid(4, 1, 0, () => false), false);
  assert.equal(index.isSolid(4, 1, 0, generated), true);
  assert.equal(index.isSolid(4, 1, 0, () => undefined), true);
  assert.equal(index.isSolid(4, 1, 0), true);
  assert.equal(index.isSolid(0.25, 1, 0, () => false), true);
  index.clearPresentation();
  assert.equal(index.isSolid(2, 1, 0, generated), true);
});
