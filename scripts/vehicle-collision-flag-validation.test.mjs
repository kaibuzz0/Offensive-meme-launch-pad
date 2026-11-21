import test from 'node:test';
import assert from 'node:assert/strict';
import {createVehicle, stepVehicle} from '../city-sandbox-vehicles.js';

test('required collision flag rejects non-boolean configuration', () => {
  const initial = createVehicle('car');
  for (const value of [null, 0, 1, '', 'false', {}, []]) {
    assert.throws(() => stepVehicle(initial, {throttle: 1}, 1/60, {requireCollision: value}),
      {name: 'TypeError', message: 'requireCollision must be a boolean'});
  }
  assert.equal(initial.speed, 0);
});

test('explicitly required collision cannot be bypassed without a world adapter', () => {
  const initial = createVehicle('car');
  assert.throws(() => stepVehicle(initial, {throttle: 1}, 1/60, {requireCollision: true}),
    {name: 'TypeError', message: 'A canonical world collision adapter is required'});
  const next = stepVehicle(initial, {throttle: 1}, 1/60, {
    requireCollision: true, canOccupy: () => false
  });
  assert.deepEqual(next.position, initial.position);
  assert.equal(next.speed, 0);
});
