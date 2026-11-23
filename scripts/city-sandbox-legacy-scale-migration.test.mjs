import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal, VOXEL_METRES } from '../city-sandbox-mining.js';

// A released v1 journal may predate voxelMetres metadata. It must remain
// readable, while every new snapshot writes the canonical scale explicitly.
test('legacy scale-less journal is migrated without discarding mined air', () => {
  const legacy = {
    version: 1, worldSeed: 'fortress-road', revision: 2,
    edits: [{ x: 1, y: 2, z: 3, block: null }, { x: 2, y: 2, z: 3, block: 'stone' }]
  };
  const journal = createVoxelEditJournal('fortress-road', legacy);
  assert.equal(journal.has(1, 2, 3), true);
  assert.equal(journal.get(1, 2, 3), null);
  assert.equal(journal.get(2, 2, 3), 'stone');
  assert.equal(journal.revision, 2);
  const upgraded = journal.snapshot();
  assert.equal(upgraded.voxelMetres, VOXEL_METRES);
  assert.deepEqual(createVoxelEditJournal('fortress-road', upgraded).snapshot(), upgraded);
  assert.equal(legacy.voxelMetres, undefined);
});

test('explicit incompatible scale fails closed without altering the original snapshot', () => {
  const snapshot = createVoxelEditJournal('fortress-road').snapshot();
  const incompatible = { ...snapshot, voxelMetres: 1 };
  assert.throws(() => createVoxelEditJournal('fortress-road', incompatible), /incompatible/);
  assert.equal(incompatible.voxelMetres, 1);
});

test('staged batch from legacy snapshot is independent and round trips at canonical scale', () => {
  const legacy = { version: 1, worldSeed: 'fortress-road', revision: 1,
    edits: [{ x: 0, y: 0, z: 0, block: null }] };
  const journal = createVoxelEditJournal('fortress-road', legacy);
  const staged = journal.previewBatch([{ x: 4, y: 0, z: 0, block: 'wood' }]);
  assert.equal(journal.has(4, 0, 0), false);
  assert.equal(journal.revision, 1);
  assert.equal(staged.snapshot.voxelMetres, VOXEL_METRES);
  const restored = createVoxelEditJournal('fortress-road', staged.snapshot);
  assert.equal(restored.get(4, 0, 0), 'wood');
  assert.equal(restored.has(0, 0, 0), true);
  assert.equal(restored.get(0, 0, 0), null);
});
