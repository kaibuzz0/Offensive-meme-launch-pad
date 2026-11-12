import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateRayHit, simulateAreaHits } from '../city-sandbox-ranged.js';

const actor = { id: 'player', team: 'blue' };
const target = { id: 'target', team: 'red', center: { x: 2, y: 0, z: 0 }, radius: 1 };
const ray = { origin: { x: 0, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 }, maxRange: 10, targets: [target] };
const area = { center: { x: 0, y: 0, z: 0 }, radius: 10, targets: [target] };

test('ranged and area simulations reject oversized actor IDs and teams', () => {
  for (const invalid of [{ ...actor, id: 'a'.repeat(129) }, { ...actor, team: 'b'.repeat(65) }]) {
    assert.throws(() => simulateRayHit({ ...ray, actor: invalid }), /invalid actor/);
    assert.throws(() => simulateAreaHits({ ...area, actor: invalid }), /invalid actor/);
  }
});

test('bounded actor IDs preserve normal target selection', () => {
  assert.equal(simulateRayHit({ ...ray, actor }).targetId, 'target');
  assert.equal(simulateAreaHits({ ...area, actor })[0].targetId, 'target');
});
