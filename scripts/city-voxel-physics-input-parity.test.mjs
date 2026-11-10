import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const context = {};
runInNewContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), context);
const create = context.CityVoxelPhysics.createController;
const world = (height = () => 0, obstructs = () => false) => ({
  PLAYER_HEIGHT: 1.8, SEA_LEVEL: -100,
  surfaceAt(x, z) { return { height: height(x, z) }; },
  gateRoad: { obstructs }
});
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('desktop and touch normalized commands produce identical fixed-step motion', () => {
  const keyboard = create(world(), { x: 0, z: 0 });
  const touch = create(world(), { x: 0, z: 0 });
  for (let i = 0; i < 120; i++) {
    const a = keyboard.tick({ forward: 1, right: 1, yaw: Math.PI / 4 }, 1 / 60);
    const b = touch.tick({ forward: 1, right: 1, yaw: Math.PI / 4 }, 1 / 60);
    near(a.x, b.x); near(a.z, b.z); near(a.y, b.y);
  }
});

test('frame stall is bounded to 50ms and cannot teleport through a narrow obstruction', () => {
  const barrier = (x) => x > 0.35 && x < 0.9;
  const player = create(world(() => 0, barrier), { x: 0, z: 0 });
  const a = player.tick({ right: 1 }, 10);
  assert.ok(a.x <= 0.35, `crossed barrier at ${a.x}`);
  assert.ok(a.x >= 0);
});

test('steep rise is blocked while small steps are traversable', () => {
  const terrain = x => x >= 2 ? 4 : x >= 1 ? 1 : 0;
  const player = create(world(terrain), { x: 0, z: 0 });
  for (let i = 0; i < 40; i++) player.tick({ right: 1 }, 1 / 60);
  const state = player.snapshot();
  assert.ok(state.x < 2, `climbed steep wall at ${state.x}`);
  assert.ok(state.x >= 0.5, `failed to approach small step at ${state.x}`);
});

test('obstruction callback remains active regardless of visual detail settings', () => {
  const obstruction = (x) => x >= 0.5;
  const high = create({ ...world(() => 0, obstruction), visualDetail: 'high' }, { x: 0, z: 0 });
  const low = create({ ...world(() => 0, obstruction), visualDetail: 'low' }, { x: 0, z: 0 });
  for (let i = 0; i < 30; i++) {
    const a = high.tick({ right: 1 }, 1 / 60);
    const b = low.tick({ right: 1 }, 1 / 60);
    near(a.x, b.x); near(a.z, b.z);
  }
});
