import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { buildWorkbenchState } from '../city-road-build-transaction.js';

// The occupancy bridge must consult the canonical snapped cell, not the
// pointer's floating-point location or a nearby ungenerated cell.
test('placement checks exactly the snapped voxel before staging one durable debit', () => {
  const seed = 'road-occupancy-snap-regression';
  const before = { version: 1, seed, revision: 0,
    inventory: { supplies: 16 }, journal: createVoxelEditJournal(seed).snapshot() };
  const original = structuredClone(before);
  const queried = [];
  const action = { kind: 'place-workbench', expectedRevision: 0,
    player: { x: 15.125, y: 10.375, z: 24.125 },
    position: { x: 15.01, z: 24.01 }, groundHeight: 10,
    isOccupied: (...coords) => { queried.push(coords); return false; } };
  const candidate = buildWorkbenchState(before, action);
  assert.deepEqual(queried, [[60, 41, 96]]);
  assert.equal(candidate.inventory.supplies, 8);
  assert.equal(candidate.revision, 1);
  assert.equal(createVoxelEditJournal(seed, candidate.journal).get(60, 41, 96), 'workbench');
  assert.deepEqual(before, original);
  assert.throws(() => buildWorkbenchState(candidate, action), /stale building action/);
});

test('snapped occupied cell rejects placement without changing state', () => {
  const seed = 'road-occupancy-snap-reject';
  const before = { version: 1, seed, revision: 0,
    inventory: { supplies: 8 }, journal: createVoxelEditJournal(seed).snapshot() };
  const original = structuredClone(before);
  const queried = [];
  assert.throws(() => buildWorkbenchState(before, {
    kind: 'place-workbench', expectedRevision: 0,
    player: { x: 15.125, z: 24.125 }, position: { x: 15.01, z: 24.01 },
    groundHeight: 10,
    isOccupied: (...coords) => { queried.push(coords); return true; }
  }), /occupied voxel/);
  assert.deepEqual(queried, [[60, 41, 96]]);
  assert.deepEqual(before, original);
});
