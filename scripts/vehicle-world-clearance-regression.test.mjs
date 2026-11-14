import test from 'node:test';
import assert from 'node:assert/strict';
import { createTerrainVehicleClearance, createVehicle, stepVehicle } from '../city-sandbox-vehicles.js';

const ground = { surfaceAt: () => ({ height: -1 }) };
const vehicle = () => createVehicle('car', { x: 0, y: 0, z: 0 });

test('quarter-meter interior obstruction blocks a chassis even if its corners are clear', () => {
  const occupied = createTerrainVehicleClearance(ground, (x, y, z) =>
    Math.abs(x) < 0.11 && Math.abs(z) < 0.11);
  assert.equal(occupied(vehicle().position, vehicle()), false);
});

test('structural edit removal is visible on the next clearance query', () => {
  const edits = new Set(['0:0']);
  const occupied = createTerrainVehicleClearance(ground, (x, y, z) =>
    edits.has(`${Math.round(x)}:${Math.round(z)}`));
  const v = vehicle();
  assert.equal(occupied(v.position, v), false);
  edits.clear();
  assert.equal(occupied(v.position, v), true);
});

test('unknown structural clearance fails closed instead of treating it as empty', () => {
  const occupied = createTerrainVehicleClearance(ground, () => undefined);
  assert.equal(occupied(vehicle().position, vehicle()), false);
});

test('blocked vehicle sweep retains position and heading after a steering attempt', () => {
  const v = vehicle();
  const blocked = createTerrainVehicleClearance(ground, () => true);
  const next = stepVehicle(v, { throttle: 1, steering: 1 }, 1 / 60, { canOccupy: blocked });
  assert.deepEqual(next.position, v.position);
  assert.equal(next.heading, v.heading);
  assert.equal(next.speed, 0);
});

test('collision decisions are independent of cosmetic renderer detail', () => {
  const occupied = createTerrainVehicleClearance(ground, (x, y, z) => z > 0.7 && z < 0.9);
  const v = vehicle();
  assert.equal(occupied(v.position, { ...v, visualLOD: 'high' }), false);
  assert.equal(occupied(v.position, { ...v, visualLOD: 'low' }), false);
});
