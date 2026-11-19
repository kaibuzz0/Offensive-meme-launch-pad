import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { createSoloBuildCommands } from '../city-road-build-commands.js';

const seed = 'authoritative-road';
const crate = Object.freeze({ x: 20, y: 4, z: 20 });
const nearby = Object.freeze({ x: 5.125, y: 1.125, z: 5.125 });
function fixture() {
  let saved = { version: 1, seed, revision: 0, inventory: { supplies: 0 },
    journal: createVoxelEditJournal(seed).snapshot() };
  let writes = 0;
  return {
    store: {
      async read() { return structuredClone(saved); },
      async compareAndSwap(_key, revision, candidate) {
        writes++;
        if (saved.revision !== revision) return false;
        saved = structuredClone(candidate);
        return true;
      }
    },
    snapshot: () => structuredClone(saved),
    writes: () => writes
  };
}

test('pickup ignores caller-forged crate coordinates and resolves the saved seed', async () => {
  const { store, snapshot } = fixture();
  const resolved = [];
  const commands = createSoloBuildCommands(store, 'road', worldSeed => {
    resolved.push(worldSeed);
    return crate;
  });
  const forged = { ...nearby, crate: { x: 999, y: 999, z: 999 },
    seed: 'forged-seed', inventory: { supplies: 1000000 }, expectedRevision: 900 };
  const result = await commands.collectRoadSupplies(forged);
  assert.deepEqual(resolved, [seed]);
  assert.equal(result.inventory.supplies, 8);
  assert.equal(snapshot().inventory.supplies, 8);
  assert.deepEqual(snapshot().journal.edits.map(({x,y,z}) => ({x,y,z})), [crate]);
  await assert.rejects(commands.collectRoadSupplies(forged), /already collected/);
  assert.equal(snapshot().inventory.supplies, 8);
});

test('faraway forged pickup cannot credit resources or write a journal marker', async () => {
  const { store, snapshot, writes } = fixture();
  const commands = createSoloBuildCommands(store, 'road', () => crate);
  await assert.rejects(commands.collectRoadSupplies({
    x: 9999, y: 9999, z: 9999, crate: { x: 9999, y: 9999, z: 9999 }
  }), /out of reach/);
  assert.equal(writes(), 0);
  assert.equal(snapshot().revision, 0);
  assert.equal(snapshot().inventory.supplies, 0);
  assert.equal(snapshot().journal.edits.length, 0);
});

test('invalid resolver fails closed without a durable write', async () => {
  const { store, snapshot, writes } = fixture();
  const commands = createSoloBuildCommands(store, 'road', () => null);
  await assert.rejects(commands.collectRoadSupplies(nearby), /crate unavailable/);
  assert.equal(writes(), 0);
  assert.equal(snapshot().inventory.supplies, 0);
});
