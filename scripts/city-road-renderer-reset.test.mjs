import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadBuildInteraction } from '../city-road-build-interaction.js';

test('renderer reset explicitly replays committed construction without spending twice', async () => {
  const saved = { revision: 12, inventory: { supplies: 0 }, journal: { edits: [{ block: 'workbench', x: 2, z: 4 }] } };
  let spending = 0;
  const scenes = [];
  const ui = createRoadBuildInteraction({
    read: async () => saved,
    collectRoadSupplies: async () => saved,
    placeWorkbench: async () => { spending++; return saved; }
  }, { onCommitted: snapshot => scenes.push(snapshot) });
  await ui.place({ player: { x: 0, y: 0, z: 0 }, position: { x: 2, z: 4 } });
  assert.equal(spending, 1);
  assert.equal(scenes.length, 1);
  assert.equal(await ui.refreshScene(), true);
  assert.equal(scenes.length, 1, 'ordinary refresh is idempotent');
  assert.equal(await ui.refreshScene({ force: true }), true);
  assert.equal(scenes.length, 2, 'context rebuild replays geometry');
  assert.equal(spending, 1, 'replay must not repeat placement');
  assert.deepEqual(ui.snapshot, saved);
  scenes[1].inventory.supplies = 99;
  assert.equal(ui.snapshot.inventory.supplies, 0, 'renderer cannot mutate saved state');
});
