import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';

test('construction delta distinguishes generated terrain, mined air, and solid edits', () => {
  const live = createVoxelEditJournal('starter-road');
  const mined = live.apply({ x: -2, y: 3, z: 1, block: null });
  assert.equal(mined.changed, true);
  const before = live.snapshot();
  const staged = live.previewBatch([
    { x: -2, y: 3, z: 1, block: 'timber' },
    { x: -3, y: 3, z: 1, block: 'stone' }
  ], before.revision);
  assert.equal(staged.changed, true);
  assert.equal(staged.count, 2);
  assert.deepEqual(staged.delta, [
    { x: -3, y: 3, z: 1, block: 'stone', previous: undefined },
    { x: -2, y: 3, z: 1, block: 'timber', previous: null }
  ]);
  assert.deepEqual(live.snapshot(), before, 'preview must not mutate live state');
  const persisted = JSON.parse(JSON.stringify(staged.snapshot));
  const recovered = createVoxelEditJournal('starter-road', persisted);
  assert.equal(recovered.get(-2, 3, 1), 'timber');
  assert.equal(recovered.get(-3, 3, 1), 'stone');
  assert.equal(recovered.revision, before.revision + 1);
  assert.equal(live.get(-2, 3, 1), null, 'failed/uncommitted transaction retains mined air');
  assert.equal(live.has(-3, 3, 1), false, 'failed/uncommitted transaction retains generated terrain');
});

test('stale placement cannot overwrite an independently committed edit', () => {
  const live = createVoxelEditJournal('starter-road');
  const expected = live.revision;
  live.apply({ x: 0, y: 0, z: 0, block: 'stone' });
  assert.throws(
    () => live.previewBatch([{ x: 0, y: 0, z: 0, block: 'timber' }], expected),
    /stale/
  );
  assert.equal(live.get(0, 0, 0), 'stone');
});
