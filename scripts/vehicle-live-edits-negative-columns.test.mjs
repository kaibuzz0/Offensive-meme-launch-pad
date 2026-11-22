import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoxelVehicleCollision} from '../city-voxel-vehicle-collision.js';
import {createVehicle, stepVehicle, saveVehicle, loadVehicle} from '../city-sandbox-vehicles.js';

// Regression: edits in negative coordinates must use floor-based voxel columns,
// remain authoritative after ledger replacement, and ignore visual LOD.
test('negative-column edits survive ledger replacement and vehicle save/restore', () => {
  let occupied = new Set();
  const world = {
    surfaceAt: () => ({height: 0}),
    gateRoad: {obstructs: () => false},
    editObstructs: (x, y, z, h) =>
      occupied.has(`${Math.floor(x)},${Math.floor(z)}`) && y < 2 && y + h > 1
  };
  const adapter = createVoxelVehicleCollision(world, {radius: 0.2, halfLength: 0.2});
  const initial = createVehicle('car', {x: -0.2, y: 1, z: -0.2});
  assert.equal(adapter.canOccupy(initial.position, initial), true);

  occupied.add('-1,-1');
  for (const detail of ['low', 'normal', 'high']) {
    world.detail = detail;
    assert.equal(adapter.canOccupy(initial.position, initial), false);
    const stopped = stepVehicle(initial, {throttle: 1}, 1 / 60, adapter);
    assert.deepEqual(stopped.position, initial.position);
  }

  const restored = loadVehicle(saveVehicle(initial));
  occupied = new Set();
  world.editObstructs = (x, y, z, h) =>
    occupied.has(`${Math.floor(x)},${Math.floor(z)}`) && y < 2 && y + h > 1;
  assert.equal(adapter.canOccupy(restored.position, restored), true);
  occupied.add('-1,-1');
  assert.equal(adapter.canOccupy(restored.position, restored), false);
  occupied.delete('-1,-1');
  assert.equal(adapter.canOccupy(restored.position, restored), true);
});
