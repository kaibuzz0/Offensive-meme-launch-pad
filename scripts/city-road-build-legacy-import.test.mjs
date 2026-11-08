import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { prepareLegacyWorkbenchImport } from '../city-road-build-legacy-import.js';

function fresh() {
  return { version: 1, seed: 'road-test', revision: 0,
    inventory: { supplies: 8 },
    journal: createVoxelEditJournal('road-test').snapshot() };
}
const mapped = { status: 'mapped', target: { x: 4, y: 12, z: 8 }, craftedTorch: false };

test('imports old workbench once without charging supplies again', () => {
  const original = fresh();
  const next = prepareLegacyWorkbenchImport(original, mapped);
  assert.equal(next.inventory.supplies, 8);
  assert.equal(original.revision, 0);
  assert.equal(original.journal.edits.length, 0);
  assert.equal(next.revision, 1);
  assert.deepEqual(next.journal.edits, [{ x: 4, y: 12, z: 8, block: 'workbench' }]);
  assert.throws(() => prepareLegacyWorkbenchImport(next, mapped), /nonempty canonical save/);
});

test('quarantines unmapped, crafted and conflicting legacy records', () => {
  assert.throws(() => prepareLegacyWorkbenchImport(fresh(), { status: 'quarantine' }), /mapping not approved/);
  assert.throws(() => prepareLegacyWorkbenchImport(fresh(), { ...mapped, craftedTorch: true }), /explicit inventory mapping/);
  assert.throws(() => prepareLegacyWorkbenchImport(fresh(), { ...mapped, target: { x: 1.5, y: 2, z: 3 } }), /invalid mapped/);
});

test('rejects incompatible canonical saves without modifying them', () => {
  const record = fresh();
  record.journal.voxelMetres = 1;
  assert.throws(() => prepareLegacyWorkbenchImport(record, mapped), /voxel scale mismatch/);
  assert.equal(record.revision, 0);
});
