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

test('automatic visual-detail changes do not alter shared world collision or player trajectory', () => {
  // Distinct render budgets must never create distinct gameplay geometry.
  // Use a real obstruction callback and terrain rise, not two controllers
  // referencing the same unchanged world as the previous test did.
  const makeWorld = (detail) => ({
    ...world,
    visualDetail: detail,
    renderDistance: detail === 'minimal' ? 2 : 24,
    surfaceAt: (x, z) => ({height: x >= 3 ? 1 : 0}),
    gateRoad: {
      obstructs: (x, y, z, height, radius) =>
        x + radius >= 1.5 && x - radius <= 1.75 && Math.abs(z) > .65,
    },
  });
  const low = root.CityVoxelPhysics.createController(makeWorld('minimal'), {x: 0, z: 0});
  const high = root.CityVoxelPhysics.createController(makeWorld('full'), {x: 0, z: 0});
  const inputs = [
    {right: 1, yaw: 0},
    {forward: 1, right: 1, yaw: 0},
    {forward: 1, yaw: Math.PI / 2, jump: true},
    {right: -1, yaw: 0},
  ];
  for (const input of inputs) {
    for (let i = 0; i < 30; i++) {
      const a = low.tick(input, 1 / 60);
      const b = high.tick(input, 1 / 60);
      assert.deepEqual({...a}, {...b}, 'render budget changed gameplay physics');
    }
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

test('local movement query work stays bounded independently of distant scene population', () => {
  // The controller must query only its local world adapter, never traverse
  // global actors or render meshes. Counts are a reproducible Node baseline,
  // not a physical-device performance measurement.
  function run(distantActors) {
    let surfaceQueries = 0;
    let obstructionQueries = 0;
    const scene = {
      ...world,
      distantActors: Array.from({length: distantActors}, (_, i) => ({id: i})),
      surfaceAt: () => { surfaceQueries++; return {height: 0}; },
      gateRoad: {obstructs: () => { obstructionQueries++; return false; }},
    };
    const player = root.CityVoxelPhysics.createController(scene, {x: 0, z: 0});
    for (let i = 0; i < 120; i++) player.tick({forward: 1, yaw: 0}, 1 / 60);
    return {position: player.snapshot(), surfaceQueries, obstructionQueries};
  }
  const empty = run(0);
  const populated = run(10000);
  assert.deepEqual({...populated.position}, {...empty.position});
  assert.equal(populated.surfaceQueries, empty.surfaceQueries);
  assert.equal(populated.obstructionQueries, empty.obstructionQueries);
  assert.ok(empty.surfaceQueries < 5000, 'unexpectedly high local terrain query count');
});


test('failed teleport outside loaded world preserves player state and collision continuity', () => {
  const boundedWorld = {
    ...world,
    surfaceAt: (x, z) => (Math.abs(x) <= 8 && Math.abs(z) <= 8 ? {height: 0} : null),
  };
  const player = root.CityVoxelPhysics.createController(boundedWorld, {x: 0, z: 0});
  const before = player.snapshot();
  assert.equal(player.teleport(100, 100), false);
  assert.deepEqual({...player.snapshot()}, {...before});
  assert.equal(player.teleport(2, 2), true);
  assert.equal(player.snapshot().x, 2);
  assert.equal(player.snapshot().z, 2);
  player.tick({right: 1, yaw: 0}, 1 / 60);
  assert.ok(player.snapshot().x > 2, 'movement failed after a rejected teleport');
});
