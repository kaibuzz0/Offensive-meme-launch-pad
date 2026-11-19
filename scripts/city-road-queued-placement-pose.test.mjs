import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { commitWorkbenchBuild } from '../city-road-build-commit.js';

function delayedStore() {
  const seed = 'queued-workbench-pose';
  let durable = { version: 1, seed, revision: 0, inventory: { supplies: 8 },
    journal: createVoxelEditJournal(seed).snapshot() };
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let writes = 0;
  return {
    store: {
      async read() { await gate; return structuredClone(durable); },
      async compareAndSwap(_key, expected, next) {
        writes++;
        if (durable.revision !== expected) return false;
        durable = structuredClone(next);
        return true;
      }
    },
    release,
    snapshot: () => structuredClone(durable),
    writes: () => writes
  };
}

function action(x) {
  return { kind: 'place-workbench', expectedRevision: 0,
    player: { x, y: 1, z: 1 }, position: { x, z: 1 },
    groundHeight: 0, isOccupied: () => false };
}

test('queued placement cannot become reachable by mutating a rejected pose', async () => {
  const fixture = delayedStore();
  const input = action(999);
  const pending = commitWorkbenchBuild(fixture.store, 'road', input);
  input.player.x = 1;
  input.position.x = 1;
  fixture.release();
  await assert.rejects(pending, /out of reach/);
  assert.equal(fixture.writes(), 0);
  assert.equal(fixture.snapshot().inventory.supplies, 8);
  assert.equal(fixture.snapshot().journal.edits.length, 0);
});

test('queued placement retains invocation target and pose despite later movement', async () => {
  const fixture = delayedStore();
  const input = action(1);
  const pending = commitWorkbenchBuild(fixture.store, 'road', input);
  input.player.x = 999;
  input.position.x = 999;
  fixture.release();
  const committed = await pending;
  assert.equal(committed.inventory.supplies, 0);
  assert.equal(fixture.writes(), 1);
  assert.equal(fixture.snapshot().journal.edits.length, 1);
  assert.equal(fixture.snapshot().journal.edits[0].x, 4);
});
