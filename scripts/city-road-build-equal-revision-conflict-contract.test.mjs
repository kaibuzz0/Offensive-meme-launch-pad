import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { createRoadBuildInteraction } from '../city-road-build-interaction.js';

test('equal-revision conflicting command cannot replace visible construction or report success', async () => {
  const shown = [];
  const notices = [];
  const journal = createVoxelEditJournal('road');
  for (let x = 0; x < 4; x++)
    journal.apply({ x, y: 2, z: 3, block: 'workbench' });
  const committed = {
    version: 1, seed: 'road', revision: journal.revision,
    inventory: { supplies: 2 }, journal: journal.snapshot()
  };
  const conflicting = {
    ...structuredClone(committed), inventory: { supplies: 99 }
  };
  let calls = 0;
  const interaction = createRoadBuildInteraction({
    read: async () => structuredClone(committed),
    collectRoadSupplies: async () => {
      calls++;
      return structuredClone(conflicting);
    },
    placeWorkbench: async () => { throw new Error('unexpected placement'); }
  }, {
    onCommitted: record => { shown.push(structuredClone(record)); return true; },
    onFeedback: notice => notices.push(notice)
  });
  assert.equal((await interaction.restore()).revision, 4);
  assert.equal(interaction.sceneReady, true);
  assert.equal(await interaction.collect({ x: 1, y: 0, z: 1 }), null);
  assert.equal(calls, 1);
  assert.deepEqual(shown, [committed]);
  assert.deepEqual(interaction.snapshot, committed);
  assert.equal(notices.some(note => note.kind === 'error' && /Conflicting construction snapshot/.test(note.message)), true);
  assert.equal(notices.some(note => note.kind === 'success'), false);
  assert.equal(interaction.busy, false);
  assert.equal(await interaction.refreshScene({ force: true }), true);
  assert.deepEqual(shown, [committed, committed]);
  assert.equal(calls, 1);
});
