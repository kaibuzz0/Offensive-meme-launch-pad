import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { validateBuildRecord } from '../city-road-build-save-validation.js';

function record() {
  return { version: 1, seed: 'fortress-road', revision: 0,
    inventory: { supplies: 8 },
    journal: createVoxelEditJournal('fortress-road').snapshot() };
}

test('accepts a coherent initial durable building record', () => {
  assert.equal(validateBuildRecord(record()).inventory.supplies, 8);
});

test('rejects mismatched world seed without modifying the original', () => {
  const original = record();
  const changed = { ...original, seed: 'another-world' };
  assert.throws(() => validateBuildRecord(changed), /incompatible voxel edit snapshot/);
  assert.equal(original.seed, 'fortress-road');
});

test('rejects mismatched revisions and malformed resource balances', () => {
  assert.throws(() => validateBuildRecord({ ...record(), revision: 1 }), /revision mismatch/);
  assert.throws(() => validateBuildRecord({ ...record(), inventory: { supplies: -8 } }), /invalid durable/);
  assert.throws(() => validateBuildRecord({ ...record(), inventory: { supplies: 1.5 } }), /invalid durable/);
});

test('rejects invalid journal edit material and duplicate voxel edits', () => {
  const a = record();
  a.journal = { ...a.journal, revision: 2, edits: [
    { x: 0, y: 1, z: 0, block: 'stone' },
    { x: 0, y: 1, z: 0, block: 'stone' }] };
  a.revision = 2;
  assert.throws(() => validateBuildRecord(a), /duplicate voxel/);
  a.journal.edits[1].x = 1;
  a.journal.edits[1].block = '__proto__';
  assert.throws(() => validateBuildRecord(a), /material/);
});

test('rejects a different or missing voxel scale without rewriting the save', () => {
  const original = record();
  const incompatible = { ...original, journal: { ...original.journal, voxelMetres: 1 } };
  assert.throws(() => validateBuildRecord(incompatible), /voxel scale mismatch/);
  assert.equal(original.journal.voxelMetres, 0.25);
  const missing = { ...original, journal: { ...original.journal } };
  delete missing.journal.voxelMetres;
  assert.throws(() => validateBuildRecord(missing), /voxel scale mismatch/);
});
