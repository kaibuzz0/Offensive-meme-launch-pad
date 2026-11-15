import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { createCommittedBuildOccupancy } from '../city-road-build-occupancy.js';

function saved(seed, edits) {
  const journal = createVoxelEditJournal(seed);
  for (const edit of edits) journal.apply(edit);
  return { version: 1, seed, revision: journal.revision,
    inventory: { supplies: 8 }, journal: journal.snapshot() };
}

test('unloaded and throwing terrain providers fail closed without hiding committed mined air', () => {
  const occupancy = createCommittedBuildOccupancy('fortress');
  occupancy.restore(saved('fortress', [
    { x: 1, y: 2, z: 3, block: null },
    { x: 2, y: 2, z: 3, block: 'workbench' }
  ]));
  let invoked = 0;
  const unavailable = () => { invoked++; throw new Error('chunk not loaded'); };
  assert.equal(occupancy.isSolid(1, 2, 3, unavailable), false);
  assert.equal(occupancy.isSolid(2, 2, 3, unavailable), true);
  assert.equal(invoked, 0, 'committed journal must precede terrain generation');
  assert.equal(occupancy.isSolid(3, 2, 3, unavailable), true);
  assert.equal(occupancy.isSolid(3, 2, 3, () => null), true);
  assert.equal(occupancy.isSolid(3, 2, 3, () => false), false);
});

test('invalid voxel coordinates cannot turn unknown terrain into air', () => {
  const occupancy = createCommittedBuildOccupancy('fortress');
  const provider = () => { throw new Error('must not query invalid coordinates'); };
  for (const coordinate of [NaN, Infinity, -Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(occupancy.isSolid(coordinate, 0, 0, provider), true);
    assert.equal(occupancy.hasEdit(coordinate, 0, 0), false);
    assert.equal(occupancy.hasBlock(coordinate, 0, 0), false);
  }
});
