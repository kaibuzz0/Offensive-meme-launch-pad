import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadBuildInteraction } from '../city-road-build-interaction.js';

// A failed scene presentation is not a failed durable transaction.
test('renderer rejection recovers committed geometry without spending twice', async () => {
  let durable = { revision: 0, inventory: { timber: 8 }, edits: [] };
  let spendCalls = 0;
  let renderReady = false;
  const presented = [];
  const commands = {
    read: async () => structuredClone(durable),
    collectRoadSupplies: async () => { throw new Error('unexpected pickup'); },
    placeWorkbench: async () => {
      spendCalls++;
      durable = { revision: 1, inventory: { timber: 0 }, edits: [{ id: 'bench', x: 4, z: 8 }] };
      return structuredClone(durable);
    }
  };
  const interaction = createRoadBuildInteraction(commands, {
    onCommitted: async record => {
      presented.push(record.revision);
      return renderReady;
    }
  });
  await interaction.restore();
  const saved = await interaction.place({ player: { x: 0, y: 0, z: 0 }, position: { x: 4, z: 8 } });
  assert.equal(saved.revision, 1);
  assert.equal(spendCalls, 1);
  assert.equal(interaction.snapshot.inventory.timber, 0);
  renderReady = true;
  assert.equal(await interaction.refreshScene(), true);
  assert.deepEqual(presented, [0, 1, 1]);
  assert.equal(spendCalls, 1);
  assert.deepEqual(interaction.snapshot.edits, [{ id: 'bench', x: 4, z: 8 }]);
});

test('renderer reset replays newer cross-tab state without replaying commands', async () => {
  let durable = { revision: 2, inventory: { timber: 3 }, edits: [] };
  let writes = 0;
  const presented = [];
  const interaction = createRoadBuildInteraction({
    read: async () => structuredClone(durable),
    collectRoadSupplies: async () => { writes++; throw new Error('unexpected pickup'); },
    placeWorkbench: async () => { writes++; throw new Error('unexpected placement'); }
  }, { onCommitted: record => { presented.push(record.revision); } });
  await interaction.restore();
  durable = { revision: 3, inventory: { timber: 1 }, edits: [{ id: 'bench', x: 8, z: 8 }] };
  assert.equal(await interaction.refreshScene({ force: true }), true);
  assert.deepEqual(presented, [2, 3]);
  assert.equal(interaction.snapshot.revision, 3);
  assert.equal(writes, 0);
});
