import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const root = {};
vm.runInNewContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), root);
const world = {
  PLAYER_HEIGHT: 7.2, SEA_LEVEL: -100,
  surfaceAt: (x, z) => ({height: 0}),
};
const spawn = () => root.CityVoxelPhysics.createController(world, {x: 0, z: 0});

test('large stalled frame cannot advance player farther than bounded physics tick', () => {
  const stalled = spawn();
  const bounded = spawn();
  const input = {forward: 1, right: 0, yaw: 0};
  const afterStall = stalled.tick(input, 3);
  const afterBounded = bounded.tick(input, .05);
  assert.equal(afterStall.x, afterBounded.x);
  assert.equal(afterStall.z, afterBounded.z);
  assert.equal(afterStall.y, afterBounded.y);
});

test('diagonal touch axes do not increase walking speed', () => {
  const straight = spawn(), diagonal = spawn();
  const a = straight.tick({forward: 1, yaw: 0}, .05);
  const b = diagonal.tick({forward: 1, right: 1, yaw: 0}, .05);
  assert.ok(Math.abs(Math.hypot(b.x, b.z) - Math.hypot(a.x, a.z)) < 1e-9);
});

test('the controller does not depend on renderer detail or visual LOD', () => {
  const low = spawn(), high = spawn();
  const input = {forward: 1, right: .2, yaw: .3};
  for (let i = 0; i < 60; i++) {
    const a = low.tick(input, 1 / 60);
    const b = high.tick(input, 1 / 60);
    assert.deepEqual({...a}, {...b});
  }
});

test('wall collision and open doorway use the same controller sweep at desktop and touch frame rates', () => {
  const geometry = {
    ...world,
    gateRoad: {
      obstructs: (x, y, z, height, radius) =>
        x + radius >= 1 && x - radius <= 1.25 && Math.abs(z) > 0.6,
    },
  };
  function traverse(z, dt, input) {
    const controller = root.CityVoxelPhysics.createController(geometry, {x: 0, z});
    for (let i = 0; i < Math.ceil(1 / dt); i++) controller.tick(input, dt);
    return controller.snapshot();
  }
  const input = {right: 1, forward: 0, yaw: 0};
  for (const dt of [1 / 60, 1 / 30, .05]) {
    const wall = traverse(2, dt, input);
    const doorway = traverse(0, dt, input);
    assert.ok(wall.x < 1, `wall penetration at dt=${dt}: ${wall.x}`);
    assert.ok(doorway.x > 1.5, `doorway not traversable at dt=${dt}: ${doorway.x}`);
    assert.equal(wall.z, 2);
    assert.equal(doorway.z, 0);
  }
});


test('low terrain steps remain passable and tall rises block at desktop and touch rates', () => {
  const makeWorld = (height) => ({
    ...world,
    surfaceAt: (x, z) => ({height: x >= 2 ? height : 0}),
  });
  for (const dt of [1 / 60, 1 / 30, .05]) {
    for (const [height, shouldPass] of [[1, true], [5, false]]) {
      const controller = root.CityVoxelPhysics.createController(makeWorld(height), {x: 0, z: 0});
      for (let i = 0; i < Math.ceil(1 / dt); i++) {
        controller.tick({right: 1, yaw: 0}, dt);
      }
      const position = controller.snapshot();
      if (shouldPass) {
        assert.ok(position.x > 2, `low step blocked at dt=${dt}: ${position.x}`);
        assert.ok(position.y >= 2, `low step height lost at dt=${dt}: ${position.y}`);
      } else {
        assert.ok(position.x < 2, `high wall crossed at dt=${dt}: ${position.x}`);
        assert.equal(position.y, 1);
      }
    }
  }
});
