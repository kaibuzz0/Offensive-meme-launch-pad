import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';

test('staged snapshot and delta are isolated from live voxel state', () => {
  const journal = createVoxelEditJournal('stage-isolation');
  journal.apply({ x: 0, y: 0, z: 0, block: 'wood' });
  const before = journal.snapshot();
  const candidate = journal.previewBatch([
    { x: 0, y: 0, z: 0, block: null },
    { x: 1, y: 0, z: 0, block: 'stone' }
  ]);
  candidate.delta[0].block = 'sand';
  candidate.snapshot.edits[0].block = 'sand';
  candidate.snapshot.edits.push({ x: 99, y: 0, z: 0, block: 'stone' });
  assert.deepEqual(journal.snapshot(), before);
  assert.equal(journal.get(1, 0, 0), undefined);
  assert.equal(journal.get(0, 0, 0), 'wood');
});

test('mined air remains distinct from unedited terrain after staged reload', () => {
  const journal = createVoxelEditJournal('air-reload');
  const candidate = journal.previewBatch([{ x: 4, y: 5, z: 6, block: null }]);
  assert.equal(candidate.delta[0].previous, undefined);
  assert.equal(journal.has(4, 5, 6), false);
  const restored = createVoxelEditJournal('air-reload', candidate.snapshot);
  assert.equal(restored.has(4, 5, 6), true);
  assert.equal(restored.get(4, 5, 6), null);
  assert.equal(restored.revision, 1);
  assert.deepEqual(restored.snapshot(), candidate.snapshot);
});

test('replayed placement does not create another resource debit candidate', () => {
  const initial = createVoxelEditJournal('replay-stage');
  const committed = initial.previewBatch([{ x: 2, y: 3, z: 4, block: 'wood' }]);
  const restored = createVoxelEditJournal('replay-stage', committed.snapshot);
  const replay = restored.previewBatch([{ x: 2, y: 3, z: 4, block: 'wood' }]);
  assert.equal(replay.changed, false);
  assert.equal(replay.count, 0);
  assert.deepEqual(replay.delta, []);
  assert.deepEqual(replay.snapshot, committed.snapshot);
});
