import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const source = readFileSync(fileURLToPath(new URL('../city-voxel-physics.js', import.meta.url)), 'utf8');
const context = {globalThis: {}};
vm.runInNewContext(source, context);
const createController = context.globalThis.CityVoxelPhysics.createController;
const makeWorld = (editObstructs) => ({
  PLAYER_HEIGHT: 7.2, SEA_LEVEL: -100,
  surfaceAt: () => ({height: -1}),
  gateRoad: {obstructs: () => false},
  caveRoomAt: () => null,
  editObstructs
});

test('committed edit blocks player walking and teleport at all render detail levels', () => {
  for (const detail of ['low', 'high']) {
    const world = {...makeWorld((x, y, z) => z > 0.5 && z < 2), visualDetail: detail};
    const player = createController(world, {x: 0, z: 0});
    for (let i = 0; i < 20; i++) player.tick({forward: 1}, 1 / 60);
    assert.ok(player.snapshot().z <= 0.5, detail);
    assert.equal(player.teleport(0, 1), false);
    assert.equal(player.teleport(0, -2), true);
  }
});

test('invalid committed edit query fails closed without retaining partial movement', () => {
  const world = makeWorld(() => 'invalid');
  const player = createController(world, {x: 0, z: 0});
  const before = player.snapshot();
  assert.throws(() => player.tick({forward: 1}, 1 / 60), /editObstructs must return a boolean/);
  assert.deepEqual({...player.snapshot()}, {...before});
  assert.throws(() => player.teleport(0, 2), /editObstructs must return a boolean/);
  assert.deepEqual({...player.snapshot()}, {...before});
});
