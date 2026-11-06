import test from 'node:test';
import assert from 'node:assert/strict';
import { createAircraftState, stepAircraft, serializeAircraft, restoreAircraft } from '../city-sandbox-flight.js';
const run = (state, input, seconds) => {
  for (let i = 0; i < seconds * 60; i++) state = stepAircraft(state, input, 1 / 60);
  return state;
};
test('idle aircraft remains on runway', () => {
  const s = run(createAircraftState(), {}, 3);
  assert.equal(s.position.y, 0);
  assert.equal(s.speed, 0);
  assert.equal(s.grounded, true);
});
test('throttle accelerates aircraft along heading', () => {
  const s = run(createAircraftState(), { throttle: 1 }, 5);
  assert.ok(s.speed > 0);
  assert.ok(s.position.z > 0);
});
test('flight and ceiling remain bounded', () => {
  const s = run(createAircraftState(), { throttle: 1, pitch: 0.25 }, 15);
  assert.ok(s.position.y >= 0 && s.position.y <= 3000);
  assert.ok(Number.isFinite(s.position.z));
});
test('fixed-step matches split timesteps', () => {
  const s = createAircraftState({ speed: 30, position: { x: 1, y: 100, z: 2 }, grounded: false });
  const c = { throttle: 0.7, roll: 0.2 };
  const a = stepAircraft(s, c, 1 / 30);
  const b = stepAircraft(stepAircraft(s, c, 1 / 60), c, 1 / 60);
  for (const key of ['speed', 'heading', 'pitch', 'roll', 'verticalSpeed'])
    assert.ok(Math.abs(a[key] - b[key]) < 1e-9, key);
  for (const key of ['x', 'y', 'z'])
    assert.ok(Math.abs(a.position[key] - b.position[key]) < 1e-9, key);
});
test('save roundtrip preserves all fields', () => {
  const s = run(createAircraftState(), { throttle: 1 }, 3);
  assert.deepEqual(restoreAircraft(serializeAircraft(s)), s);
});
test('invalid save and timestep rejected', () => {
  assert.throws(() => restoreAircraft('{"version":99}'));
  assert.throws(() => stepAircraft(createAircraftState(), {}, -1));
});
test('nonfinite controls cannot poison state', () => {
  const s = stepAircraft(createAircraftState(), { throttle: Infinity, pitch: NaN, roll: Infinity }, 1);
  assert.ok(Object.values(s.position).every(Number.isFinite));
});

test('aircraft taxi follows destination runway elevation', () => {
  const terrainHeightAt = (x, z) => z >= 1 ? 2 : 0;
  const start = createAircraftState({ speed: 15, grounded: true });
  const end = stepAircraft(start, { throttle: 1 }, 1 / 6, { terrainHeightAt });
  assert.ok(end.position.z > 1);
  assert.equal(end.position.y, 2);
  assert.equal(end.grounded, true);
  assert.equal(start.position.y, 0, 'input state must remain unchanged');
});

test('descending aircraft lands on elevated terrain without penetrating it', () => {
  const start = createAircraftState({
    position: { x: 0, y: 12, z: 0 }, speed: 0, verticalSpeed: -20, grounded: false,
  });
  const end = stepAircraft(start, {}, 1, { terrainHeightAt: () => 8 });
  assert.equal(end.position.y, 8);
  assert.equal(end.verticalSpeed, 0);
  assert.equal(end.grounded, true);
});

test('terrain callback validates finite elevation and configuration', () => {
  assert.throws(() => stepAircraft(createAircraftState(), {}, 1 / 60, { terrainHeightAt: () => NaN }), /terrain elevation/);
  assert.throws(() => stepAircraft(createAircraftState(), {}, 1 / 60, { terrainHeightAt: 2 }), /terrainHeightAt/);
  assert.throws(() => stepAircraft(createAircraftState(), {}, 1 / 60, { terrainHeightAt: () => 3000 }), /terrain elevation/);
});
