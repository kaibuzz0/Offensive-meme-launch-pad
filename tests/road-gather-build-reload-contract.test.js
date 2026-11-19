import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal, VOXEL_METRES } from '../city-sandbox-mining.js';
import { salvageRoadSupplies } from '../city-road-salvage-transaction.js';
import { buildWorkbenchState } from '../city-road-build-transaction.js';
import { validateBuildRecord } from '../city-road-build-save-validation.js';

test('one staged pickup pays for one staged workbench and survives JSON reload', () => {
  const seed = 'starter-route';
  const initial = {
    version: 1, seed, revision: 0, inventory: { supplies: 0 },
    journal: createVoxelEditJournal(seed).snapshot()
  };
  const crate = { x: 0, y: 0, z: 0 };
  const pose = { x: 0.125, y: 0.125, z: 0.125 };
  const collected = salvageRoadSupplies(initial, {
    player: pose, crate, expectedRevision: 0
  });
  assert.equal(initial.inventory.supplies, 0);
  assert.equal(initial.journal.revision, 0);
  assert.equal(collected.inventory.supplies, 8);
  assert.equal(collected.revision, 1);
  assert.throws(() => salvageRoadSupplies(collected, {
    player: pose, crate, expectedRevision: 1
  }), /already collected/);
  const built = buildWorkbenchState(collected, {
    kind: 'place-workbench', expectedRevision: 1,
    player: { x: 1, y: 0, z: 1 },
    position: { x: 1, z: 1 }, groundHeight: 0,
    isOccupied: () => false
  });
  assert.equal(collected.inventory.supplies, 8);
  assert.equal(built.inventory.supplies, 0);
  assert.equal(built.revision, 2);
  const restored = JSON.parse(JSON.stringify(built));
  validateBuildRecord(restored);
  assert.equal(restored.journal.voxelMetres, VOXEL_METRES);
  const journal = createVoxelEditJournal(seed, restored.journal);
  assert.equal(journal.get(crate.x, crate.y, crate.z), 'salvaged-crate');
  assert.equal(restored.inventory.supplies, 0);
  assert.equal(journal.revision, 2);
  assert.throws(() => buildWorkbenchState(restored, {
    kind: 'place-workbench', expectedRevision: 2,
    player: { x: 1, y: 0, z: 1 }, position: { x: 2, z: 1 },
    groundHeight: 0, isOccupied: () => false
  }), /insufficient supplies/);
});
