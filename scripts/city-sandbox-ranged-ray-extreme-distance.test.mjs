import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateRayHit } from '../city-sandbox-ranged.js';

const actor = { id: 'player', team: 'blue' };
const target = (id, center) => ({ id, team: 'red', center, radius: 1 });

test('ray ignores finite extreme-distance targets without corrupting a nearby hit', () => {
  const result = simulateRayHit({
    origin: { x: 0, y: 0, z: 0 },
    direction: { x: 1, y: 0, z: 0 },
    maxRange: 30,
    actor,
    targets: [
      target('far', { x: 1e308, y: -1e308, z: 1e308 }),
      target('near', { x: 10, y: 0, z: 0 })
    ]
  });
  assert.equal(result?.targetId, 'near');
  assert.equal(result?.distance, 9);
});

test('ray rejects an extreme finite target alone', () => {
  const result = simulateRayHit({
    origin: { x: -1e308, y: 0, z: 0 },
    direction: { x: 1, y: 0, z: 0 },
    maxRange: 512,
    actor,
    targets: [target('far', { x: 1e308, y: 0, z: 0 })]
  });
  assert.equal(result, null);
});
