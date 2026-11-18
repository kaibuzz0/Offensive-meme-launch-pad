import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal, MAX_EDITS } from '../city-sandbox-mining.js';

test('full journal permits replacement but rejects new cells without partial batch writes', () => {
  const edits = Array.from({ length: MAX_EDITS }, (_, x) => ({ x, y: 0, z: 0, block: 'stone' }));
  const journal = createVoxelEditJournal('capacity-test', {
    version: 1, worldSeed: 'capacity-test', revision: MAX_EDITS,
    voxelMetres: 0.25, edits
  });
  assert.throws(() => journal.applyBatch([
    { x: 0, y: 0, z: 0, block: 'wood' },
    { x: MAX_EDITS, y: 0, z: 0, block: 'wood' }
  ], MAX_EDITS), /capacity/);
  assert.equal(journal.get(0, 0, 0), 'stone');
  assert.equal(journal.has(MAX_EDITS, 0, 0), false);
  assert.equal(journal.revision, MAX_EDITS);
  assert.deepEqual(journal.applyBatch([
    { x: 0, y: 0, z: 0, block: 'wood' }
  ], MAX_EDITS), { changed: true, count: 1, revision: MAX_EDITS + 1 });
});

test('mined-air batches survive replay without turning into unedited terrain', () => {
  const journal = createVoxelEditJournal('air-test');
  assert.deepEqual(journal.applyBatch([
    { x: -1, y: 0, z: 4, block: null },
    { x: 0, y: 0, z: 4, block: 'wood' }
  ]), { changed: true, count: 2, revision: 1 });
  const restored = createVoxelEditJournal('air-test', journal.snapshot());
  assert.equal(restored.has(-1, 0, 4), true);
  assert.equal(restored.get(-1, 0, 4), null);
  assert.equal(restored.get(0, 0, 4), 'wood');
  assert.equal(restored.revision, 1);
});
