import test from 'node:test';
import assert from 'node:assert/strict';
import {createVehicle, createTerrainVehicleClearance, stepVehicle} from '../city-sandbox-vehicles.js';

// The shared world collision query must fail closed for unloaded or invalid
// chunks, including after a previously successful probe at the same location.
test('vehicle clearance does not cache missing chunks or stale structural edits', () => {
  let loaded = true;
  let blocked = false;
  const world = {surfaceAt: () => loaded ? {height: 0} : null};
  const clearance = createTerrainVehicleClearance(world, () => blocked);
  const car = createVehicle('car', {x: 0, y: 1, z: 0});
  assert.equal(clearance(car.position, car), true);
  blocked = true;
  assert.equal(clearance(car.position, car), false);
  blocked = false;
  loaded = false;
  assert.equal(clearance(car.position, car), false);
  loaded = true;
  assert.equal(clearance(car.position, car), true);
});

test('unknown structure queries stop vehicle without changing heading or position', () => {
  const world = {surfaceAt: () => ({height: 0})};
  const clearance = createTerrainVehicleClearance(world, () => undefined);
  const car = createVehicle('car', {x: 0, y: 1, z: 0});
  car.speed = 8;
  car.heading = 0.3;
  const next = stepVehicle(car, {throttle: 1, steering: 1}, 1 / 60, {canOccupy: clearance});
  assert.deepEqual(next.position, car.position);
  // loadVehicle normalizes angles through atan2(sin, cos), so equivalent
  // headings can differ by one floating-point ULP after a blocked step.
  assert.ok(Math.abs(next.heading - car.heading) < 1e-12);
  assert.equal(next.speed, 0);
});

test('structural query failures cannot allow passage through interiors', () => {
  const world = {surfaceAt: () => ({height: 0})};
  const clearance = createTerrainVehicleClearance(world, () => {throw new Error('chunk pending');});
  const car = createVehicle('truck', {x: -4, y: 1, z: -3});
  assert.equal(clearance(car.position, car), false);
});
