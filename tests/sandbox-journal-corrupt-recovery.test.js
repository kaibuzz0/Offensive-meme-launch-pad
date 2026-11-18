import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal, JOURNAL_VERSION, VOXEL_METRES } from '../city-sandbox-mining.js';

const seed = 'fortress';
const edit = (x, block = 'stone') => ({ x, y: -2, z: 3, block });
const saved = (overrides = {}) => ({
  version: JOURNAL_VERSION, worldSeed: seed, voxelMetres: VOXEL_METRES,
  revision: 1, edits: [edit(1)], ...overrides
});

test('construction journal rejects corrupt saved coordinates, materials and duplicate cells', () => {
  for (const edits of [
    [edit(1), edit(1, 'dirt')],
    [edit(Number.MAX_SAFE_INTEGER)],
    [{ ...edit(1), y: 0.5 }],
    [edit(1, '__proto__')],
    [null]
  ]) {
    assert.throws(() => createVoxelEditJournal(seed, saved({ edits })));
  }
});

test('construction journal fails closed on mismatched seed, scale and impossible revision', () => {
  for (const snapshot of [
    saved({ worldSeed: 'different' }),
    saved({ voxelMetres: 1 }),
    saved({ revision: 0 }),
    saved({ revision: -1 }),
    saved({ version: JOURNAL_VERSION + 1 })
  ]) {
    assert.throws(() => createVoxelEditJournal(seed, snapshot));
  }
});

test('legacy snapshot without scale is recoverable and does not alias its input', () => {
  const snapshot = saved();
  delete snapshot.voxelMetres;
  const journal = createVoxelEditJournal(seed, snapshot);
  snapshot.edits[0].block = 'dirt';
  assert.equal(journal.get(1, -2, 3), 'stone');
  assert.equal(journal.snapshot().voxelMetres, VOXEL_METRES);
  assert.equal(journal.snapshot().revision, 1);
});

test('air edits and negative coordinates survive staged save/reload without changing live journal', () => {
  const live = createVoxelEditJournal(seed);
  const staged = live.previewBatch([edit(-1, null), edit(0, 'wood')], 0);
  assert.equal(staged.changed, true);
  assert.equal(live.size, 0);
  const restored = createVoxelEditJournal(seed, staged.snapshot);
  assert.equal(restored.get(-1, -2, 3), null);
  assert.equal(restored.get(0, -2, 3), 'wood');
  assert.equal(restored.get(1, -2, 3), undefined);
  assert.equal(restored.previewBatch([edit(-1, null), edit(0, 'wood')], 1).changed, false);
});
