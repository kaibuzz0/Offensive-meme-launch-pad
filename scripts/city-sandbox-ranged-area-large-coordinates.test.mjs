import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateAreaHits } from '../city-sandbox-ranged.js';

test('AoE rejects extremely distant finite targets without false positives', () => {
  const hits = simulateAreaHits({
    center: { x: 1e200, y: 0, z: 0 },
    radius: 16,
    actor: { id: 'player', team: 'blue' },
    targets: [
      { id: 'far', team: 'red', center: { x: -1e200, y: 0, z: 0 }, radius: 2 },
      { id: 'near', team: 'red', center: { x: 1e200, y: 0, z: 0 }, radius: 2 }
    ]
  });
  assert.deepEqual(hits, [{ targetId: 'near', distance: 0, intensity: 1 }]);
});

test('AoE large finite offsets do not create spurious damage', () => {
  assert.deepEqual(simulateAreaHits({
    center: { x: 0, y: 0, z: 0 },
    radius: 64,
    actor: { id: 'player', team: 'blue' },
    targets: [{ id: 'distant', team: 'red', center: { x: 1e200, y: 1e200, z: 1e200 }, radius: 128 }]
  }), []);
});
