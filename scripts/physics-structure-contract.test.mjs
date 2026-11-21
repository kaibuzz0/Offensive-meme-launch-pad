import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const context = {};
runInNewContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), context);
const createController = context.CityVoxelPhysics.createController;
function world(obstructs) {
 return { PLAYER_HEIGHT: 7.2, SEA_LEVEL: -100,
  surfaceAt: () => ({height: 0}),
  gateRoad: { obstructs } };
}
test('player teleport rejects malformed structure occupancy without mutating pose', () => {
 const controller = createController(world(() => 'false'), {x: 0, z: 0});
 const before = controller.snapshot();
 assert.throws(() => controller.teleport(3, 0), /must return a boolean/);
 assert.deepEqual({...controller.snapshot()}, {...before});
});
test('player movement rejects malformed structure occupancy and rolls back both axes', () => {
 let calls = 0;
 const controller = createController(world(() => ++calls > 1 ? null : false), {x: 0, z: 0});
 const before = controller.snapshot();
 assert.throws(() => controller.tick({right: 1, forward: 1}, 0.05), /must return a boolean/);
 assert.deepEqual({...controller.snapshot()}, {...before});
 assert.equal(controller.profileLastTick().failed, true);
});
test('valid boolean structure occupancy blocks or permits player travel', () => {
 const blocked = createController(world(() => true), {x: 0, z: 0});
 assert.equal(blocked.teleport(2, 0), false);
 assert.equal(blocked.snapshot().x, 0);
 const clear = createController(world(() => false), {x: 0, z: 0});
 assert.equal(clear.teleport(2, 0), true);
 assert.equal(clear.snapshot().x, 2);
});
