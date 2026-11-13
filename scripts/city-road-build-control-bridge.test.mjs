import test from 'node:test';
import assert from 'node:assert/strict';
import { attachRoadBuildControls } from '../city-road-build-control-bridge.js';

function events() {
  const handlers = new Map();
  return {
    addEventListener(type, fn) { handlers.set(type, fn); },
    removeEventListener(type, fn) { if (handlers.get(type) === fn) handlers.delete(type); },
    fire(type, event = {}) { handlers.get(type)?.(event); },
    count() { return handlers.size; }
  };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('keyboard and touch controls use current pose, committed actions, and dispose', async () => {
  const target = events(), collectButton = events(), placeButton = events();
  let x = 1, collected = 0, placed = 0;
  const interaction = {
    busy: false,
    async collect(pose) { assert.equal(pose.x, x); collected++; return { revision: collected }; },
    async place(input) {
      assert.equal(input.player.x, x);
      assert.equal(input.position.x, 4);
      assert.equal(typeof input.isOccupied, 'function');
      placed++; return { revision: placed };
    }
  };
  const bridge = attachRoadBuildControls({
    interaction, target, collectButton, placeButton,
    getPlayerPose: () => ({ x, y: 0, z: 0 }),
    getPlacement: () => ({ position: { x: 4, z: 5 }, groundHeight: 0, isOccupied: () => false })
  });
  target.fire('keydown', { key: 'e', repeat: true });
  target.fire('keydown', { key: 'e', target: { tagName: 'INPUT' } });
  assert.equal(collected, 0);
  target.fire('keydown', { key: 'e', preventDefault() {} });
  await tick();
  assert.equal(collected, 1);
  x = 2;
  placeButton.fire('click');
  await tick();
  assert.equal(placed, 1);
  collectButton.fire('click');
  await tick();
  assert.equal(collected, 2);
  bridge.dispose();
  assert.equal(target.count() + collectButton.count() + placeButton.count(), 0);
  target.fire('keydown', { key: 'b' });
  assert.equal(placed, 1);
});

test('in-flight duplicate input cannot issue another durable command', async () => {
  const target = events();
  let release, calls = 0;
  const interaction = {
    busy: false,
    collect() { calls++; return new Promise(resolve => { release = resolve; }); },
    place() { throw new Error('unexpected placement'); }
  };
  const bridge = attachRoadBuildControls({
    interaction, target,
    getPlayerPose: () => ({ x: 0, y: 0, z: 0 }),
    getPlacement: () => ({ position: { x: 0, z: 0 }, groundHeight: 0, isOccupied: () => false })
  });
  target.fire('keydown', { key: 'e' });
  target.fire('keydown', { key: 'e' });
  assert.equal(calls, 1);
  release({ revision: 1 });
  await tick();
  bridge.dispose();
});
