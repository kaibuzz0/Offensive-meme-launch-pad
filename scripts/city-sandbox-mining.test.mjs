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
  assert.throws(() => createVoxelEditJournal('seed', { ...snapshot, revision: 2, edits: [...snapshot.edits, snapshot.edits[0]] }), /duplicate/);
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

test('exhausted revision refuses mutations atomically and permits idempotent retries', () => {
  const edit = { x: 1, y: 2, z: 3, block: 'stone' };
  const snapshot = { version: JOURNAL_VERSION, worldSeed: 'seed', voxelMetres: VOXEL_METRES,
    revision: Number.MAX_SAFE_INTEGER, edits: [edit] };
  const journal = createVoxelEditJournal('seed', snapshot);
  assert.throws(() => journal.apply({ ...edit, block: null }), RangeError);
  assert.throws(() => journal.reset(1, 2, 3), RangeError);
  assert.equal(journal.apply(edit).changed, false);
  assert.equal(journal.reset(4, 5, 6).changed, false);
  assert.deepEqual(journal.snapshot(), snapshot);
});

test('explicit invalid voxel scales fail closed without changing serialized save bytes', () => {
  const journal = createVoxelEditJournal('seed-scale-bytes');
  journal.apply({ x: -11, y: 0, z: 4, block: 'stone' });
  const saved = JSON.parse(JSON.stringify(journal.snapshot()));
  const before = JSON.stringify(saved);
  for (const scale of [0, -0.25, 0.5, 1, null, '0.25', NaN, Infinity]) {
    const invalid = { ...saved, voxelMetres: scale };
    const invalidBytes = JSON.stringify(invalid);
    assert.throws(() => createVoxelEditJournal('seed-scale-bytes', invalid), /incompatible/);
    assert.equal(JSON.stringify(invalid), invalidBytes);
    assert.equal(JSON.stringify(saved), before);
  }
  assert.deepEqual(createVoxelEditJournal('seed-scale-bytes', saved).snapshot(), saved);
});

test('snapshot rejects a conflicting voxel scale without mutating the saved record', () => {
  const journal = createVoxelEditJournal('seed-scale');
  journal.apply({ x: -4, y: 2, z: 8, block: 'stone' });
  const saved = journal.snapshot();
  const incompatible = { ...saved, voxelMetres: 1 };
  assert.throws(() => createVoxelEditJournal('seed-scale', incompatible), /incompatible/);
  assert.deepEqual(journal.snapshot(), saved);
  // Older v1 records without an explicit scale retain the established 0.25m interpretation.
  const legacy = { ...saved };
  delete legacy.voxelMetres;
  assert.equal(createVoxelEditJournal('seed-scale', legacy).get(-4, 2, 8), 'stone');
});


test('explicit undefined voxel scale is not a legacy missing field', () => {
  const journal = createVoxelEditJournal('seed-explicit-undefined');
  journal.apply({ x: -2, y: 1, z: 3, block: 'stone' });
  const saved = journal.snapshot();
  const before = JSON.stringify(saved);
  assert.throws(() => createVoxelEditJournal('seed-explicit-undefined', {
    ...saved, voxelMetres: undefined
  }), /incompatible/);
  assert.equal(JSON.stringify(saved), before);
  const legacy = { ...saved };
  delete legacy.voxelMetres;
  assert.equal(createVoxelEditJournal('seed-explicit-undefined', legacy).get(-2, 1, 3), 'stone');
  assert.deepEqual(createVoxelEditJournal('seed-explicit-undefined', saved).snapshot(), saved);
});


test('rejects inherited edit fields in commands and restored snapshots without mutation', () => {
  const journal = createVoxelEditJournal('seed-own-fields');
  const inherited = Object.create({ x: 1, y: 2, z: 3, block: 'stone' });
  assert.throws(() => journal.apply(inherited), /own properties/);
  assert.equal(journal.revision, 0);
  assert.equal(journal.size, 0);
  const partial = Object.assign(Object.create({ block: 'stone' }), { x: 1, y: 2, z: 3 });
  assert.throws(() => journal.apply(partial), /own properties/);
  const snapshot = { version: JOURNAL_VERSION, worldSeed: 'seed-own-fields',
    voxelMetres: VOXEL_METRES, revision: 1, edits: [inherited] };
  assert.throws(() => createVoxelEditJournal('seed-own-fields', snapshot), /own properties/);
  assert.equal(journal.revision, 0);
  assert.deepEqual(journal.snapshot().edits, []);
  assert.equal(journal.apply({ x: 1, y: 2, z: 3, block: 'stone' }).changed, true);
});

test('snapshot requires own metadata and rejects inherited records without changing the source', () => {
  const journal = createVoxelEditJournal('seed-snapshot-ownership');
  journal.apply({ x: -3, y: 2, z: 5, block: 'stone' });
  const saved = journal.snapshot();
  const before = JSON.stringify(saved);
  for (const field of ['version', 'worldSeed', 'revision', 'edits']) {
    const inherited = Object.create({ [field]: saved[field] });
    Object.assign(inherited, saved);
    delete inherited[field];
    assert.throws(() => createVoxelEditJournal('seed-snapshot-ownership', inherited), /incompatible/);
    assert.equal(JSON.stringify(saved), before);
  }
  assert.throws(() => createVoxelEditJournal('seed-snapshot-ownership', []), /incompatible/);
  assert.deepEqual(createVoxelEditJournal('seed-snapshot-ownership', saved).snapshot(), saved);
});
