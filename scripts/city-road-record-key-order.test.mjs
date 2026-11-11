import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadBuildInteraction } from '../city-road-build-interaction.js';

test('equal revision with reordered inventory and journal keys is idempotent', async () => {
  const initial = { revision: 4, inventory: { wood: 3, stone: 2 }, journal: { seed: 7, edits: [] } };
  const reordered = { journal: { edits: [], seed: 7 }, inventory: { stone: 2, wood: 3 }, revision: 4 };
  let renders = 0;
  const feedback = [];
  const commands = {
    read: async () => initial,
    collectRoadSupplies: async () => reordered,
    placeWorkbench: async () => reordered
  };
  const ui = createRoadBuildInteraction(commands, {
    onCommitted: () => { renders++; },
    onFeedback: event => feedback.push(event)
  });
  assert.equal((await ui.restore()).revision, 4);
  assert.equal((await ui.collect({ x: 0, y: 0, z: 0 })).revision, 4);
  assert.equal(renders, 1, 'equivalent committed state should not repaint');
  assert.equal(feedback.some(event => event.kind === 'error'), false);
  assert.deepEqual(ui.snapshot.inventory, initial.inventory);
});
