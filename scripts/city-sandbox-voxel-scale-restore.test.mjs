import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal, VOXEL_METRES } from '../city-sandbox-mining.js';

test('journal restore rejects incompatible voxel scales without activating edits', () => {
  const original = createVoxelEditJournal('scale-seed');
  original.apply({ x: 4, y: 0, z: -3, block: 'stone' });
  const snapshot = original.snapshot();
  assert.equal(snapshot.voxelMetres, VOXEL_METRES);
  for (const scale of [0.5, 1, 0, null, '0.25', NaN]) {
    assert.throws(
      () => createVoxelEditJournal('scale-seed', { ...snapshot, voxelMetres: scale }),
      /incompatible voxel edit snapshot/
    );
  }
  const restored = createVoxelEditJournal('scale-seed', snapshot);
  assert.equal(restored.get(4, 0, -3), 'stone');
  assert.equal(restored.revision, 1);
});

test('legacy journal snapshot without voxelMetres remains recoverable', () => {
  const original = createVoxelEditJournal('legacy-scale-seed');
  original.apply({ x: 1, y: 2, z: 3, block: null });
  const snapshot = original.snapshot();
  delete snapshot.voxelMetres;
  const restored = createVoxelEditJournal('legacy-scale-seed', snapshot);
  assert.equal(restored.has(1, 2, 3), true);
  assert.equal(restored.get(1, 2, 3), null);
  assert.equal(restored.snapshot().voxelMetres, VOXEL_METRES);
});
