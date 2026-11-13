import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBuildRecord } from '../city-road-build-save-validation.js';

// Validation must reject malformed inventory containers before journal replay,
// even when an array happens to carry a plausible supplies property.
test('durable building records reject array-shaped inventory', () => {
  const inventory = [];
  inventory.supplies = 8;
  assert.throws(() => validateBuildRecord({
    version: 1,
    seed: 'fortress-road',
    revision: 0,
    inventory,
    journal: { voxelMetres: 0.25, revision: 0, edits: [] }
  }), /invalid durable building record/);
  assert.equal(inventory.supplies, 8, 'validation must not mutate original data');
});
