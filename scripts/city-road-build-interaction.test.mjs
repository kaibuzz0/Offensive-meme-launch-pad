import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadBuildInteraction } from '../city-road-build-interaction.js';

test('missing renderer never reports a displayed scene or saved visual success', async () => {
  const record = { revision: 1, inventory: { supplies: 8 } };
  const feedback = [];
  let calls = 0;
  const ui = createRoadBuildInteraction({
    read: async () => record,
    collectRoadSupplies: async () => { calls++; return record; },
    placeWorkbench: async () => record
  }, { onFeedback: event => feedback.push(event.kind) });
  assert.equal((await ui.collect({ x: 0, y: 0, z: 0 })).revision, 1);
  assert.equal(await ui.refreshScene(), false);
  assert.equal(calls, 1);
  assert.equal(ui.snapshot.inventory.supplies, 8);
  assert.deepEqual(feedback, ['render-error', 'render-error']);
  assert.equal(feedback.includes('success'), false);
});

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
  assert.equal(shown.length, 1);
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

test('stale command response cannot replace a newer restored revision', async () => {
  const events = [];
  let resolveCollect;
  const ui = createRoadBuildInteraction({
    read: async () => ({ revision: 4, inventory: { supplies: 0 } }),
    collectRoadSupplies: () => new Promise(resolve => { resolveCollect = resolve; }),
    placeWorkbench: async () => null
  }, {
    onCommitted: record => events.push(['scene', record.revision]),
    onFeedback: event => events.push([event.kind, event.message])
  });
  await ui.restore();
  // A delayed response from a stale command must not roll back revision 4.
  const pending = ui.collect({ x: 1, y: 2, z: 3 });
  resolveCollect({ revision: 3, inventory: { supplies: 8 } });
  assert.equal(await pending, null);
  assert.equal(ui.snapshot.revision, 4);
  assert.deepEqual(events.filter(event => event[0] === 'scene'), [['scene', 4]]);
  assert.equal(events.some(event => event[0] === 'success'), false);
});

test('stale restore read cannot roll back a newer committed scene', async () => {
  let saved = { revision: 5, inventory: { supplies: 0 } };
  const scenes = [];
  const ui = createRoadBuildInteraction({
    read: async () => saved,
    collectRoadSupplies: async () => ({ revision: 6, inventory: { supplies: 8 } }),
    placeWorkbench: async () => null
  }, { onCommitted: record => scenes.push(record.revision) });
  await ui.restore();
  await ui.collect({ x: 1, y: 2, z: 3 });
  assert.equal(ui.snapshot.revision, 6);
  saved = { revision: 5, inventory: { supplies: 0 } };
  assert.equal((await ui.restore()).revision, 6);
  assert.deepEqual(scenes, [5, 6]);
  assert.equal(ui.snapshot.inventory.supplies, 8);
});

test('conflict recovery cannot repaint a stale read over newer committed state', async () => {
  const scenes = [];
  let saved = { revision: 6, inventory: { supplies: 0 } };
  const ui = createRoadBuildInteraction({
    read: async () => saved,
    collectRoadSupplies: async () => { throw new Error('building changed in another session; retry'); },
    placeWorkbench: async () => null
  }, { onCommitted: record => scenes.push(record.revision) });
  await ui.restore();
  saved = { revision: 5, inventory: { supplies: 8 } };
  assert.equal(await ui.collect({ x: 0, y: 0, z: 0 }), null);
  assert.deepEqual(scenes, [6]);
  assert.equal(ui.snapshot.revision, 6);
  assert.equal(ui.snapshot.inventory.supplies, 0);
});

test('malformed committed records never replace inventory or render a scene', async () => {
  const scenes = [], events = [];
  const valid = { revision: 2, inventory: { supplies: 8 }, journal: { edits: [] } };
  let saved = valid;
  const ui = createRoadBuildInteraction({
    read: async () => saved,
    collectRoadSupplies: async () => ({ inventory: { supplies: 999 } }),
    placeWorkbench: async () => ({ revision: 3, inventory: null })
  }, {
    onCommitted: record => scenes.push(record.revision),
    onFeedback: event => events.push(event.kind)
  });
  await ui.restore();
  assert.equal(await ui.collect({ x: 0, y: 0, z: 0 }), null);
  assert.equal(await ui.place({}), null);
  saved = { revision: '3', inventory: { supplies: 0 } };
  assert.equal(await ui.restore(), null);
  assert.deepEqual(scenes, [2]);
  assert.deepEqual(ui.snapshot, valid);
  assert.equal(events.includes('success'), false);
  assert.equal(events.filter(kind => kind === 'error').length, 3);
});


test('equal-revision divergent save cannot silently replace a committed scene', async () => {
  let saved = { revision: 4, inventory: { supplies: 8 } };
  const scenes = [], feedback = [];
  const ui = createRoadBuildInteraction({
    read: async () => saved,
    collectRoadSupplies: async () => saved,
    placeWorkbench: async () => saved
  }, {
    onCommitted: record => scenes.push(record.inventory.supplies),
    onFeedback: event => feedback.push(event.kind)
  });
  await ui.restore();
  saved = { revision: 4, inventory: { supplies: 0 } };
  assert.equal(await ui.restore(), null);
  assert.equal(await ui.collect({ x: 0, y: 0, z: 0 }), null);
  assert.equal(ui.snapshot.inventory.supplies, 8);
  assert.deepEqual(scenes, [8]);
  assert.deepEqual(feedback, ['error', 'error']);
});

test('restoring the same revision retries rendering after a transient scene failure', async () => {
  const record = { revision: 9, inventory: { supplies: 0 }, journal: { edits: [{ block: 'workbench' }] } };
  let fail = true;
  const rendered = [];
  const ui = createRoadBuildInteraction({
    read: async () => record,
    collectRoadSupplies: async () => record,
    placeWorkbench: async () => record
  }, {
    onCommitted: snapshot => {
      if (fail) throw new Error('renderer not ready');
      rendered.push(snapshot.revision);
    }
  });
  assert.equal((await ui.restore()).revision, 9);
  assert.deepEqual(rendered, []);
  fail = false;
  assert.equal((await ui.restore()).revision, 9);
  assert.deepEqual(rendered, [9]);
  await ui.restore();
  assert.deepEqual(rendered, [9]);
});

test('refreshScene recovers renderer without repeating a committed pickup', async () => {
  const record = { revision: 11, inventory: { supplies: 8 }, journal: { edits: [] } };
  let pickups = 0;
  let renderAttempts = 0;
  let ready = false;
  const ui = createRoadBuildInteraction({
    read: async () => record,
    collectRoadSupplies: async () => { pickups++; return record; },
    placeWorkbench: async () => record
  }, {
    onCommitted: () => {
      renderAttempts++;
      if (!ready) throw new Error('renderer not initialized');
    }
  });
  assert.equal((await ui.collect({ x: 0, y: 0, z: 0 })).revision, 11);
  assert.equal(pickups, 1);
  assert.equal(renderAttempts, 1);
  ready = true;
  assert.equal(await ui.refreshScene(), true);
  assert.equal(await ui.refreshScene(), true);
  assert.equal(renderAttempts, 2);
  assert.equal(pickups, 1);
  assert.deepEqual(ui.snapshot, record);
});

test('idempotent command response retries failed scene without repeating resource spending', async () => {
  const record = { revision: 12, inventory: { supplies: 8 } };
  let attempts = 0, pickups = 0, ready = false;
  const feedback = [];
  const ui = createRoadBuildInteraction({
    read: async () => record,
    collectRoadSupplies: async () => { pickups++; return record; },
    placeWorkbench: async () => record
  }, {
    onCommitted: () => { attempts++; if (!ready) throw Error('scene initializing'); },
    onFeedback: event => feedback.push(event.kind)
  });
  await ui.restore();
  assert.equal(attempts, 1);
  ready = true;
  assert.equal((await ui.collect({ x: 0, y: 0, z: 0 })).revision, 12);
  assert.equal(attempts, 2);
  assert.equal(pickups, 1);
  assert.equal(feedback.filter(kind => kind === 'success').length, 1);
  assert.equal(await ui.refreshScene(), true);
  assert.equal(attempts, 2);
});

test('renderer recovery uses latest cross-tab ledger revision without repeating resource spending', async () => {
  let saved = { revision: 1, inventory: { supplies: 8 }, journal: { edits: [] } };
  const scenes = [];
  let spending = 0;
  const ui = createRoadBuildInteraction({
    read: async () => structuredClone(saved),
    collectRoadSupplies: async () => { spending++; return saved; },
    placeWorkbench: async () => { spending++; return saved; }
  }, { onCommitted: record => { scenes.push(record.revision); } });
  await ui.restore();
  saved = { revision: 2, inventory: { supplies: 0 }, journal: { edits: [{ block: 'workbench' }] } };
  assert.equal(await ui.refreshScene({ force: true }), true);
  assert.deepEqual(scenes, [1, 2]);
  assert.equal(ui.snapshot.inventory.supplies, 0);
  assert.equal(spending, 0);
});

test('renderer recovery rejects divergent equal-revision ledger records', async () => {
  let saved = { revision: 3, inventory: { supplies: 8 } };
  const scenes = [], events = [];
  const ui = createRoadBuildInteraction({
    read: async () => structuredClone(saved),
    collectRoadSupplies: async () => saved,
    placeWorkbench: async () => saved
  }, {
    onCommitted: record => scenes.push(record.inventory.supplies),
    onFeedback: event => events.push(event.kind)
  });
  await ui.restore();
  saved = { revision: 3, inventory: { supplies: 0 } };
  assert.equal(await ui.refreshScene({ force: true }), false);
  assert.deepEqual(scenes, [8]);
  assert.equal(ui.snapshot.inventory.supplies, 8);
  assert.ok(events.includes('error'));
});
