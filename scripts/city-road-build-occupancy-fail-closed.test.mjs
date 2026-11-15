import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommittedBuildOccupancy } from '../city-road-build-occupancy.js';

test('unloaded or failing terrain collision provider remains solid', () => {
  const occupancy = createCommittedBuildOccupancy('fortress-seed');
  assert.equal(occupancy.isSolid(0, 0, 0), true);
  assert.equal(occupancy.isSolid(0, 0, 0, () => { throw new Error('chunk unloaded'); }), true);
  assert.equal(occupancy.isSolid(0, 0, 0, () => undefined), true);
  assert.equal(occupancy.isSolid(0, 0, 0, () => false), false);
  assert.equal(occupancy.isSolid(0, 0, 0, () => true), true);
  assert.equal(occupancy.isSolid(NaN, 0, 0, () => false), true);
});
