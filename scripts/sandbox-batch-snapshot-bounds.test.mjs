import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal, VOXEL_METRES } from '../city-sandbox-mining.js';

// A revision can commit at most 256 distinct cells. Reject forged snapshots
// without mutating any existing save or weakening valid batch replay.
test('batch snapshots reject impossible cell/revision counts', () => {
  const journal = createVoxelEditJournal('bounds');
  const edits = Array.from({ length: 257 }, (_, x) => ({ x, y: 0, z: 0, block: 'stone' }));
  const impossible = { version: 1, worldSeed: 'bounds', revision: 1, voxelMetres: VOXEL_METRES, edits };
  assert.throws(() => createVoxelEditJournal('bounds', impossible), /revision is inconsistent/);
  assert.equal(journal.size, 0);
  assert.equal(journal.revision, 0);

  const valid = createVoxelEditJournal('bounds');
  valid.applyBatch(edits.slice(0, 256));
  valid.applyBatch(edits.slice(256));
  const restored = createVoxelEditJournal('bounds', valid.snapshot());
  assert.equal(restored.size, 257);
  assert.equal(restored.revision, 2);
  assert.deepEqual(restored.snapshot(), valid.snapshot());
});
