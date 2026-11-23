import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';

test('construction preview enforces the 256-cell bound without changing live state', () => {
  const journal = createVoxelEditJournal('bounded-preview');
  const cells = Array.from({ length: 256 }, (_, x) => ({ x, y: 0, z: 0, block: 'stone' }));
  const staged = journal.previewBatch(cells);
  assert.equal(staged.count, 256);
  assert.equal(staged.revision, 1);
  assert.equal(journal.revision, 0);
  assert.equal(journal.size, 0);
  assert.throws(() => journal.previewBatch([...cells, { x: 256, y: 0, z: 0, block: 'stone' }]), /1\.\.256/);
  assert.equal(journal.size, 0);
  const committed = createVoxelEditJournal('bounded-preview', staged.snapshot);
  assert.equal(committed.size, 256);
  assert.equal(committed.revision, 1);
});

test('duplicate batch coordinates and stale revisions cannot stage a partial debit candidate', () => {
  const journal = createVoxelEditJournal('duplicate-preview');
  journal.apply({ x: 1, y: 1, z: 1, block: 'wood' });
  const before = journal.snapshot();
  assert.throws(() => journal.previewBatch([
    { x: 2, y: 2, z: 2, block: 'stone' },
    { x: 2, y: 2, z: 2, block: null }
  ]), /duplicate voxel/);
  assert.throws(() => journal.previewBatch([
    { x: 2, y: 2, z: 2, block: 'stone' }
  ], before.revision - 1), /stale/);
  assert.deepEqual(journal.snapshot(), before);
});

test('mixed no-op and effective edits only count actual changes and restore deterministically', () => {
  const journal = createVoxelEditJournal('mixed-preview');
  journal.apply({ x: 0, y: 0, z: 0, block: 'wood' });
  const staged = journal.previewBatch([
    { x: 0, y: 0, z: 0, block: 'wood' },
    { x: 1, y: 0, z: 0, block: 'stone' }
  ]);
  assert.equal(staged.count, 1);
  assert.equal(staged.delta.length, 1);
  assert.equal(staged.delta[0].x, 1);
  const restored = createVoxelEditJournal('mixed-preview', staged.snapshot);
  assert.equal(restored.get(0, 0, 0), 'wood');
  assert.equal(restored.get(1, 0, 0), 'stone');
  assert.equal(restored.revision, 2);
});
