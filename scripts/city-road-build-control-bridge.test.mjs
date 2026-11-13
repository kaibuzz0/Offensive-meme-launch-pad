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
  target.fire('keydown', { key: 'e', target: { tagName: 'BUTTON' } });
  target.fire('keydown', { key: 'b', target: { tagName: 'A' } });
  target.fire('keydown', { key: 'e', isComposing: true });
  target.fire('keydown', { key: 'e', keyCode: 229 });
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

test('missing durable receipt never reports a saved construction action', async () => {
  const target = events();
  const statuses = [];
  let response;
  const bridge = attachRoadBuildControls({
    interaction: {
      busy: false,
      async collect() { return response; },
      async place() { return response; }
    },
    target,
    getPlayerPose: () => ({ x: 0, y: 0, z: 0 }),
    getPlacement: () => ({ position: { x: 1, z: 1 }, groundHeight: 0, isOccupied: () => false }),
    onStatus: status => statuses.push(status)
  });
  for (response of [undefined, null, false, {}, { revision: -1 }]) {
    assert.equal(await bridge.collect(), false);
    assert.equal(statuses.at(-1).kind, 'error');
  }
  response = { revision: 1 };
  assert.equal(await bridge.place(), true);
  assert.equal(statuses.at(-1).kind, 'saved');
  assert.match(statuses.at(-1).message, /scene may need refresh/);
  bridge.dispose();
});

test('paused gameplay rejects keyboard and touch spending without sampling world', async () => {
  const target = events(), placeButton = events();
  let active = false, calls = 0, sampled = 0;
  const bridge = attachRoadBuildControls({
    interaction: {
      busy: false,
      async collect() { calls++; return { revision: calls }; },
      async place() { calls++; return { revision: calls }; }
    },
    target, placeButton,
    isGameplayActive: () => active,
    getPlayerPose: () => { sampled++; return { x: 0, y: 0, z: 0 }; },
    getPlacement: () => ({ position: { x: 1, z: 1 }, groundHeight: 0, isOccupied: () => false })
  });
  target.fire('keydown', { key: 'e' });
  placeButton.fire('click');
  assert.equal(await bridge.collect(), false);
  await tick();
  assert.equal(calls, 0);
  assert.equal(sampled, 0);
  active = true;
  assert.equal(await bridge.collect(), true);
  assert.equal(calls, 1);
  active = false;
  assert.equal(await bridge.place(), false);
  assert.equal(calls, 1);
  bridge.dispose();
});

test('inactive or failing activity guard leaves keyboard shortcuts available to menus', async () => {
  const target = events();
  let active = false, throws = false, prevented = 0, commands = 0;
  const bridge = attachRoadBuildControls({
    interaction: {
      busy: false,
      async collect() { commands++; return { revision: commands }; },
      async place() { commands++; return { revision: commands }; }
    },
    target,
    isGameplayActive: () => { if (throws) throw new Error('scene not ready'); return active; },
    getPlayerPose: () => ({ x: 0, y: 0, z: 0 }),
    getPlacement: () => ({ position: { x: 1, z: 1 }, groundHeight: 0, isOccupied: () => false })
  });
  const key = letter => target.fire('keydown', { key: letter, preventDefault() { prevented++; } });
  key('e');
  assert.equal(prevented, 0);
  throws = true;
  key('b');
  assert.equal(prevented, 0);
  assert.equal(await bridge.collect(), false);
  throws = false;
  active = true;
  key('e');
  await tick();
  assert.equal(prevented, 1);
  assert.equal(commands, 1);
  bridge.dispose();
});

test('detached scene does not receive late durable completion status', async () => {
  const target = events(), statuses = [];
  let finish;
  const bridge = attachRoadBuildControls({
    interaction: {
      busy: false,
      collect() { return new Promise(resolve => { finish = resolve; }); },
      async place() { throw new Error('unexpected placement'); }
    },
    target,
    getPlayerPose: () => ({ x: 0, y: 0, z: 0 }),
    getPlacement: () => ({ position: { x: 1, z: 1 }, groundHeight: 0, isOccupied: () => false }),
    onStatus: status => statuses.push(status)
  });
  const pending = bridge.collect();
  bridge.dispose();
  finish({ revision: 2 });
  assert.equal(await pending, true); // Durable write may finish; detached UI stays silent.
  assert.deepEqual(statuses, []);
});

test('nested editable controls do not trigger construction shortcuts', async () => {
  const target = events();
  let calls = 0, prevented = 0;
  const bridge = attachRoadBuildControls({
    interaction: {
      busy: false,
      async collect() { calls++; return { revision: calls }; },
      async place() { calls++; return { revision: calls }; }
    },
    target,
    getPlayerPose: () => ({ x: 0, y: 0, z: 0 }),
    getPlacement: () => ({ position: { x: 1, z: 1 }, groundHeight: 0, isOccupied: () => false })
  });
  const fire = node => target.fire('keydown', {
    key: 'e', target: node, preventDefault() { prevented++; }
  });
  fire({ tagName: 'SPAN', parentElement: { tagName: 'DIV', isContentEditable: true } });
  fire({ tagName: 'SPAN', parentElement: { tagName: 'BUTTON' } });
  fire({ tagName: 'SPAN', host: { tagName: 'INPUT' } });
  // Shadow DOM retargeting can expose only the host as event.target.
  target.fire('keydown', { key: 'e', target: { tagName: 'GAME-HUD' },
    composedPath: () => [{ tagName: 'INPUT' }, { tagName: 'GAME-HUD' }],
    preventDefault() { prevented++; } });
  assert.equal(calls, 0);
  assert.equal(prevented, 0);
  fire({ tagName: 'CANVAS' });
  await tick();
  assert.equal(calls, 1);
  assert.equal(prevented, 1);
  bridge.dispose();
});

test('invalid live player or placement queries never reach durable commands', async () => {
  const target = events(), statuses = [];
  let pose = { x: NaN, y: 0, z: 0 };
  let placement = null;
  let writes = 0;
  const bridge = attachRoadBuildControls({
    target,
    interaction: {
      busy: false,
      async collect() { writes++; return { revision: writes }; },
      async place() { writes++; return { revision: writes }; }
    },
    getPlayerPose: () => pose,
    getPlacement: () => placement,
    onStatus: event => statuses.push(event)
  });
  assert.equal(await bridge.collect(), false);
  assert.equal(writes, 0);
  pose = { x: 0, y: 0, z: 0 };
  assert.equal(await bridge.place(), false);
  assert.equal(writes, 0);
  placement = { position: { x: 1, z: Infinity }, groundHeight: 0, isOccupied: () => false };
  assert.equal(await bridge.place(), false);
  assert.equal(writes, 0);
  placement = { position: { x: 1, z: 2 }, groundHeight: 0, isOccupied: () => false };
  assert.equal(await bridge.place(), true);
  assert.equal(writes, 1);
  assert.equal(statuses.at(-1).kind, 'saved');
  bridge.dispose();
});


test('async activity guards fail closed for keyboard, touch and direct actions', async () => {
  const target = events(), placeButton = events();
  let writes = 0, prevented = 0, sampled = 0;
  const bridge = attachRoadBuildControls({
    target, placeButton,
    interaction: {
      busy: false,
      async collect() { writes++; return { revision: writes }; },
      async place() { writes++; return { revision: writes }; }
    },
    // A Promise is truthy, but must never authorize resource spending.
    isGameplayActive: async () => true,
    getPlayerPose: () => { sampled++; return { x: 0, y: 0, z: 0 }; },
    getPlacement: () => ({ position: { x: 1, z: 1 }, groundHeight: 0, isOccupied: () => false })
  });
  target.fire('keydown', { key: 'e', preventDefault() { prevented++; } });
  placeButton.fire('click');
  assert.equal(await bridge.collect(), false);
  assert.equal(await bridge.place(), false);
  await tick();
  assert.equal(writes, 0);
  assert.equal(sampled, 0);
  assert.equal(prevented, 0);
  bridge.dispose();
});
