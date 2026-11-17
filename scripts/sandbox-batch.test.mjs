import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';

test('bounded batch commits two placements as one replayable revision', () => {
  const journal = createVoxelEditJournal('fortress');
  const edits = [{ x: 1, y: 2, z: 3, block: 'wood' }, { x: 2, y: 2, z: 3, block: 'stone' }];
  assert.deepEqual(journal.applyBatch(edits, 0), { changed: true, count: 2, revision: 1 });
  const restored = createVoxelEditJournal('fortress', journal.snapshot());
  assert.equal(restored.get(1, 2, 3), 'wood');
  assert.equal(restored.get(2, 2, 3), 'stone');
  assert.deepEqual(restored.applyBatch(edits, 1), { changed: false, count: 0, revision: 1 });
});

test('invalid second edit never partially mutates a batch', () => {
  const journal = createVoxelEditJournal('fortress');
  assert.throws(() => journal.applyBatch([
    { x: 1, y: 2, z: 3, block: 'wood' },
    { x: 2.5, y: 2, z: 3, block: 'stone' }
  ]), /coordinate/);
  assert.equal(journal.size, 0);
  assert.equal(journal.revision, 0);
});

test('duplicate cells, stale revisions and oversized batches fail closed', () => {
  const journal = createVoxelEditJournal('fortress');
  const edit = { x: 1, y: 2, z: 3, block: 'wood' };
  assert.throws(() => journal.applyBatch([edit, edit]), /duplicate/);
  assert.throws(() => journal.applyBatch(Array(257).fill(edit)), /1\.\.256/);
  journal.apply(edit);
  assert.throws(() => journal.applyBatch([{ ...edit, block: 'stone' }], 0), /stale/);
  assert.equal(journal.get(1, 2, 3), 'wood');
  assert.equal(journal.revision, 1);
});
