import test from 'node:test';
import assert from 'node:assert/strict';
import { attachRoadBuildControls } from '../city-road-build-control-bridge.js';

function emitter() {
  const listeners = new Map();
  return {
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name, callback) {
      if (listeners.get(name) === callback) listeners.delete(name);
    },
    click(event) { listeners.get('click')?.(event); }
  };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('mobile construction buttons prevent parent form submission before durable action', async () => {
  const target = emitter(), collectButton = emitter(), placeButton = emitter();
  let collected = 0, placed = 0, prevented = 0;
  const bridge = attachRoadBuildControls({
    target, collectButton, placeButton,
    interaction: {
      busy: false,
      async collect() { collected++; return { revision: collected }; },
      async place() { placed++; return { revision: placed }; }
    },
    getPlayerPose: () => ({ x: 0, y: 0, z: 0 }),
    getPlacement: () => ({
      position: { x: 1, z: 1 }, groundHeight: 0, isOccupied: () => false
    })
  });
  const event = { preventDefault() { prevented++; } };
  collectButton.click(event);
  await tick();
  placeButton.click(event);
  await tick();
  assert.equal(prevented, 2);
  assert.equal(collected, 1);
  assert.equal(placed, 1);
  bridge.dispose();
});
