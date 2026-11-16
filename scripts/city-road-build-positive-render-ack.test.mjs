import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRoadBuildInteraction } from '../city-road-build-interaction.js';

test('missing renderer acknowledgement never claims visual success or spends twice', async () => {
  const saved = { revision: 1, inventory: { timber: 8 }, journal: [] };
  let collects = 0;
  let renders = 0;
  let acknowledge = false;
  const feedback = [];
  const commands = {
    read: async () => saved,
    collectRoadSupplies: async () => { collects++; return saved; },
    placeWorkbench: async () => saved
  };
  const ui = createRoadBuildInteraction(commands, {
    onCommitted: async () => {
      renders++;
      if (acknowledge) return true;
      // An adapter with no explicit return cannot prove visual projection.
    },
    onFeedback: event => feedback.push(event)
  });

  assert.equal((await ui.collect({ x: 0, y: 0, z: 0 })).revision, 1);
  assert.equal(ui.sceneReady, false);
  assert.equal(collects, 1);
  assert.equal(renders, 1);
  assert.equal(feedback.some(event => event.kind === 'success'), false);
  assert.equal(feedback.some(event => event.kind === 'render-error'), true);
  assert.equal(await ui.refreshScene(), false);
  assert.equal(collects, 1);
  assert.equal(renders, 2);

  acknowledge = true;
  assert.equal(await ui.refreshScene(), true);
  assert.equal(ui.sceneReady, true);
  assert.equal(collects, 1);
  assert.equal(renders, 3);
  assert.equal(await ui.refreshScene(), true);
  assert.equal(renders, 3);
});
