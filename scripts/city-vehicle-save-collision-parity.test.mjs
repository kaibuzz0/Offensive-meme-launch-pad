import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVehicle, createTerrainVehicleClearance, loadVehicle, saveVehicle, stepVehicle
} from '../city-sandbox-vehicles.js';

// A saved vehicle must resume against the current authoritative world, not a
// stale render mesh or the terrain/edit state at the time it was serialized.
test('vehicle save/reload respects subsequent structural edits regardless of visual detail', () => {
  const blocked = new Set();
  const world = { surfaceAt: () => ({height: 0}) };
  const structuralObstructs = (x, y, z) => blocked.has(Math.floor(x) + ',' + Math.floor(z));
  const canOccupy = createTerrainVehicleClearance(world, structuralObstructs);
  const car = createVehicle('car', {x: 0, y: 1, z: 0});
  car.speed = 8;
  const saved = saveVehicle(car);
  blocked.add('0,1');
  for (const visualDetail of ['high', 'low']) {
    const loaded = loadVehicle(saved);
    const result = stepVehicle(loaded, {throttle: 1}, 1/60, {
      canOccupy: (position, body) => {
        void visualDetail;
        return canOccupy(position, body);
      }
    });
    assert.deepEqual(result.position, loaded.position);
    assert.equal(result.heading, loaded.heading);
    assert.equal(result.speed, 0);
  }
  blocked.clear();
  const loaded = loadVehicle(saved);
  const result = stepVehicle(loaded, {throttle: 1}, 1/60, {canOccupy});
  assert.ok(result.position.z > loaded.position.z);
});

test('reloading a vehicle preserves heading, driver and valid fuel without changing world queries', () => {
  const vehicle = createVehicle('truck', {x: -2.5, y: 1, z: -4});
  vehicle.heading = 0.25;
  vehicle.driverId = 'solo-driver';
  vehicle.fuel = 10;
  const reloaded = loadVehicle(saveVehicle(vehicle));
  assert.deepEqual(reloaded, vehicle);
  const world = {surfaceAt: () => ({height: 0})};
  const clearance = createTerrainVehicleClearance(world, () => false);
  assert.equal(clearance(vehicle.position, vehicle), clearance(reloaded.position, reloaded));
});
