import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';

test('previewBatch stages a durable candidate without mutating live world', () => {
  const live = createVoxelEditJournal('fortress');
  live.apply({ x: 0, y: 0, z: 0, block: 'stone' });
  const before = live.snapshot();
  const staged = live.previewBatch([
    { x: 0, y: 0, z: 0, block: 'wood' },
    { x: 1, y: 0, z: 0, block: null }
  ], before.revision);
  assert.equal(staged.changed, true);
  assert.equal(staged.count, 2);
  assert.equal(staged.revision, 2);
  assert.deepEqual(live.snapshot(), before);
  assert.equal(createVoxelEditJournal('fortress', staged.snapshot).get(0, 0, 0), 'wood');
  assert.equal(createVoxelEditJournal('fortress', staged.snapshot).get(1, 0, 0), null);
  // A failed storage commit simply discards the staged candidate.
  assert.deepEqual(live.snapshot(), before);
});

test('previewBatch rejects invalid and stale input without touching live state', () => {
  const live = createVoxelEditJournal('fortress');
  const before = live.snapshot();
  assert.throws(() => live.previewBatch([
    { x: 0, y: 0, z: 0, block: 'wood' },
    { x: 1.5, y: 0, z: 0, block: 'stone' }
  ]), /coordinate/);
  assert.throws(() => live.previewBatch([{ x: 0, y: 0, z: 0, block: 'wood' }], 1), /stale/);
  assert.deepEqual(live.snapshot(), before);
});

test('previewBatch replay does not advance revision or alter candidate', () => {
  const live = createVoxelEditJournal('fortress');
  live.apply({ x: 0, y: 0, z: 0, block: 'wood' });
  const before = live.snapshot();
  const staged = live.previewBatch([{ x: 0, y: 0, z: 0, block: 'wood' }], 1);
  assert.equal(staged.changed, false);
  assert.equal(staged.revision, 1);
  assert.deepEqual(staged.snapshot, before);
  assert.deepEqual(live.snapshot(), before);
});
