import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadBuildInteraction } from '../city-road-build-interaction.js';

test('only committed records are displayed, and reload restores a detached snapshot', async () => {
  const saved = { revision: 1, inventory: { supplies: 8 }, journal: { edits: [] } };
  const shown = [];
  const commands = {
    read: async () => saved,
    collectRoadSupplies: async () => saved,
    placeWorkbench: async () => { throw new Error('occupied voxel'); }
  };
  const ui = createRoadBuildInteraction(commands, { onCommitted: r => shown.push(r) });
  const collected = await ui.collect({ x: 1, y: 2, z: 3 });
  assert.equal(collected.inventory.supplies, 8);
  collected.inventory.supplies = 99;
  assert.equal(ui.snapshot.inventory.supplies, 8);
  assert.equal(shown.length, 1);
  assert.equal(await ui.place({}), null);
  assert.equal(shown.length, 1);
  await ui.restore();
  assert.equal(shown.length, 2);
  assert.equal(ui.snapshot.inventory.supplies, 8);
});

test('double tap cannot issue two concurrent resource commands', async () => {
  let release;
  let count = 0;
  const commands = {
    read: async () => null,
    collectRoadSupplies: () => {
      count++;
      return new Promise(resolve => { release = resolve; });
    },
    placeWorkbench: async () => null
  };
  const ui = createRoadBuildInteraction(commands);
  const first = ui.collect({ x: 0, y: 0, z: 0 });
  const second = ui.collect({ x: 0, y: 0, z: 0 });
  assert.equal(await second, null);
  assert.equal(count, 1);
  release({ revision: 1, inventory: { supplies: 8 } });
  await first;
  assert.equal(ui.busy, false);
});

test('render callback failure does not misreport a committed transaction as failed', async () => {
  const events = [];
  const record = { revision: 1, inventory: { supplies: 8 } };
  const ui = createRoadBuildInteraction({
    read: async () => record,
    collectRoadSupplies: async () => record,
    placeWorkbench: async () => record
  }, {
    onCommitted: () => { throw new Error('renderer offline'); },
    onFeedback: event => events.push(event.kind)
  });
  assert.equal((await ui.collect({ x: 0, y: 0, z: 0 })).revision, 1);
  assert.deepEqual(events, ['render-error', 'success']);
});
