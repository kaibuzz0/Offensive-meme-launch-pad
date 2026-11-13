import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadBuildInteraction } from '../city-road-build-interaction.js';

test('cross-tab placement conflict restores winner without replaying resource spending', async () => {
  const original = { revision: 2, inventory: { supplies: 8 }, edits: [] };
  const winner = { revision: 3, inventory: { supplies: 0 }, edits: [{ id: 'bench', x: 4, z: 8 }] };
  let durable = structuredClone(original);
  let placeCalls = 0;
  const shown = [];
  const notices = [];
  const interaction = createRoadBuildInteraction({
    read: async () => structuredClone(durable),
    collectRoadSupplies: async () => { throw new Error('pickup must not be replayed'); },
    placeWorkbench: async () => {
      placeCalls++;
      durable = structuredClone(winner);
      throw new Error('building changed in another session; retry');
    }
  }, {
    onCommitted: snapshot => { shown.push(structuredClone(snapshot)); },
    onFeedback: notice => notices.push(notice)
  });
  assert.deepEqual(await interaction.restore(), original);
  assert.equal(await interaction.place({
    player: { x: 4, y: 1, z: 8 },
    position: { x: 4, z: 8 },
    groundHeight: 0,
    isOccupied: () => false
  }), null);
  assert.equal(placeCalls, 1);
  assert.deepEqual(interaction.snapshot, winner);
  assert.deepEqual(shown, [original, winner]);
  assert.equal(notices.some(n => n.kind === 'success'), false);
  assert.equal(notices.some(n => n.kind === 'error' && /changed in another session/.test(n.message)), true);
  assert.equal(interaction.busy, false);
  assert.equal(await interaction.refreshScene({ force: true }), true);
  assert.equal(placeCalls, 1);
  assert.deepEqual(shown.at(-1), winner);
});
