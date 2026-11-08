import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectLegacyRoadBuild, LEGACY_BUILD_KEY, LEGACY_CRAFT_KEY } from '../city-road-build-legacy-preflight.js';

function storage(entries) {
  const values = new Map(Object.entries(entries));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem() { throw new Error('preflight must never write'); },
    removeItem() { throw new Error('preflight must never delete'); }
  };
}
const seed = 'fortress-seed';
const key = LEGACY_BUILD_KEY + seed;
const craft = LEGACY_CRAFT_KEY + seed;
const bench = JSON.stringify({ version: 1, seed, kind: 'workbench', x: 12, z: -4 });

test('legacy preflight preserves a valid workbench and torch without guessing elevation', () => {
  assert.deepEqual(inspectLegacyRoadBuild(storage({ [key]: bench, [craft]: 'torch-1' }), seed), {
    status: 'needs-terrain-mapping', workbench: { x: 12, z: -4 }, craftedTorch: true
  });
});
test('legacy preflight is repeatable and does not mutate storage', () => {
  const source = storage({ [key]: bench });
  assert.deepEqual(inspectLegacyRoadBuild(source, seed), inspectLegacyRoadBuild(source, seed));
});
test('orphan, malformed and unknown-version records are quarantined without deletion', () => {
  assert.equal(inspectLegacyRoadBuild(storage({ [craft]: 'torch-1' }), seed).reason, 'orphan-craft');
  assert.equal(inspectLegacyRoadBuild(storage({ [key]: '{' }), seed).reason, 'invalid-json');
  assert.equal(inspectLegacyRoadBuild(storage({ [key]: JSON.stringify({ version: 2, seed, kind: 'workbench', x: 1, z: 2 }) }), seed).reason, 'unknown-workbench-schema');
  assert.equal(inspectLegacyRoadBuild(storage({ [key]: bench, [craft]: 'torch-2' }), seed).reason, 'unknown-craft-schema');
});
test('seed mismatch and nonfinite coordinates never migrate', () => {
  assert.equal(inspectLegacyRoadBuild(storage({ [key]: JSON.stringify({ version: 1, seed: 'other', kind: 'workbench', x: 1, z: 2 }) }), seed).status, 'quarantine');
  assert.equal(inspectLegacyRoadBuild(storage({ [key]: JSON.stringify({ version: 1, seed, kind: 'workbench', x: null, z: 2 }) }), seed).status, 'quarantine');
});
