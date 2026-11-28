import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoxelVehicleCollision} from '../city-voxel-vehicle-collision.js';
import {createVehicle, stepVehicle} from '../city-sandbox-vehicles.js';

// The logical roof and constructed wall must remain authoritative when a
// renderer changes detail; changing the saved edit ledger must take effect
// without reconstructing the vehicle controller.
test('interior roof and committed wall remain physical at every render detail', () => {
  let wall = false;
  let ceiling = 2.5;
  const world = {
    surfaceAt: () => ({height: 0}),
    caveRoomAt: () => ({floor: 1, ceiling, exposed: false}),
    gateRoad: {obstructs: () => false},
    editObstructs: () => wall
  };
  const collision = createVoxelVehicleCollision(world, {
    radius: 0.2, halfLength: 0.2, height: 1.4
  });
  const car = createVehicle('car', {x: 0, y: 1, z: 0});
  for (const detail of ['low', 'normal', 'high']) {
    world.detail = detail;
    assert.equal(collision.canOccupy(car.position, car), true);
    ceiling = 2.3;
    assert.equal(collision.canOccupy(car.position, car), false, 'roof must block chassis');
    assert.deepEqual(stepVehicle(car, {throttle: 1}, 1 / 60, collision).position, car.position);
    ceiling = 2.5;
    wall = true;
    assert.equal(collision.canOccupy(car.position, car), false, 'committed wall must block chassis');
    wall = false;
    assert.equal(collision.canOccupy(car.position, car), true);
  }
});
