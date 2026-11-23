import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { buildWorkbenchState } from '../city-road-build-transaction.js';

const seed = 'builder-occupancy-gate';
function state() {
  return { version: 1, seed, revision: 0, inventory: { supplies: 8 },
    journal: createVoxelEditJournal(seed).snapshot() };
}
function placement(extra = {}) {
  return { kind: 'place-workbench', expectedRevision: 0,
    player: { x: 1, y: 0.5, z: 1 }, position: { x: 1, z: 1 },
    groundHeight: 0, ...extra };
}
for (const [name, occupancy, expected] of [
  ['missing occupancy callback', undefined, /occupancy query required/],
  ['generated occupied terrain', () => true, /occupied voxel/],
  ['unloaded terrain with unknown occupancy', () => undefined, /occupied voxel/],
]) {
  test(name + ' rejects workbench without debiting supplies or editing journal', () => {
    const original = state();
    const before = structuredClone(original);
    assert.throws(() => buildWorkbenchState(original, placement(
      occupancy ? { isOccupied: occupancy } : {})), expected);
    assert.deepEqual(original, before);
  });
}
