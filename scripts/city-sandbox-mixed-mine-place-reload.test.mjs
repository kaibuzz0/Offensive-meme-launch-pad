import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';

// A caller must commit inventory and candidate snapshot in one durable transaction.
// These tests guard the journal side of that boundary; they do not simulate IndexedDB.
test('mixed mining and placement preview survives reload without changing the live journal', () => {
  const live = createVoxelEditJournal('fortress-road');
  live.apply({ x: 4, y: 2, z: 3, block: 'stone' });
  const before = live.snapshot();
  const candidate = live.previewBatch([
    { x: 4, y: 2, z: 3, block: null },
    { x: 5, y: 2, z: 3, block: 'wood' }
  ], before.revision);
  assert.equal(candidate.count, 2);
  assert.equal(candidate.snapshot.revision, before.revision + 1);
  assert.deepEqual(live.snapshot(), before, 'preview must not spend or mutate before durable commit');
  const restored = createVoxelEditJournal('fortress-road', candidate.snapshot);
  assert.equal(restored.has(4, 2, 3), true);
  assert.equal(restored.get(4, 2, 3), null, 'mined air must not regenerate as untouched terrain');
  assert.equal(restored.get(5, 2, 3), 'wood');
  assert.deepEqual(restored.previewBatch([
    { x: 4, y: 2, z: 3, block: null },
    { x: 5, y: 2, z: 3, block: 'wood' }
  ], restored.revision).delta, [], 'replay must have no new resource-affecting edits');
});

test('failed mixed preview leaves every cell and revision untouched', () => {
  const journal = createVoxelEditJournal('fortress-road');
  journal.apply({ x: 1, y: 1, z: 1, block: 'stone' });
  const before = journal.snapshot();
  assert.throws(() => journal.previewBatch([
    { x: 1, y: 1, z: 1, block: null },
    { x: 2, y: 1, z: 1, block: 'INVALID' }
  ], before.revision), /material/);
  assert.deepEqual(journal.snapshot(), before);
});
