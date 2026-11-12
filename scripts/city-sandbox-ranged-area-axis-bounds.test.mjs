import assert from 'node:assert/strict';
import test from 'node:test';
import { simulateAreaHits } from '../city-sandbox-ranged.js';

const actor = { id: 'player', team: 'blue' };
const target = (id, x, y, z, radius = 1) => ({
  id, team: 'red', center: { x, y, z }, radius
});

test('area-hit axis rejection preserves boundary and near-target hits', () => {
  const hits = simulateAreaHits({
    center: { x: 0, y: 0, z: 0 }, radius: 5, actor,
    targets: [
      target('boundary', 6, 0, 0),
      target('outside', 6.0001, 0, 0),
      target('diagonal', 5, 5, 0),
      target('near', 2, 0, 0),
    ],
  });
  assert.deepEqual(hits.map(hit => hit.targetId), ['near', 'boundary']);
  assert.equal(hits[0].distance, 1);
  assert.equal(hits[1].distance, 5);
  assert.equal(hits[1].intensity, 0);
});

test('area-hit rejects huge finite coordinate deltas without losing valid hits', () => {
  const hits = simulateAreaHits({
    center: { x: 1e308, y: 0, z: 0 }, radius: 5, actor,
    targets: [
      target('distant', -1e308, 0, 0),
      target('same', 1e308, 0, 0),
    ],
  });
  assert.deepEqual(hits.map(hit => hit.targetId), ['same']);
  assert.equal(hits[0].distance, 0);
});
