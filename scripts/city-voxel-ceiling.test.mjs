import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), context);
const {createController} = context.CityVoxelPhysics;

function caveWorld() {
  return {
    PLAYER_HEIGHT: 7.2,
    SEA_LEVEL: -100,
    surfaceAt: () => ({height: 20}),
    caveRoomAt: () => ({floor: 2, ceiling: 12, exposed: false})
  };
}

test('surface jump remains above underground gallery roof', () => {
  const player = createController(caveWorld(), {x: 0, z: 0});
  const after = player.tick({jump: true}, 0.05);
  assert.ok(after.y > 21, 'surface jump must not be snapped inside cave');
  assert.equal(after.grounded, false);
});

test('underground jump is capped by solid gallery ceiling', () => {
  const player = createController(caveWorld(), {x: 0, z: 0, y: 0});
  assert.equal(player.snapshot().y, 2);
  const after = player.tick({jump: true}, 0.05);
  assert.ok(after.y <= 12 - caveWorld().PLAYER_HEIGHT + 1e-9);
  assert.equal(after.vy, 0);
});

test('surface movement over a buried gallery does not enter it', () => {
  const player = createController(caveWorld(), {x: 0, z: 0});
  for (let i = 0; i < 20; i++) player.tick({forward: 1}, 0.05);
  assert.ok(player.snapshot().y >= 11);
});


test('fast movement cannot tunnel through a one-cell-heightfield wall', () => {
  const world = {
    PLAYER_HEIGHT: 7.2,
    SEA_LEVEL: -100,
    surfaceAt: (x) => ({height: x === 1 ? 40 : 0})
  };
  const player = createController(world, {x: 0, z: 0});
  const after = player.tick({right: 1}, 0.05);
  assert.ok(after.x < 1, 'substep sweep must stop before the intervening wall');
  assert.equal(after.y, 1);
});

test('underground movement rejects cave boundary with insufficient headroom', () => {
  const world = {
    PLAYER_HEIGHT: 7.2,
    SEA_LEVEL: -100,
    surfaceAt: () => ({height: 20}),
    caveRoomAt: (x) => x < 1
      ? ({floor: 2, ceiling: 12, exposed: false})
      : ({floor: 2, ceiling: 8, exposed: false})
  };
  const player = createController(world, {x: 0, z: 0, y: 2});
  const after = player.tick({right: 1}, 0.05);
  assert.ok(after.x < 1, 'player must not clip into a gallery lower than head height');
  assert.equal(after.y, 2);
});

test('underground movement continues through a sufficiently tall gallery', () => {
  const world = {
    PLAYER_HEIGHT: 7.2,
    SEA_LEVEL: -100,
    surfaceAt: () => ({height: 20}),
    caveRoomAt: () => ({floor: 2, ceiling: 12, exposed: false})
  };
  const player = createController(world, {x: 0, z: 0, y: 2});
  const after = player.tick({right: 1}, 0.05);
  assert.ok(after.x > 0.5, 'traversable cave remains walkable');
  assert.equal(after.y, 2);
});

test('opt-in water volume supports ascent without changing dry below-sea terrain', () => {
  const base = {PLAYER_HEIGHT: 7.2, SEA_LEVEL: 30, surfaceAt: () => ({height: 0})};
  const dry = createController({...base, isWaterAt: () => false}, {x: 0, z: 0});
  dry.tick({jump: true}, .05);
  assert.ok(dry.snapshot().y > 1.5, 'dry terrain must retain normal jumping');
  const wet = createController({...base, isWaterAt: () => true}, {x: 0, z: 0});
  for (let i = 0; i < 10; i++) wet.tick({jump: true}, .05);
  assert.ok(wet.snapshot().y > 1, 'swimmer can ascend');
  assert.ok(wet.snapshot().vy <= 5, 'ascent is capped');
});

test('swimming buoyancy limits sinking speed and remains deterministic', () => {
  const world = {
    PLAYER_HEIGHT: 7.2, SEA_LEVEL: -100,
    surfaceAt: () => ({height: -100}),
    isWaterAt: () => true
  };
  const a = createController(world, {x: 0, z: 0});
  const b = createController(world, {x: 0, z: 0});
  for (let i = 0; i < 120; i++) {
    a.tick({}, .05);
    b.tick({}, .05);
  }
  assert.equal(a.snapshot().vy, -3);
  assert.deepEqual(a.snapshot(), b.snapshot());
});
