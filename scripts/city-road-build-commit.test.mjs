import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { commitWorkbenchBuild } from '../city-road-build-commit.js';

const seed = 'fortress-seed';
const fresh = () => ({
  version: 1, seed, revision: 0, inventory: { supplies: 8 },
  journal: createVoxelEditJournal(seed).snapshot()
});
const action = {
  kind: 'place-workbench', expectedRevision: 0,
  player: { x: 15, z: 24 }, position: { x: 15, z: 24 },
  groundHeight: 10, isOccupied: () => false
};
function store(initial = fresh()) {
  let record = structuredClone(initial);
  return {
    async read() { return structuredClone(record); },
    async compareAndSwap(_key, revision, next) {
      if (record.revision !== revision) return false;
      record = structuredClone(next);
      return true;
    }
  };
}
test('atomic record commits inventory and voxel edit together', async () => {
  const db = store();
  const after = await commitWorkbenchBuild(db, 'world:fortress', action);
  assert.equal(after.inventory.supplies, 0);
  const reloaded = await db.read();
  assert.deepEqual(reloaded, after);
  assert.equal(createVoxelEditJournal(seed, reloaded.journal).get(60, 41, 96), 'workbench');
  await assert.rejects(commitWorkbenchBuild(db, 'world:fortress', action), /stale/);
});
test('conflicting CAS cannot spend supplies or place a voxel', async () => {
  const db = store();
  db.compareAndSwap = async () => false;
  const before = await db.read();
  await assert.rejects(commitWorkbenchBuild(db, 'world:fortress', action), /conflict/);
  assert.deepEqual(await db.read(), before);
});
test('invalid placement never invokes durable write', async () => {
  const db = store(); let writes = 0;
  db.compareAndSwap = async () => { writes++; return true; };
  await assert.rejects(commitWorkbenchBuild(db, 'world:fortress', {...action, isOccupied: () => true}), /occupied/);
  assert.equal(writes, 0);
});
test('non-atomic adapters are rejected', async () => {
  await assert.rejects(commitWorkbenchBuild({read: async () => fresh()}, 'world:fortress', action), /atomic building store required/);
});

test('corrupt stored journal is rejected before the CAS write', async () => {
  const broken = fresh();
  broken.journal.worldSeed = 'wrong-world';
  const db = store(broken);
  let writes = 0;
  db.compareAndSwap = async () => { writes++; return true; };
  await assert.rejects(commitWorkbenchBuild(db, 'world:fortress', action), /incompatible voxel edit snapshot/);
  assert.equal(writes, 0);
  assert.deepEqual(await db.read(), broken);
});

test('adapter cannot bypass validation with inconsistent resource record', async () => {
  const broken = fresh();
  broken.inventory.supplies = -1;
  const db = store(broken);
  let writes = 0;
  db.compareAndSwap = async () => { writes++; return true; };
  await assert.rejects(commitWorkbenchBuild(db, 'world:fortress', action), /invalid durable building record/);
  assert.equal(writes, 0);
});


test('concurrent placement attempts against one revision commit at most once', async () => {
  const db = store();
  const originalCAS = db.compareAndSwap.bind(db);
  let writes = 0;
  db.compareAndSwap = async (...args) => {
    // Both callers can read the same revision; the storage boundary must
    // serialize their compare-and-swap, not trust the earlier read.
    await Promise.resolve();
    const committed = await originalCAS(...args);
    if (committed) writes++;
    return committed;
  };
  const outcomes = await Promise.allSettled([
    commitWorkbenchBuild(db, 'world:fortress', action),
    commitWorkbenchBuild(db, 'world:fortress', action)
  ]);
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(outcomes.filter(result => result.status === 'rejected').length, 1);
  assert.equal(writes, 1);
  const reloaded = await db.read();
  assert.equal(reloaded.inventory.supplies, 0);
  assert.equal(reloaded.revision, 1);
  assert.equal(createVoxelEditJournal(seed, reloaded.journal).get(60, 41, 96), 'workbench');
});
