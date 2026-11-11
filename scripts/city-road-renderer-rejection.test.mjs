import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRoadBuildInteraction } from '../city-road-build-interaction.js';

test('explicit renderer rejection is recoverable without repeating pickup', async () => {
  const saved = { revision: 1, inventory: { timber: 8 }, journal: [] };
  let collects = 0;
  let renders = 0;
  let ready = false;
  const feedback = [];
  const commands = {
    read: async () => saved,
    collectRoadSupplies: async () => { collects++; return saved; },
    placeWorkbench: async () => saved
  };
  const ui = createRoadBuildInteraction(commands, {
    onCommitted: async () => { renders++; return ready; },
    onFeedback: event => feedback.push(event)
  });
  assert.equal((await ui.collect({ x: 0, y: 0, z: 0 })).revision, 1);
  assert.equal(collects, 1);
  assert.equal(renders, 1);
  assert.equal(feedback.some(event => event.kind === 'success'), false);
  assert.equal(feedback.some(event => event.kind === 'render-error'), true);
  ready = true;
  assert.equal(await ui.refreshScene(), true);
  assert.equal(renders, 2);
  assert.equal(collects, 1);
  assert.deepEqual(ui.snapshot.inventory, { timber: 8 });
  assert.equal(await ui.refreshScene(), true);
  assert.equal(renders, 2);
});
