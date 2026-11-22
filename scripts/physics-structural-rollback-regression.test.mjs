import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');
function controller(world) {
 const context = {};
 runInNewContext(source, context);
 return context.CityVoxelPhysics.createController(world, {x: 0, z: 0, y: 1});
}
const baseWorld = () => ({
 PLAYER_HEIGHT: 1.8, SEA_LEVEL: -100,
 surfaceAt: () => ({height: 0}), caveRoomAt: () => null,
});

test('teleport rejects a solid destination without mutating the player', () => {
 const world = baseWorld();
 world.gateRoad = {obstructs: (x) => x >= 2};
 const c = controller(world);
 const before = {...c.snapshot()};
 assert.equal(c.teleport(3, 0), false);
 assert.deepEqual({...c.snapshot()}, before);
 assert.equal(c.teleport(1, 0), true);
 assert.equal(c.snapshot().x, 1);
});

test('failed movement query rolls back both axes and reports failed work', () => {
 const world = baseWorld();
 let fail = false;
 world.gateRoad = {obstructs: (x, y, z) => {
  if (fail && z > 0) throw Error('world query unavailable');
  return false;
 }};
 const c = controller(world);
 const before = {...c.snapshot()};
 fail = true;
 assert.throws(() => c.tick({right: 1, forward: 1}, 0.05), /world query unavailable/);
 assert.deepEqual({...c.snapshot()}, before);
 assert.equal(c.profileLastTick().failed, true);
 fail = false;
 assert.ok(c.tick({right: 1}, 0.05).x > before.x);
 assert.equal(c.profileLastTick().failed, false);
});
