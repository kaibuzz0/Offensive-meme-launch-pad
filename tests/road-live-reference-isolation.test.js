import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { commitWorkbenchBuild } from '../city-road-build-commit.js';

test('rejected construction cannot mutate an adapter live read reference', async () => {
  const seed = 'fortress-seed';
  const live = {
    version: 1, seed, revision: 0, inventory: { supplies: 8 },
    journal: createVoxelEditJournal(seed).snapshot()
  };
  const original = structuredClone(live);
  let writes = 0;
  const adapter = {
    async read() { return live; }, // intentionally unsafe live reference
    async compareAndSwap() { writes++; return false; }
  };
  const action = {
    kind: 'place-workbench', expectedRevision: 0,
    player: { x: 15, z: 24 }, position: { x: 15, z: 24 },
    groundHeight: 10, isOccupied: () => false
  };
  await assert.rejects(commitWorkbenchBuild(adapter, 'world:fortress', action), /conflict/);
  assert.equal(writes, 1);
  assert.deepEqual(live, original, 'staging must not mutate live storage before CAS');
});
