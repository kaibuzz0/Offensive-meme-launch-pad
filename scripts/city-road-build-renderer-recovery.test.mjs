import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { createCommittedBuildOccupancy } from '../city-road-build-occupancy.js';

function record(seed, edits, supplies = 8) {
  const journal = createVoxelEditJournal(seed);
  for (const edit of edits) journal.apply(edit);
  return { version: 1, seed, revision: journal.revision,
    inventory: { supplies }, journal: journal.snapshot() };
}

test('renderer reset restores committed solids and mined air without querying terrain', () => {
  const occupancy = createCommittedBuildOccupancy('road');
  const committed = record('road', [
    { x: 0, y: 4, z: 2, block: 'workbench' },
    { x: 1, y: 4, z: 2, block: null }
  ]);
  occupancy.restore(committed);
  occupancy.clearPresentation();
  assert.equal(occupancy.revision, -1);
  occupancy.restore(committed);
  const terrain = () => { throw Error('unloaded'); };
  assert.equal(occupancy.isSolid(0, 4, 2, terrain), true);
  assert.equal(occupancy.isSolid(1, 4, 2, terrain), false);
  assert.equal(occupancy.revision, committed.revision);
});

test('failed stale or conflicting restoration cannot partially replace collision state', () => {
  const occupancy = createCommittedBuildOccupancy('road');
  const initial = record('road', [{ x: 3, y: 1, z: 2, block: 'workbench' }]);
  occupancy.restore(initial);
  assert.throws(() => occupancy.restore(record('other', [])), /seed/i);
  assert.throws(() => occupancy.restore(record('road', [])), /stale/i);
  assert.throws(() => occupancy.restore(record('road', [
    { x: 3, y: 1, z: 2, block: 'torch' }
  ])), /conflict/i);
  assert.equal(occupancy.getBlock(3, 1, 2), 'workbench');
  assert.equal(occupancy.revision, initial.revision);
});
