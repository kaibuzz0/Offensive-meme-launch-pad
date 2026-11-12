import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadBuildInteraction } from '../city-road-build-interaction.js';

test('delayed pickup response cannot repaint a newer cross-tab committed build', async () => {
  let resolvePickup;
  let durable = { revision: 1, inventory: { timber: 8 }, edits: [] };
  let commandCalls = 0;
  const displayed = [];
  const interaction = createRoadBuildInteraction({
    read: async () => structuredClone(durable),
    collectRoadSupplies: () => { commandCalls++; return new Promise(resolve => { resolvePickup = resolve; }); },
    placeWorkbench: async () => { throw new Error('unexpected placement'); }
  }, { onCommitted: record => { displayed.push(record.revision); } });
  await interaction.restore();
  const pending = interaction.collect({ x: 1, y: 2, z: 3 });
  // Simulate a newer durable write while a command response is delayed.
  durable = { revision: 3, inventory: { timber: 0 }, edits: [{ id: 'bench', x: 4, z: 5 }] };
  // The interaction lock must prevent a concurrent restore from racing the command.
  assert.equal(await interaction.restore(), null);
  resolvePickup({ revision: 2, inventory: { timber: 8 }, edits: [] });
  assert.equal((await pending).revision, 2);
  assert.equal(commandCalls, 1);
  assert.equal(await interaction.refreshScene({ force: true }), true);
  assert.deepEqual(displayed, [1, 2, 3]);
  assert.equal(interaction.snapshot.revision, 3);
  assert.equal(commandCalls, 1);
});
