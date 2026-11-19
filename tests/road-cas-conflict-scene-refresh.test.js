import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { createRoadBuildInteraction } from '../city-road-build-interaction.js';

test('CAS conflict refreshes durable scene without replaying a spend', async () => {
  const seed = 'conflict-refresh';
  const initial = {
    version: 1, seed, revision: 0, inventory: { supplies: 0 },
    journal: createVoxelEditJournal(seed).snapshot()
  };
  const journal = createVoxelEditJournal(seed, initial.journal);
  const staged = journal.previewBatch([{ x: 0, y: 0, z: 0, block: 'salvaged-crate' }], 0);
  const committed = {
    ...initial, revision: staged.revision, inventory: { supplies: 8 },
    journal: staged.snapshot
  };
  let durable = initial;
  let attempts = 0;
  const presented = [];
  const feedback = [];
  const interaction = createRoadBuildInteraction({
    read: async () => structuredClone(durable),
    collectRoadSupplies: async () => {
      attempts++;
      durable = structuredClone(committed); // another tab wins the CAS
      throw new Error('salvage transaction conflict');
    },
    placeWorkbench: async () => { throw new Error('unexpected placement'); }
  }, {
    onCommitted: async record => { presented.push(record); return true; },
    onFeedback: event => feedback.push(event)
  });
  await interaction.restore();
  assert.equal(await interaction.collect({ x: 0, y: 0, z: 0 }), null);
  assert.equal(attempts, 1);
  assert.equal(interaction.snapshot.revision, 1);
  assert.equal(interaction.snapshot.inventory.supplies, 8);
  assert.equal(presented.at(-1).revision, 1);
  assert.equal(interaction.sceneReady, true);
  assert.equal(feedback.at(-1).kind, 'error');
  assert.equal(attempts, 1); // refresh is read-only, never retries pickup
});
