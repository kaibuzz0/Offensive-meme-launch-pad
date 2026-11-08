import test from 'node:test';
import assert from 'node:assert/strict';
import { mapLegacyWorkbench } from '../city-road-build-legacy-terrain-map.js';

const preflight = Object.freeze({
  status: 'needs-terrain-mapping',
  workbench: Object.freeze({ x: 12, z: -4 }),
  craftedTorch: true
});
test('legacy mapping uses canonical quarter-metre coordinates without writes', () => {
  const result = mapLegacyWorkbench(preflight, (x, z) => {
    assert.deepEqual([x, z], [12, -4]);
    return 2;
  }, () => false);
  assert.equal(result.status, 'mapped');
  assert.deepEqual(result.target, { x: 48, y: 9, z: -16 });
  assert.equal(result.craftedTorch, true);
  assert.deepEqual(preflight.workbench, { x: 12, z: -4 });
});
test('occupied target is quarantined rather than overwritten', () => {
  assert.deepEqual(mapLegacyWorkbench(preflight, () => 2, () => true), {
    status: 'quarantine', reason: 'occupied-target'
  });
});
test('missing world queries and invalid height fail closed', () => {
  assert.throws(() => mapLegacyWorkbench(preflight, () => 2), /required/);
  assert.throws(() => mapLegacyWorkbench(preflight, () => NaN, () => false), /height/);
  assert.throws(() => mapLegacyWorkbench({ status: 'quarantine' }, () => 2, () => false), /required/);
});
