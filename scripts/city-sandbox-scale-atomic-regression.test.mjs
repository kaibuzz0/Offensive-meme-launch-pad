import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal, VOXEL_METRES } from '../city-sandbox-mining.js';

test('staged snapshots reject explicit incompatible voxel scales without changing live state', () => {
  const journal = createVoxelEditJournal('scale-guard');
  journal.apply({ x: 2, y: 1, z: 0, block: 'wood' });
  const before = journal.snapshot();
  const candidate = journal.previewBatch([{ x: 3, y: 1, z: 0, block: 'stone' }]);
  for (const badScale of [0.5, 1, 0, null, '0.25']) {
    const invalid = { ...candidate.snapshot, voxelMetres: badScale };
    assert.throws(() => createVoxelEditJournal('scale-guard', invalid), /incompatible voxel edit snapshot/);
  }
  assert.equal(candidate.snapshot.voxelMetres, VOXEL_METRES);
  assert.deepEqual(journal.snapshot(), before);
});

test('staged batch rejects malformed edits atomically and preserves mined air on reload', () => {
  const journal = createVoxelEditJournal('batch-invalid');
  journal.apply({ x: 0, y: 0, z: 0, block: null });
  const before = journal.snapshot();
  assert.throws(() => journal.previewBatch([
    { x: 1, y: 0, z: 0, block: 'wood' },
    { x: 2, y: 0, z: 0, block: '__proto__' }
  ]), /material/);
  assert.deepEqual(journal.snapshot(), before);
  const restored = createVoxelEditJournal('batch-invalid', before);
  assert.equal(restored.has(0, 0, 0), true);
  assert.equal(restored.get(0, 0, 0), null);
  assert.equal(restored.has(1, 0, 0), false);
});
