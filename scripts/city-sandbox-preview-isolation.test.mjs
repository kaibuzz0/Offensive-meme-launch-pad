import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';

test('construction preview is detached and never spends a live journal revision', () => {
  const journal = createVoxelEditJournal('preview-isolation');
  journal.apply({ x: 1, y: 2, z: 3, block: 'stone' });
  const original = journal.snapshot();
  const candidate = journal.previewBatch([
    { x: 1, y: 2, z: 3, block: 'wood' },
    { x: 2, y: 2, z: 3, block: null }
  ], original.revision);
  assert.equal(candidate.revision, original.revision + 1);
  assert.equal(candidate.count, 2);
  assert.deepEqual(journal.snapshot(), original);
  candidate.snapshot.edits[0].block = 'tampered';
  candidate.delta[0].block = 'tampered';
  assert.deepEqual(journal.snapshot(), original);
  assert.throws(() => journal.previewBatch([{ x: 4, y: 2, z: 3, block: 'wood' }], 0), /stale/);
  assert.deepEqual(journal.snapshot(), original);
});

test('failed second edit rejects the entire preview without partial changes', () => {
  const journal = createVoxelEditJournal('preview-rejection');
  const before = journal.snapshot();
  assert.throws(() => journal.previewBatch([
    { x: 0, y: 0, z: 0, block: 'wood' },
    { x: 1.5, y: 0, z: 0, block: 'wood' }
  ]), /coordinate/);
  assert.deepEqual(journal.snapshot(), before);
  assert.equal(journal.size, 0);
});

test('committed preview restores once and repeated preview does not advance revision', () => {
  const journal = createVoxelEditJournal('preview-reload');
  const candidate = journal.previewBatch([{ x: 4, y: 5, z: 6, block: 'wood' }]);
  const restored = createVoxelEditJournal('preview-reload', candidate.snapshot);
  assert.equal(restored.get(4, 5, 6), 'wood');
  const replay = restored.previewBatch([{ x: 4, y: 5, z: 6, block: 'wood' }]);
  assert.equal(replay.changed, false);
  assert.equal(replay.revision, candidate.revision);
  assert.deepEqual(replay.snapshot, candidate.snapshot);
});
