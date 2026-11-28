import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoxelVehicleCollision} from '../city-voxel-vehicle-collision.js';
import {createVehicle, stepVehicle} from '../city-sandbox-vehicles.js';

test('committed wall removal restores vehicle travel without rebuilding collision or changing render detail', () => {
  const edits = new Set();
  const world = {
    surfaceAt: () => ({height: 0}),
    gateRoad: {obstructs: () => false},
    editObstructs: (x, y, z, height) =>
      edits.has(`${Math.floor(x)},${Math.floor(z)}`) && y < 2 && y + height > 1
  };
  const collision = createVoxelVehicleCollision(world);
  const start = createVehicle('car', {x: 0, y: 1, z: 0});
  const blockedCell = '0,1';
  edits.add(blockedCell);
  assert.equal(collision.canOccupy(start.position, start), false,
    'the vehicle footprint must detect the committed wall');
  for (const detail of ['low', 'normal', 'high']) {
    world.detail = detail;
    const stopped = stepVehicle(start, {throttle: 1}, 1 / 60, collision);
    assert.deepEqual(stopped.position, start.position,
      `committed collision must block movement at ${detail} detail`);
  }
  edits.delete(blockedCell);
  assert.equal(collision.canOccupy(start.position, start), true,
    'the same adapter must observe removal immediately');
  const moved = stepVehicle(start, {throttle: 1}, 1 / 60, collision);
  assert.ok(moved.position.z > start.position.z,
    'vehicle should move once the committed obstruction is removed');
});
