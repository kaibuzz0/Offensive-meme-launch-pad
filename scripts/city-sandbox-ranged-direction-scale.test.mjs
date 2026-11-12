import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateRayHit } from '../city-sandbox-ranged.js';

const actor = { id: 'player', team: 'blue' };
const target = { id: 'enemy', team: 'red', center: { x: 10, y: 10, z: 0 }, radius: 1 };

test('very large finite direction vectors normalize without overflow or NaN hits', () => {
  const options = { origin: { x: 0, y: 0, z: 0 }, maxRange: 30, actor, targets: [target] };
  const normal = simulateRayHit({ ...options, direction: { x: 1, y: 1, z: 0 } });
  const huge = simulateRayHit({ ...options, direction: { x: 1e308, y: 1e308, z: 0 } });
  assert.deepEqual(huge, normal);
  assert.equal(huge.targetId, 'enemy');
  assert.ok(Number.isFinite(huge.distance));
});

test('zero and nonfinite directions still fail closed', () => {
  const options = { origin: { x: 0, y: 0, z: 0 }, maxRange: 30, actor, targets: [target] };
  assert.throws(() => simulateRayHit({ ...options, direction: { x: 0, y: 0, z: 0 } }), RangeError);
  assert.throws(() => simulateRayHit({ ...options, direction: { x: Infinity, y: 1, z: 0 } }), TypeError);
});
