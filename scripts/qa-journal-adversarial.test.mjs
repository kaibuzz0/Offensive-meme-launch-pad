import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';

// QA #57: malformed network/save payloads must not partially change authoritative state.
test('invalid edit payloads leave journal revision and snapshot byte-identical', () => {
  const journal = createVoxelEditJournal('security-seed');
  journal.apply({ x: 1, y: 2, z: 3, block: 'stone' });
  const before = JSON.stringify(journal.snapshot());
  const attacks = [
    null, [], 'stone', { x: NaN, y: 0, z: 0, block: 'stone' },
    { x: 0, y: 0, z: 0, block: '__proto__' },
    { x: 0, y: 0, z: 0, block: { material: 'stone' } },
    { x: Number.MAX_SAFE_INTEGER, y: 0, z: 0, block: 'stone' }
  ];
  for (const payload of attacks) {
    assert.throws(() => journal.apply(payload), { name: /^(TypeError|RangeError)$/ });
    assert.equal(JSON.stringify(journal.snapshot()), before);
  }
});

test('equivalent edit sets serialize identically regardless of arrival order', () => {
  const edits = [
    { x: 4, y: 0, z: -2, block: 'stone' },
    { x: -4, y: 3, z: 1, block: null },
    { x: 0, y: -3, z: 0, block: 'wood' }
  ];
  const a = createVoxelEditJournal('repeatable-seed');
  const b = createVoxelEditJournal('repeatable-seed');
  for (const edit of edits) a.apply(edit);
  for (const edit of [...edits].reverse()) b.apply(edit);
  assert.equal(JSON.stringify(a.snapshot()), JSON.stringify(b.snapshot()));
  const restored = createVoxelEditJournal('repeatable-seed', JSON.parse(JSON.stringify(a.snapshot())));
  assert.equal(JSON.stringify(restored.snapshot()), JSON.stringify(b.snapshot()));
});
