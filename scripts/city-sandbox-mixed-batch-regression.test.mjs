import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';

test('mixed single edits, batches and resets round-trip with logical revisions', () => {
  const journal = createVoxelEditJournal('mixed-transaction-seed');
  assert.equal(journal.apply({ x: 0, y: 1, z: 2, block: 'stone' }, 0).revision, 1);
  assert.deepEqual(journal.applyBatch([
    { x: 0, y: 1, z: 2, block: 'wood' },
    { x: 1, y: 1, z: 2, block: null },
    { x: 2, y: 1, z: 2, block: 'stone' }
  ], 1), { changed: true, count: 3, revision: 2 });
  assert.deepEqual(journal.applyBatch([
    { x: 0, y: 1, z: 2, block: 'wood' },
    { x: 1, y: 1, z: 2, block: null }
  ], 2), { changed: false, count: 0, revision: 2 });
  assert.equal(journal.reset(2, 1, 2, 2).revision, 3);
  assert.equal(journal.apply({ x: 3, y: 1, z: 2, block: 'stone' }, 3).revision, 4);
  const snapshot = journal.snapshot();
  assert.equal(snapshot.revision, 4);
  assert.equal(snapshot.edits.length, 3);
  const restored = createVoxelEditJournal('mixed-transaction-seed', snapshot);
  assert.deepEqual(restored.snapshot(), snapshot);
  assert.equal(restored.get(0, 1, 2), 'wood');
  assert.equal(restored.has(1, 1, 2), true);
  assert.equal(restored.get(1, 1, 2), null);
  assert.equal(restored.has(2, 1, 2), false);
  assert.throws(() => restored.applyBatch([{ x: 4, y: 1, z: 2, block: 'wood' }], 3), /stale/);
  assert.deepEqual(restored.snapshot(), snapshot);
  assert.equal(restored.apply({ x: 4, y: 1, z: 2, block: 'wood' }, 4).revision, 5);
});

test('a mixed batch with a malformed final edit preserves all prior state', () => {
  const journal = createVoxelEditJournal('reject-seed');
  journal.apply({ x: 0, y: 0, z: 0, block: 'stone' });
  const before = journal.snapshot();
  assert.throws(() => journal.applyBatch([
    { x: 0, y: 0, z: 0, block: 'wood' },
    { x: 1, y: 0, z: 0, block: null },
    { x: 2, y: 0, z: 0, block: '__proto__' }
  ], before.revision), /material/);
  assert.deepEqual(journal.snapshot(), before);
});
