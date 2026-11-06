import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVoxelEditJournal, voxelKey, VOXEL_METRES, JOURNAL_VERSION, MAX_EDITS
} from '../city-sandbox-mining.js';

test('0.25m integer voxel coordinates preserve distinct negative and positive cells', () => {
  assert.equal(VOXEL_METRES, 0.25);
  assert.equal(voxelKey(-1, 0, 0), '-1,0,0');
  assert.notEqual(voxelKey(-1, 0, 0), voxelKey(1, 0, 0));
  assert.throws(() => voxelKey(0.25, 0, 0), RangeError);
  assert.throws(() => voxelKey(Infinity, 0, 0), RangeError);
  assert.throws(() => voxelKey(2_000_001, 0, 0), RangeError);
});

test('mined air differs from unedited generated terrain', () => {
  const journal = createVoxelEditJournal('seed-1');
  assert.equal(journal.get(1, 2, 3), undefined);
  assert.equal(journal.has(1, 2, 3), false);
  assert.deepEqual(journal.apply({ x: 1, y: 2, z: 3, block: null }), {
    changed: true, revision: 1, previous: undefined
  });
  assert.equal(journal.get(1, 2, 3), null);
  assert.equal(journal.has(1, 2, 3), true);
  assert.deepEqual(journal.apply({ x: 1, y: 2, z: 3, block: null }), {
    changed: false, revision: 1, previous: null
  });
  assert.deepEqual(journal.reset(1, 2, 3), { changed: true, revision: 2 });
  assert.equal(journal.has(1, 2, 3), false);
});

test('snapshot survives JSON roundtrip with deterministic order and revisions', () => {
  const original = createVoxelEditJournal('seed-1');
  original.apply({ x: 3, y: -2, z: 1, block: 'basalt' });
  original.apply({ x: -4, y: 0, z: 1, block: null });
  original.apply({ x: 3, y: -2, z: 1, block: 'ore_copper' });
  const save = JSON.parse(JSON.stringify(original.snapshot()));
  assert.equal(save.version, JOURNAL_VERSION);
  assert.equal(save.revision, 3);
  assert.deepEqual(save.edits.map(e => e.x), [-4, 3]);
  const restored = createVoxelEditJournal('seed-1', save);
  assert.equal(restored.revision, 3);
  assert.equal(restored.get(3, -2, 1), 'ore_copper');
  assert.equal(restored.get(-4, 0, 1), null);
  assert.deepEqual(restored.snapshot(), save);
  assert.deepEqual(restored.apply({ x: 0, y: 0, z: 0, block: 'dirt' }, 3), {
    changed: true, revision: 4, previous: undefined
  });
});

test('rejects stale revisions and malicious or inconsistent snapshots', () => {
  const journal = createVoxelEditJournal('seed');
  journal.apply({ x: 0, y: 0, z: 0, block: 'stone' });
  assert.throws(() => journal.apply({ x: 1, y: 0, z: 0, block: 'stone' }, 0), /stale/);
  assert.equal(journal.size, 1);
  assert.throws(() => journal.apply({ x: 1, y: 0, z: 0, block: '__proto__' }), TypeError);
  assert.throws(() => journal.apply({ x: 1, y: 0, z: 0, block: 'x'.repeat(33) }), TypeError);
  const snapshot = journal.snapshot();
  assert.throws(() => createVoxelEditJournal('another-seed', snapshot), /incompatible/);
  assert.throws(() => createVoxelEditJournal('seed', { ...snapshot, revision: 0 }), /inconsistent/);
  assert.throws(() => createVoxelEditJournal('seed', { ...snapshot, edits: [...snapshot.edits, snapshot.edits[0]] }), /duplicate/);
  assert.throws(() => createVoxelEditJournal('seed', { ...snapshot, edits: new Array(MAX_EDITS + 1) }), /incompatible/);
});

test('snapshot output is detached from mutable journal state', () => {
  const journal = createVoxelEditJournal('seed');
  journal.apply({ x: 1, y: 2, z: 3, block: 'stone' });
  const save = journal.snapshot();
  save.edits[0].block = 'sand';
  assert.equal(journal.get(1, 2, 3), 'stone');
  assert.equal(journal.revision, 1);
});
