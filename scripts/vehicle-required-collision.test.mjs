import test from 'node:test';
import assert from 'node:assert/strict';
import { createVehicle, stepVehicle } from '../city-sandbox-vehicles.js';

test('canonical vehicle collision requirement fails closed when adapter is absent', () => {
  const vehicle = createVehicle('car');
  const before = structuredClone(vehicle);
  for (const canOccupy of [undefined, null, false, 0, '']) {
    const environment = { requireCollision: true };
    if (canOccupy !== undefined) environment.canOccupy = canOccupy;
    assert.throws(() => stepVehicle(vehicle, { throttle: 1 }, 1 / 60, environment), TypeError);
    assert.deepEqual(vehicle, before);
  }
});

test('canonical collision requirement accepts a boolean occupancy adapter', () => {
  const vehicle = createVehicle('car');
  let calls = 0;
  const next = stepVehicle(vehicle, { throttle: 1 }, 1 / 60, {
    requireCollision: true,
    canOccupy() { calls++; return true; }
  });
  assert.ok(calls > 0);
  assert.ok(next.position.z > vehicle.position.z);
});

test('canonical collision requirement blocks movement through solid world geometry', () => {
  const vehicle = createVehicle('car');
  const next = stepVehicle(vehicle, { throttle: 1 }, 1 / 60, {
    requireCollision: true,
    canOccupy() { return false; }
  });
  assert.deepEqual(next.position, vehicle.position);
  assert.equal(next.speed, 0);
});
