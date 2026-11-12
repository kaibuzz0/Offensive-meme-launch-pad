import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadBuildInteraction } from '../city-road-build-interaction.js';

test('failed same-revision renderer replay is retried without repeating durable commands', async () => {
  const saved = { revision: 2, inventory: { wood: 3 }, edits: [] };
  let reads = 0;
  let collects = 0;
  let places = 0;
  let renders = 0;
  let available = true;
  const commands = {
    async read() { reads++; return structuredClone(saved); },
    async collectRoadSupplies() { collects++; throw Error('unexpected pickup'); },
    async placeWorkbench() { places++; throw Error('unexpected placement'); }
  };
  const interaction = createRoadBuildInteraction(commands, {
    onCommitted: () => { renders++; return available; }
  });
  assert.deepEqual(await interaction.restore(), saved);
  assert.equal(renders, 1);
  available = false;
  assert.equal(await interaction.refreshScene({ force: true }), false);
  assert.equal(renders, 2);
  available = true;
  assert.equal(await interaction.refreshScene(), true);
  assert.equal(renders, 3, 'failed replay must invalidate previous rendered marker');
  assert.equal(reads, 3);
  assert.equal(collects, 0);
  assert.equal(places, 0);
  assert.deepEqual(interaction.snapshot, saved);
});
