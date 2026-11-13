import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadBuildInteraction } from '../city-road-build-interaction.js';

test('detached cold-start refresh restores durable construction without spending resources', async () => {
  const saved = { revision: 4, inventory: { supplies: 0 }, edits: [{ id: 'workbench', x: 2, z: 3 }] };
  let reads = 0;
  const rendered = [];
  const interaction = createRoadBuildInteraction({
    read: async () => { reads++; return structuredClone(saved); },
    collectRoadSupplies: async () => { throw new Error('must not collect'); },
    placeWorkbench: async () => { throw new Error('must not place'); }
  }, { onCommitted: record => { rendered.push(record); return true; } });

  const refresh = interaction.refreshScene;
  assert.equal(await refresh(), true);
  assert.equal(reads, 1);
  assert.deepEqual(rendered, [saved]);
  assert.deepEqual(interaction.snapshot, saved);
  assert.equal(interaction.busy, false);
  assert.equal(await refresh(), true);
  assert.equal(reads, 2);
  assert.equal(rendered.length, 1);
});
