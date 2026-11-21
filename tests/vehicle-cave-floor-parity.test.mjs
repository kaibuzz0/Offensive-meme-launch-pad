import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelVehicleCollision } from '../city-voxel-vehicle-collision.js';

function world(gallery) {
  return {
    surfaceAt: () => ({ height: 20 }),
    caveRoomAt: () => gallery,
    gateRoad: { obstructs: () => false }
  };
}
const vehicle = { heading: 0 };
const position = (y) => ({ x: 0, y, z: 0 });

test('ground vehicle uses closed gallery floor below the roof', () => {
  const collision = createVoxelVehicleCollision(world({ floor: 5, ceiling: 10, exposed: false }));
  assert.equal(collision.canOccupy(position(5), vehicle), true);
  assert.equal(collision.canOccupy(position(9), vehicle), false, 'roof clearance blocks chassis');
  assert.equal(collision.canOccupy(position(21), vehicle), true, 'surface remains traversable');
});

test('exposed cave mouth uses gallery floor and enforces step height', () => {
  const collision = createVoxelVehicleCollision(world({ floor: 5, ceiling: 10, exposed: true }));
  assert.equal(collision.canOccupy(position(5), vehicle), true);
  assert.equal(collision.canOccupy(position(21), vehicle), false);
});

test('invalid cave geometry fails closed independent of render detail', () => {
  for (const detail of ['low', 'high']) {
    const collision = createVoxelVehicleCollision({ ...world({ floor: NaN, ceiling: 10, exposed: false }), renderDetail: detail });
    assert.equal(collision.canOccupy(position(5), vehicle), false);
  }
});
