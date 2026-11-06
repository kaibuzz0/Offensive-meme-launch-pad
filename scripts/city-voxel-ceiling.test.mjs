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
  let after = player.tick({jump: true}, 0.05);
  assert.ok(after.y > 2 && after.vy > 0);
  for (let i = 0; i < 10 && after.vy > 0; i++) after = player.tick({}, 0.05);
  assert.equal(after.y, 12 - caveWorld().PLAYER_HEIGHT);
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
  // Controllers spawn on the floor. Swim up before testing a free descent.
  for (let i = 0; i < 100; i++) {
    a.tick({jump: true}, .05);
    b.tick({jump: true}, .05);
  }
  for (let i = 0; i < 120; i++) {
    a.tick({}, .05);
    b.tick({}, .05);
  }
  assert.equal(a.snapshot().vy, -3);
  assert.deepEqual(a.snapshot(), b.snapshot());
});

test('underground jump checks adjacent roof under capsule corner', () => {
  const world = {
    PLAYER_HEIGHT: 7.2, SEA_LEVEL: -100,
    surfaceAt: () => ({height: 20}),
    caveRoomAt: (x) => ({floor: 2, ceiling: x === 1 ? 9.5 : 12, exposed: false})
  };
  const player = createController(world, {x: 0.8, z: 0, y: 2});
  const after = player.tick({jump: true}, 0.05);
  assert.ok(after.y <= 9.5 - world.PLAYER_HEIGHT + 1e-9,
    'neighboring low cave roof must stop head before penetration');
  assert.equal(after.vy, 0);
});

test('surface jump over adjacent buried gallery remains unrestricted', () => {
  const world = {
    PLAYER_HEIGHT: 7.2, SEA_LEVEL: -100,
    surfaceAt: () => ({height: 20}),
    caveRoomAt: (x) => ({floor: 2, ceiling: x === 1 ? 9.5 : 12, exposed: false})
  };
  const player = createController(world, {x: 0.8, z: 0});
  const after = player.tick({jump: true}, 0.05);
  assert.ok(after.y > 21, 'surface must not snap into corner cave roof');
});

test('swept cave ceiling stops a full roof crossing in one tick', () => {
  // Small test capsule exposes the fast-ascent tunneling case that an
  // endpoint-only roof check misses; gameplay capsule uses the same sweep.
  const world = {
    PLAYER_HEIGHT: 0.1, SEA_LEVEL: -100,
    surfaceAt: () => ({height: 20}),
    caveRoomAt: () => ({floor: 2, ceiling: 2.4, exposed: false})
  };
  const player = createController(world, {x: 0, z: 0, y: 2});
  const after = player.tick({jump: true}, 0.05);
  assert.ok(after.y <= 2.4 - world.PLAYER_HEIGHT + 1e-9,
    'feet must not tunnel above a roof in a single frame');
  assert.equal(after.vy, 0);
});

test('swept roof guard still permits jumps on the surface', () => {
  const world = {
    PLAYER_HEIGHT: 0.1, SEA_LEVEL: -100,
    surfaceAt: () => ({height: 20}),
    caveRoomAt: () => ({floor: 2, ceiling: 2.4, exposed: false})
  };
  const player = createController(world, {x: 0, z: 0});
  const after = player.tick({jump: true}, 0.05);
  assert.ok(after.y > 21);
  assert.ok(after.vy > 0);
});
