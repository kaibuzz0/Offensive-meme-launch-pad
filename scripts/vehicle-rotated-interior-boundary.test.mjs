import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoxelVehicleCollision} from '../city-voxel-vehicle-collision.js';
import {createVehicle, stepVehicle} from '../city-sandbox-vehicles.js';

// The same logical footprint must detect a roof or committed wall at a
// neighboring column even when the chassis center is unobstructed.
test('rotated vehicle checks adjacent interior headroom and live edits across LOD', () => {
  const blocked = new Set();
  const world = {
    surfaceAt: () => ({height: 0}),
    caveRoomAt: (x, z) => ({floor: 1, ceiling: x < 0 ? 2 : 4, exposed: false}),
    gateRoad: {obstructs: () => false},
    editObstructs: (x, y, z, height) =>
      blocked.has(`${Math.floor(x)},${Math.floor(z)}`) && y < 2 && y + height > 1
  };
  const collision = createVoxelVehicleCollision(world, {
    radius: 0.3, halfLength: 1.2, height: 1.5, maxStep: 0.5
  });
  const car = createVehicle('car', {x: 0.2, y: 1, z: 0.2});
  for (const detail of ['low', 'normal', 'high']) {
    world.detail = detail;
    car.heading = Math.PI / 2;
    assert.equal(collision.canOccupy(car.position, car), false,
      'rotated chassis reaches the neighboring low-ceiling column');
    car.heading = 0;
    // Shift the chassis clear of the roof boundary.
    const clear = {...car.position, x: 2};
    assert.equal(collision.canOccupy(clear, car), true);
    blocked.add('2,1');
    assert.equal(collision.canOccupy(clear, car), false,
      'committed adjacent-column edit must block without adapter rebuild');
    assert.deepEqual(stepVehicle({...car, position: clear}, {throttle: 1}, 1 / 60, collision).position, clear);
    blocked.clear();
    assert.equal(collision.canOccupy(clear, car), true);
  }
});
