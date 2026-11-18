import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';

test('mutating staged delta and snapshot never changes the live voxel journal', () => {
  const live = createVoxelEditJournal('fortress-road');
  live.apply({ x: 1, y: 2, z: 3, block: 'timber' });
  const original = live.snapshot();
  const staged = live.previewBatch([
    { x: 1, y: 2, z: 3, block: 'stone' },
    { x: 4, y: 5, z: 6, block: 'workbench' }
  ], live.revision);
  staged.delta[0].block = 'corrupt';
  staged.snapshot.edits[0].block = 'corrupt';
  staged.snapshot.edits.push({ x: 99, y: 99, z: 99, block: 'stone' });
  assert.deepEqual(live.snapshot(), original);
  assert.equal(live.get(1, 2, 3), 'timber');
  assert.equal(live.has(4, 5, 6), false);
  assert.equal(live.has(99, 99, 99), false);
});

test('a staged construction candidate does not reserve a revision or consume an edit', () => {
  const live = createVoxelEditJournal('fortress-road');
  const expected = live.revision;
  const first = live.previewBatch([{ x: 1, y: 0, z: 0, block: 'workbench' }], expected);
  const second = live.previewBatch([{ x: 2, y: 0, z: 0, block: 'stone' }], expected);
  assert.equal(first.revision, expected + 1);
  assert.equal(second.revision, expected + 1);
  assert.equal(live.revision, expected);
  assert.equal(live.size, 0);
  live.apply({ x: 3, y: 0, z: 0, block: 'timber' }, expected);
  assert.throws(() => live.previewBatch([{ x: 1, y: 0, z: 0, block: 'workbench' }], expected), /stale/);
});
