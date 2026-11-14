import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { projectCommittedConstruction } from '../city-road-build-scene-projection.js';

test('committed scene projection is read-only, seed-scoped and repeatable', () => {
  const journal = createVoxelEditJournal('starter');
  journal.apply({ x: 4, y: 2, z: -8, block: 'workbench' });
  const record = { version: 1, seed: 'starter', revision: 1,
    inventory: { supplies: 0 }, journal: journal.snapshot() };
  const before = structuredClone(record);
  const projected = projectCommittedConstruction(record, 'starter');
  assert.equal(projected.edits[0].worldX, 1);
  assert.equal(projected.edits[0].worldY, 0.5);
  assert.equal(projected.edits[0].worldZ, -2);
  assert.equal(projected.edits[0].block, 'workbench');
  assert.deepEqual(projectCommittedConstruction(record, 'starter'), projected);
  assert.deepEqual(record, before);
  assert.ok(Object.isFrozen(projected.edits[0]));
  assert.throws(() => projectCommittedConstruction(record, 'other'), /seed mismatch/);
  const corrupt = structuredClone(record);
  corrupt.journal.revision = 0;
  assert.throws(() => projectCommittedConstruction(corrupt, 'starter'), /revision mismatch/);
});
