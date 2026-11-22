import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelVehicleCollision } from '../city-voxel-vehicle-collision.js';

test('vehicle occupancy samples intermediate chassis sections across narrow barriers', () => {
  const queries = [];
  const world = {
    surfaceAt: () => ({ height: -1 }),
    gateRoad: { obstructs(x, y, z) {
      queries.push({ x, y, z });
      return z > 1 && z < 1.5;
    } },
  };
  const adapter = createVoxelVehicleCollision(world, { halfLength: 2.4, radius: 1.2 });
  assert.equal(adapter.canOccupy({ x: 0, y: 0, z: 0 }, { heading: 0 }), false);
  assert.ok(queries.some(({ z }) => z > 1 && z < 1.5));
});

test('vehicle occupancy remains independent of renderer detail', () => {
  const world = {
    surfaceAt: () => ({ height: -1 }),
    gateRoad: { obstructs: () => false },
  };
  const adapter = createVoxelVehicleCollision(world);
  const position = { x: 0, y: 0, z: 0 };
  assert.equal(adapter.canOccupy(position, { heading: 0, detail: 'low' }), true);
  assert.equal(adapter.canOccupy(position, { heading: 0, detail: 'high' }), true);
});
