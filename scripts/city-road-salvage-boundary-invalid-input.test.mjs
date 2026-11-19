import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { createSoloBuildCommands } from '../city-road-build-commands.js';

// The command boundary must reject invalid canonical-world answers without
// consuming a crate or changing the durable inventory.
function fixture(resolveCrate) {
  let durable = {
    version: 1, seed: 'invalid-crate-boundary', revision: 0,
    inventory: { supplies: 0 },
    journal: createVoxelEditJournal('invalid-crate-boundary').snapshot()
  };
  let writes = 0;
  const store = {
    async read() { return structuredClone(durable); },
    async compareAndSwap(_key, revision, next) {
      writes++;
      if (revision !== durable.revision) return false;
      durable = structuredClone(next);
      return true;
    }
  };
  return {
    commands: createSoloBuildCommands(store, 'invalid-crate', resolveCrate),
    snapshot: () => structuredClone(durable),
    writes: () => writes
  };
}
const pose = Object.freeze({ x: 5.125, y: 1.125, z: 5.125 });

for (const [label, resolver] of [
  ['fractional voxel coordinate', () => ({ x: 20.5, y: 4, z: 20 })],
  ['nonfinite voxel coordinate', () => ({ x: Infinity, y: 4, z: 20 })],
  ['missing canonical crate', () => null],
  ['unreachable canonical crate', () => ({ x: 2000, y: 4, z: 2000 })]
]) {
  test('invalid canonical crate: ' + label + ' never writes inventory or edits', async () => {
    const { commands, snapshot, writes } = fixture(resolver);
    const before = snapshot();
    await assert.rejects(commands.collectRoadSupplies(pose));
    assert.deepEqual(snapshot(), before);
    assert.equal(writes(), 0);
  });
}

test('resolver failure is isolated and does not poison the queued command reader', async () => {
  const { commands, snapshot, writes } = fixture(() => { throw new Error('world chunk unavailable'); });
  await assert.rejects(commands.collectRoadSupplies(pose), /world chunk unavailable/);
  assert.deepEqual(await commands.read(), snapshot());
  assert.equal(writes(), 0);
});
