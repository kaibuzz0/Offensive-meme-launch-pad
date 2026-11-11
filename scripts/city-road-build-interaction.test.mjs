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
  assert.deepEqual(events, ['render-error']);
});

test('cross-tab revision conflict refreshes committed scene without replaying spending', async () => {
  const events = [];
  const current = { revision: 2, inventory: { supplies: 0 }, journal: { edits: [{ block: 'workbench' }] } };
  let attempts = 0;
  const ui = createRoadBuildInteraction({
    read: async () => current,
    collectRoadSupplies: async () => { attempts++; throw new Error('building changed in another session; retry'); },
    placeWorkbench: async () => current
  }, {
    onCommitted: record => events.push(['scene', record.revision]),
    onFeedback: event => events.push([event.kind, event.message])
  });
  assert.equal(await ui.collect({ x: 1, y: 2, z: 3 }), null);
  assert.equal(attempts, 1);
  assert.equal(ui.snapshot.revision, 2);
  assert.equal(ui.snapshot.inventory.supplies, 0);
  assert.equal(events[0][0], 'scene');
  assert.equal(events[1][0], 'error');
});

test('restore returns the saved record even when the renderer fails', async () => {
  const record = { revision: 7, inventory: { supplies: 0 } };
  const events = [];
  const ui = createRoadBuildInteraction({
    read: async () => record,
    collectRoadSupplies: async () => record,
    placeWorkbench: async () => record
  }, {
    onCommitted: () => { throw new Error('scene unavailable'); },
    onFeedback: event => events.push(event.kind)
  });
  assert.deepEqual(await ui.restore(), record);
  assert.deepEqual(events, ['render-error']);
  assert.deepEqual(ui.snapshot, record);
});


test('empty command result cannot produce a false saved notification or overwrite the scene', async () => {
  const events = [];
  const committed = { revision: 3, inventory: { supplies: 8 } };
  const ui = createRoadBuildInteraction({
    read: async () => committed,
    collectRoadSupplies: async () => null,
    placeWorkbench: async () => undefined
  }, {
    onCommitted: record => events.push(['scene', record.revision]),
    onFeedback: event => events.push([event.kind, event.message])
  });
  await ui.restore();
  assert.equal(await ui.collect({ x: 0, y: 0, z: 0 }), null);
  assert.equal(await ui.place({}), null);
  assert.equal(ui.snapshot.revision, 3);
  assert.equal(events.filter(event => event[0] === 'scene').length, 1);
  assert.equal(events.filter(event => event[0] === 'success').length, 0);
  assert.equal(events.filter(event => event[0] === 'error').length, 2);
});
