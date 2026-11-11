import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { createSoloBuildCommands } from '../city-road-build-commands.js';
import { createRoadBuildInteraction } from '../city-road-build-interaction.js';

// Contract test: the same durable record carries pickup, spending, and voxel edits
// across controller recreation. This is not a browser/Android acceptance test.
test('seeded roadside gather -> build -> reload preserves one ledger and journal', async () => {
  let saved = {
    version: 1, seed: 'gather-build-route', revision: 0,
    inventory: { supplies: 0 },
    journal: createVoxelEditJournal('gather-build-route').snapshot()
  };
  const store = {
    async read() { return structuredClone(saved); },
    async compareAndSwap(_key, revision, next) {
      if (saved.revision !== revision) return false;
      saved = structuredClone(next);
      return true;
    }
  };
  const crate = { x: 20, y: 4, z: 20 };
  const resolver = seed => {
    assert.equal(seed, 'gather-build-route');
    return crate;
  };
  const commands = createSoloBuildCommands(store, 'world:gather-build-route', resolver);
  const collected = await commands.collectRoadSupplies({ x: 5.125, y: 1.125, z: 5.125 });
  assert.equal(collected.revision, 1);
  assert.equal(collected.inventory.supplies, 8);
  assert.equal(collected.journal.edits.length, 1);

  const built = await commands.placeWorkbench({
    player: { x: 2, y: 1, z: 2 },
    position: { x: 2, z: 2 },
    groundHeight: 1,
    isOccupied: () => false
  });
  assert.equal(built.revision, 2);
  assert.equal(built.inventory.supplies, 0);
  assert.equal(built.journal.edits.length, 2);
  assert.equal(built.journal.edits.some(edit => edit.block === 'workbench'), true);

  const reloaded = createSoloBuildCommands(store, 'world:gather-build-route', resolver);
  const recovered = await reloaded.read();
  assert.deepEqual(recovered, built);
  await assert.rejects(
    reloaded.collectRoadSupplies({ x: 5.125, y: 1.125, z: 5.125 }),
    /already collected/
  );
  await assert.rejects(reloaded.placeWorkbench({
    player: { x: 2, y: 1, z: 2 }, position: { x: 2, z: 2 },
    groundHeight: 1, isOccupied: () => false
  }), /insufficient supplies/);
  assert.deepEqual(saved, built);
});

// Exercise the actual UI adapter with the durable command boundary, not only
// the reducer. Renderer receives committed records and restores on recreation.
test('first-person adapter publishes durable journal and restores it on reload', async () => {
  let saved = {
    version: 1, seed: 'adapter-route', revision: 0,
    inventory: { supplies: 0 },
    journal: createVoxelEditJournal('adapter-route').snapshot()
  };
  const store = {
    async read() { return structuredClone(saved); },
    async compareAndSwap(_key, revision, next) {
      if (saved.revision !== revision) return false;
      saved = structuredClone(next);
      return true;
    }
  };
  const crate = { x: 20, y: 4, z: 20 };
  const makeCommands = () => createSoloBuildCommands(store, 'world:adapter-route', () => crate);
  const rendered = [];
  const feedback = [];
  const ui = createRoadBuildInteraction(makeCommands(), {
    onCommitted: record => rendered.push(structuredClone(record)),
    onFeedback: event => feedback.push(event)
  });
  await ui.restore();
  const pickup = await ui.collect({ x: 5.125, y: 1.125, z: 5.125 });
  assert.equal(pickup.inventory.supplies, 8);
  const built = await ui.place({
    player: { x: 2, y: 1, z: 2 },
    position: { x: 2, z: 2 },
    groundHeight: 1, isOccupied: () => false
  });
  assert.equal(built.inventory.supplies, 0);
  assert.equal(rendered.at(-1).journal.edits.some(edit => edit.block === 'workbench'), true);
  assert.equal(feedback.filter(event => event.kind === 'success').length, 2);
  const restoredScenes = [];
  const reopened = createRoadBuildInteraction(makeCommands(), {
    onCommitted: record => restoredScenes.push(structuredClone(record))
  });
  const recovered = await reopened.restore();
  assert.deepEqual(recovered, built);
  assert.deepEqual(restoredScenes, [built]);
  assert.equal(reopened.snapshot.inventory.supplies, 0);
});
