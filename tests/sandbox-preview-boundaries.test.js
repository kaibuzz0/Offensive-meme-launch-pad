import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';

const block = (x, block = 'stone') => ({ x, y: 0, z: 0, block });

test('staged edits do not mutate the live journal before durable commit', () => {
  const live = createVoxelEditJournal('fortress');
  const before = live.snapshot();
  const candidate = live.previewBatch([block(1)], live.revision);
  assert.equal(candidate.changed, true);
  assert.equal(candidate.snapshot.revision, 1);
  assert.deepEqual(live.snapshot(), before);
  const restored = createVoxelEditJournal('fortress', candidate.snapshot);
  assert.equal(restored.get(1, 0, 0), 'stone');
  assert.equal(live.get(1, 0, 0), undefined);
});

test('invalid second edit and stale revision leave live state untouched', () => {
  const live = createVoxelEditJournal('fortress');
  live.apply(block(1));
  const before = live.snapshot();
  assert.throws(() => live.previewBatch([block(2), block(3, '__proto__')], live.revision));
  assert.throws(() => live.previewBatch([block(2)], 0), /stale/);
  assert.deepEqual(live.snapshot(), before);
});

test('replayed batch has no changed cells and cannot modify live state through its snapshot', () => {
  const live = createVoxelEditJournal('fortress');
  live.apply(block(1));
  const before = live.snapshot();
  const replay = live.previewBatch([block(1)], live.revision);
  assert.equal(replay.changed, false);
  assert.equal(replay.count, 0);
  replay.snapshot.edits[0].block = 'dirt';
  assert.deepEqual(live.snapshot(), before);
});

test('256-cell construction preview is bounded, deterministic and does not mutate live state', () => {
  const live = createVoxelEditJournal('fortress');
  const edits = Array.from({ length: 256 }, (_, x) => block(x));
  const before = live.snapshot();
  const staged = live.previewBatch(edits.slice().reverse(), live.revision);
  assert.equal(staged.changed, true);
  assert.equal(staged.count, 256);
  assert.equal(staged.snapshot.revision, 1);
  assert.equal(staged.snapshot.edits.length, 256);
  assert.deepEqual(staged.snapshot.edits, edits);
  assert.deepEqual(live.snapshot(), before);
  assert.throws(() => live.previewBatch([...edits, block(256)], live.revision), /1\.\.256/);
  assert.deepEqual(live.snapshot(), before);
  const restored = createVoxelEditJournal('fortress', staged.snapshot);
  assert.equal(restored.get(255, 0, 0), 'stone');
});

test('duplicate construction coordinates fail before staging and preserve journal', () => {
  const live = createVoxelEditJournal('fortress');
  live.apply(block(0));
  const before = live.snapshot();
  assert.throws(() => live.previewBatch([block(1), block(1, 'dirt')], live.revision), /duplicate/);
  assert.deepEqual(live.snapshot(), before);
});
