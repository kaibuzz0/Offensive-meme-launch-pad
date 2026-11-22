import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal, VOXEL_METRES, MAX_EDITS } from '../city-sandbox-mining.js';

// Regression coverage for the journal that construction must reuse.
// These tests intentionally exercise the existing contract without adding a second ledger.
test('committed edits and mined air survive a seed-matched reload', () => {
  const journal = createVoxelEditJournal('fortress-route');
  assert.equal(VOXEL_METRES, 0.25);
  journal.apply({ x: 4, y: 0, z: 1, block: 'timber' });
  journal.apply({ x: 3, y: 0, z: 1, block: null });
  const snapshot = journal.snapshot();
  assert.deepEqual(snapshot.edits.map(e => e.x), [3, 4]);
  const restored = createVoxelEditJournal('fortress-route', structuredClone(snapshot));
  assert.equal(restored.get(3, 0, 1), null);
  assert.equal(restored.has(3, 0, 1), true);
  assert.equal(restored.get(4, 0, 1), 'timber');
  assert.deepEqual(restored.snapshot(), snapshot);
  assert.throws(() => createVoxelEditJournal('different-seed', snapshot), /incompatible/);
});

test('stale and malformed edits do not partially change the journal', () => {
  const journal = createVoxelEditJournal('fortress-route');
  journal.apply({ x: 1, y: 2, z: 3, block: 'stone' });
  const before = journal.snapshot();
  assert.throws(() => journal.apply({ x: 2, y: 2, z: 3, block: 'wood' }, 0), /stale/);
  assert.throws(() => journal.apply({ x: 2.5, y: 2, z: 3, block: 'wood' }), /coordinate/);
  assert.throws(() => journal.apply({ x: 2, y: 2, z: 3, block: '__proto__' }), /material/);
  assert.deepEqual(journal.snapshot(), before);
  const noOp = journal.apply({ x: 1, y: 2, z: 3, block: 'stone' });
  assert.equal(noOp.changed, false);
  assert.deepEqual(journal.snapshot(), before);
});

test('invalid and duplicate persisted edits are rejected without modifying source', () => {
  const journal = createVoxelEditJournal('fortress-route');
  journal.apply({ x: 1, y: 2, z: 3, block: 'stone' });
  const snapshot = journal.snapshot();
  const duplicate = structuredClone(snapshot);
  duplicate.edits.push({ ...duplicate.edits[0] });
  duplicate.revision++;
  assert.throws(() => createVoxelEditJournal('fortress-route', duplicate), /duplicate/);
  const inconsistent = structuredClone(snapshot);
  inconsistent.revision = 0;
  assert.throws(() => createVoxelEditJournal('fortress-route', inconsistent), /inconsistent/);
  assert.deepEqual(journal.snapshot(), snapshot);
  assert.ok(MAX_EDITS > 0);
});

test('reset restores generated terrain semantics without confusing it with mined air', () => {
  const journal = createVoxelEditJournal('fortress-route');
  journal.apply({ x: 0, y: 0, z: 0, block: null });
  assert.equal(journal.has(0, 0, 0), true);
  assert.equal(journal.get(0, 0, 0), null);
  const result = journal.reset(0, 0, 0);
  assert.equal(result.changed, true);
  assert.equal(journal.has(0, 0, 0), false);
  assert.equal(journal.get(0, 0, 0), undefined);
});
