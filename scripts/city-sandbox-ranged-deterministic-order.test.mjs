import assert from 'node:assert/strict';
import test from 'node:test';
import { simulateAreaHits } from '../city-sandbox-ranged.js';

const actor = { id: 'player', team: 'blue' };
const target = (id) => ({ id, team: 'red', center: { x: 2, y: 0, z: 0 }, radius: 1 });

test('equal-distance area hits use stable code-unit ID order regardless of locale', () => {
  const args = {
    center: { x: 0, y: 0, z: 0 }, radius: 5, actor,
    targets: [target('ä'), target('z'), target('A')],
  };
  assert.deepEqual(simulateAreaHits(args).map(hit => hit.targetId), ['A', 'z', 'ä']);
  assert.deepEqual(simulateAreaHits({ ...args, targets: [...args.targets].reverse() }).map(hit => hit.targetId), ['A', 'z', 'ä']);
});
