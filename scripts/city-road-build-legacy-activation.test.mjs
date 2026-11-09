import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { activateLegacyWorkbench } from '../city-road-build-legacy-activation.js';

function fresh() {
  return { version: 1, seed: 'road-test', revision: 0,
    inventory: { supplies: 8 },
    journal: createVoxelEditJournal('road-test').snapshot() };
}
const mapped = { status: 'mapped', target: { x: 4, y: 12, z: 8 }, craftedTorch: false };
function store(initial, race = false) {
  let record = structuredClone(initial);
  return {
    async read() { return structuredClone(record); },
    async compareAndSwap(_key, revision, next) {
      if (race || record.revision !== revision) return false;
      record = structuredClone(next); return true;
    }
  };
}
test('durably activates once without double spending', async () => {
  const s = store(fresh());
  assert.deepEqual(await activateLegacyWorkbench(s, 'road-test', mapped),
    { status: 'activated', revision: 1 });
  assert.equal((await s.read()).inventory.supplies, 8);
  assert.equal((await s.read()).journal.edits.length, 1);
  assert.match((await activateLegacyWorkbench(s, 'road-test', mapped)).status, /quarantine/);
  assert.equal((await s.read()).journal.edits.length, 1);
});
test('does not overwrite concurrent changes or unresolved craft', async () => {
  const s = store(fresh(), true);
  assert.equal((await activateLegacyWorkbench(s, 'road-test', mapped)).status, 'revision-conflict');
  assert.equal((await s.read()).revision, 0);
  const t = store(fresh());
  assert.equal((await activateLegacyWorkbench(t, 'road-test', { ...mapped, craftedTorch: true })).status, 'quarantine');
  assert.equal((await t.read()).revision, 0);
});

test('refuses a valid legacy mapping for another seeded world', async () => {
  const s = store(fresh());
  const before = await s.read();
  assert.deepEqual(await activateLegacyWorkbench(s, 'wrong-world-key', mapped, 'different-seed'),
    { status: 'quarantine', reason: 'world-seed-mismatch' });
  assert.deepEqual(await s.read(), before);
});
