import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal, VOXEL_METRES } from '../city-sandbox-mining.js';

// Regression fixtures for the canonical gather/build/save/reload boundary.
// This tests the journal only; inventory spending and renderer integration
// require separate end-to-end acceptance on the same committed record.
test('committed edits replay with the same material and scale after reload', () => {
  const journal = createVoxelEditJournal('fortress-road-fixture');
  const placed = journal.apply({ x: 8, y: 12, z: -3, block: 'workbench' }, 0);
  assert.equal(placed.changed, true);
  assert.equal(placed.revision, 1);
  const saved = structuredClone(journal.snapshot());
  assert.equal(saved.voxelMetres, VOXEL_METRES);
  const restored = createVoxelEditJournal('fortress-road-fixture', saved);
  assert.equal(restored.get(8, 12, -3), 'workbench');
  assert.deepEqual(restored.snapshot(), saved);
});

test('duplicate placement does not advance revision and stale clients cannot edit', () => {
  const journal = createVoxelEditJournal('fortress-road-fixture');
  journal.apply({ x: 1, y: 2, z: 3, block: 'stone' }, 0);
  assert.deepEqual(journal.apply({ x: 1, y: 2, z: 3, block: 'stone' }, 1), {
    changed: false, revision: 1, previous: 'stone'
  });
  assert.throws(() => journal.apply({ x: 1, y: 2, z: 3, block: 'wood' }, 0), /stale/);
  assert.equal(journal.get(1, 2, 3), 'stone');
  assert.equal(journal.revision, 1);
});

test('mined air persists and reset is distinct from mining', () => {
  const journal = createVoxelEditJournal('fortress-road-fixture');
  journal.apply({ x: 4, y: 5, z: 6, block: null }, 0);
  const restored = createVoxelEditJournal('fortress-road-fixture', journal.snapshot());
  assert.equal(restored.has(4, 5, 6), true);
  assert.equal(restored.get(4, 5, 6), null);
  assert.equal(restored.reset(4, 5, 6, 1).changed, true);
  assert.equal(restored.has(4, 5, 6), false);
  assert.equal(restored.get(4, 5, 6), undefined);
});

test('seed mismatch and duplicate snapshot cells fail without modifying a live journal', () => {
  const journal = createVoxelEditJournal('seed-a');
  journal.apply({ x: 0, y: 0, z: 0, block: 'stone' });
  const saved = journal.snapshot();
  assert.throws(() => createVoxelEditJournal('seed-b', saved), /incompatible/);
  assert.throws(() => createVoxelEditJournal('seed-a', {
    ...saved, revision: 2, edits: [saved.edits[0], saved.edits[0]]
  }), /duplicate/);
  assert.equal(journal.get(0, 0, 0), 'stone');
  assert.equal(journal.revision, 1);
});

test('returned snapshots cannot mutate the live journal', () => {
  const journal = createVoxelEditJournal('seed-a');
  journal.apply({ x: 7, y: 8, z: 9, block: 'wood' });
  const saved = journal.snapshot();
  saved.edits[0].block = 'stone';
  saved.edits.push({ x: 2, y: 2, z: 2, block: 'stone' });
  assert.equal(journal.get(7, 8, 9), 'wood');
  assert.equal(journal.has(2, 2, 2), false);
});
