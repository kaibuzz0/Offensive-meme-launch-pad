import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { createSoloBuildCommands } from '../city-road-build-commands.js';

// In-memory transactional stand-in: tests command/reducer integration, not IDB durability.
function fixture(supplies = 16) {
  let saved = {
    version: 1, seed: 'road-command-seed', revision: 0,
    inventory: { supplies },
    journal: createVoxelEditJournal('road-command-seed').snapshot()
  };
  const store = {
    async read() { return structuredClone(saved); },
    async compareAndSwap(_key, revision, next) {
      if (saved.revision !== revision) return false;
      saved = structuredClone(next);
      return true;
    }
  };
  return { store, snapshot: () => structuredClone(saved) };
}
const action = (x = 2) => ({
  player: { x: 2, y: 1, z: 2 },
  position: { x, z: 2 },
  groundHeight: 1,
  isOccupied: () => false
});
test('committed workbench spends eight supplies and survives controller recreation', async () => {
  const { store, snapshot } = fixture();
  const commands = createSoloBuildCommands(store, 'road:solo');
  const placed = await commands.placeWorkbench(action());
  assert.equal(placed.inventory.supplies, 8);
  assert.equal(placed.revision, 1);
  assert.equal(placed.journal.revision, 1);
  assert.equal(placed.journal.edits.length, 1);
  const reopened = createSoloBuildCommands(store, 'road:solo');
  assert.deepEqual(await reopened.read(), snapshot());
});
test('same-cell duplicate placement never spends a second time', async () => {
  const { store, snapshot } = fixture();
  const commands = createSoloBuildCommands(store, 'road:solo');
  await commands.placeWorkbench(action());
  const before = snapshot();
  await assert.rejects(commands.placeWorkbench(action()), /occupied voxel/);
  assert.deepEqual(snapshot(), before);
});
test('failed reach and insufficient supplies leave inventory and edits unchanged', async () => {
  const limited = fixture(7);
  const limitedCommands = createSoloBuildCommands(limited.store, 'road:solo');
  await assert.rejects(limitedCommands.placeWorkbench(action()), /insufficient supplies/);
  assert.equal(limited.snapshot().revision, 0);
  const far = fixture();
  const farCommands = createSoloBuildCommands(far.store, 'road:solo');
  await assert.rejects(farCommands.placeWorkbench({
    ...action(), player: { x: 100, y: 1, z: 100 }
  }), /out of reach/);
  assert.equal(far.snapshot().inventory.supplies, 16);
  assert.equal(far.snapshot().journal.edits.length, 0);
});
test('concurrent controllers reject stale write without double spending', async () => {
  const { store, snapshot } = fixture();
  const a = createSoloBuildCommands(store, 'road:solo');
  const b = createSoloBuildCommands(store, 'road:solo');
  const results = await Promise.allSettled([
    a.placeWorkbench(action(2)),
    b.placeWorkbench(action(3))
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(snapshot().inventory.supplies, 8);
  assert.equal(snapshot().journal.edits.length, 1);
});

test('placement snapshots caller coordinates before delayed durable read', async () => {
  const { store, snapshot } = fixture();
  const read = store.read;
  let releaseRead;
  const gate = new Promise(resolve => { releaseRead = resolve; });
  store.read = async (...args) => {
    await gate;
    return read(...args);
  };
  const commands = createSoloBuildCommands(store, 'road:solo');
  const input = action(2);
  const operation = commands.placeWorkbench(input);
  input.player.x = 999;
  input.position.x = 999;
  input.groundHeight = 999;
  releaseRead();
  const committed = await operation;
  assert.equal(committed.inventory.supplies, 8);
  assert.equal(snapshot().journal.edits.length, 1);
  assert.equal(snapshot().journal.edits[0].x < 100, true);
});

test('failed persistence leaves the ledger untouched and later placement can recover', async () => {
  const { store, snapshot } = fixture();
  const compareAndSwap = store.compareAndSwap;
  let failOnce = true;
  store.compareAndSwap = async (...args) => {
    if (failOnce) { failOnce = false; throw new Error('storage transaction aborted'); }
    return compareAndSwap(...args);
  };
  const commands = createSoloBuildCommands(store, 'road:solo');
  await assert.rejects(commands.placeWorkbench(action()), /storage transaction aborted/);
  assert.equal(snapshot().inventory.supplies, 16);
  assert.equal(snapshot().journal.edits.length, 0);
  const placed = await commands.placeWorkbench(action());
  assert.equal(placed.inventory.supplies, 8);
  assert.equal(placed.journal.edits.length, 1);
});

test('a missing occupancy query cannot spend supplies or write a voxel', async () => {
  const { store, snapshot } = fixture();
  const commands = createSoloBuildCommands(store, 'road:solo');
  await assert.rejects(commands.placeWorkbench({ ...action(), isOccupied: undefined }), /world occupancy query required/);
  assert.equal(snapshot().revision, 0);
  assert.equal(snapshot().inventory.supplies, 16);
  assert.equal(snapshot().journal.edits.length, 0);
});

test('queued placement captures its own input before an earlier command finishes', async () => {
  const { store, snapshot } = fixture(24);
  const read = store.read;
  let releaseFirstRead;
  const gate = new Promise(resolve => { releaseFirstRead = resolve; });
  let calls = 0;
  store.read = async (...args) => {
    if (++calls === 1) await gate;
    return read(...args);
  };
  const commands = createSoloBuildCommands(store, 'road:solo');
  const first = commands.placeWorkbench(action(2));
  const secondInput = action(4);
  const second = commands.placeWorkbench(secondInput);
  secondInput.player.x = 999;
  secondInput.position.x = 999;
  secondInput.groundHeight = 999;
  releaseFirstRead();
  const results = await Promise.all([first, second]);
  assert.equal(results[1].revision, 2);
  assert.equal(snapshot().inventory.supplies, 8);
  assert.equal(snapshot().journal.edits.length, 2);
  assert.equal(snapshot().journal.edits.every(edit => edit.x < 100), true);
});


test('ambiguous storage acknowledgement never reports a successful build', async () => {
  for (const acknowledgement of [undefined, null, 0, 'ok', { committed: true }]) {
    const { store, snapshot } = fixture();
    store.compareAndSwap = async () => acknowledgement;
    const commands = createSoloBuildCommands(store, 'road:solo');
    await assert.rejects(commands.placeWorkbench(action()), /building changed in another session/);
    assert.equal(snapshot().inventory.supplies, 16);
    assert.equal(snapshot().journal.edits.length, 0);
  }
});

test('world occupancy is rechecked after delayed read before any supplies are spent', async () => {
  const { store, snapshot } = fixture();
  const read = store.read;
  let releaseRead;
  const gate = new Promise(resolve => { releaseRead = resolve; });
  store.read = async (...args) => {
    await gate;
    return read(...args);
  };
  let blocked = false;
  let occupancyChecks = 0;
  const commands = createSoloBuildCommands(store, 'road:solo');
  const pending = commands.placeWorkbench({
    ...action(),
    isOccupied: () => { occupancyChecks++; return blocked; }
  });
  // Terrain or another actor may occupy the cell while storage is pending.
  blocked = true;
  releaseRead();
  await assert.rejects(pending, /occupied voxel/);
  assert.equal(occupancyChecks, 1);
  assert.equal(snapshot().revision, 0);
  assert.equal(snapshot().inventory.supplies, 16);
  assert.equal(snapshot().journal.edits.length, 0);
});


test('public command reads reject corrupt durable records rather than exposing them to UI', async () => {
  const { store } = fixture();
  const originalRead = store.read;
  const commands = createSoloBuildCommands(store, 'road:solo');
  assert.equal((await commands.read()).inventory.supplies, 16);
  store.read = async (...args) => {
    const record = await originalRead(...args);
    record.journal.revision += 1;
    return record;
  };
  await assert.rejects(commands.read(), /revision mismatch/);
});
