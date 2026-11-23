import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { buildWorkbenchState } from '../city-road-build-transaction.js';

// A terrain provider can fail while chunks are streaming. Unknown occupancy
// must never be interpreted as permission to spend inventory or place a block.
test('occupancy lookup failure, unknown result and asynchronous result all fail closed', () => {
  const seed = 'road-occupancy-provider-failure';
  const state = { version: 1, seed, revision: 0,
    inventory: { supplies: 8 }, journal: createVoxelEditJournal(seed).snapshot() };
  const original = structuredClone(state);
  const base = { kind: 'place-workbench', expectedRevision: 0,
    player: { x: 15.125, y: 10.375, z: 24.125 },
    position: { x: 15.01, z: 24.01 }, groundHeight: 10 };
  const providers = [
    () => { throw new Error('chunk unavailable'); },
    () => undefined,
    () => null,
    () => Promise.resolve(false),
    () => 0
  ];
  for (const isOccupied of providers) {
    assert.throws(() => buildWorkbenchState(state, { ...base, isOccupied }));
    assert.deepEqual(state, original);
    assert.equal(createVoxelEditJournal(seed, state.journal).revision, 0);
  }
});
