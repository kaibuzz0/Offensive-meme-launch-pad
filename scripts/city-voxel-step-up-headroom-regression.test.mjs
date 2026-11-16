import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function makePlayer(obstructs) {
  const context = {};
  vm.runInNewContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), context);
  const world = {
    PLAYER_HEIGHT: 1.8, SEA_LEVEL: -100,
    surfaceAt: (x) => ({ height: x >= 1 ? 1 : 0 }),
    structuralObstructs: obstructs,
  };
  return context.CityVoxelPhysics.createController(world, { x: 0, z: 0 });
}

test('terrain step-up cannot pass through a thin edited roof between feet heights', () => {
  const player = makePlayer((_x, y) => y >= 1.4 && y <= 1.5);
  for (let i = 0; i < 12; i++) player.tick({ right: 1 }, .05);
  assert.ok(player.snapshot().x < .75, 'capsule must not climb through roof at step boundary');
  assert.equal(player.snapshot().y, 1);
});

test('clear headroom permits stepping onto raised terrain', () => {
  const player = makePlayer(() => false);
  for (let i = 0; i < 12; i++) player.tick({ right: 1 }, .05);
  assert.ok(player.snapshot().x > 1, 'unobstructed terrain step should be reachable');
  assert.equal(player.snapshot().y, 2);
});

test('unknown occupancy during lift blocks step without throwing', () => {
  const player = makePlayer((_x, y) => y >= 1.4 && y <= 1.5 ? undefined : false);
  for (let i = 0; i < 12; i++) assert.doesNotThrow(() => player.tick({ right: 1 }, .05));
  assert.ok(player.snapshot().x < .75);
});

test('step-up sweeps intermediate gate headroom as well as structural roofs', () => {
  const context = {};
  vm.runInNewContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), context);
  const world = {
    PLAYER_HEIGHT: 1.8, SEA_LEVEL: -100,
    surfaceAt: (x) => ({ height: x >= 1 ? 1 : 0 }),
    structuralObstructs: () => false,
    gateRoad: { obstructs: (_x, y) => y >= 1.4 && y <= 1.5 },
  };
  const player = context.CityVoxelPhysics.createController(world, { x: 0, z: 0 });
  for (let i = 0; i < 12; i++) player.tick({ right: 1 }, .05);
  assert.ok(player.snapshot().x < .75, 'thin gate overhead must block terrain lift');
  assert.equal(player.snapshot().y, 1);
});
