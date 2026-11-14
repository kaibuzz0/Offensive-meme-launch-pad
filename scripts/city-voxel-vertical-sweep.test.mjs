import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function controller(world) {
 const sandbox = {};
 vm.runInNewContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), sandbox);
 return sandbox.CityVoxelPhysics.createController(world, { x: 0, z: 0 });
}
function worldWithRoof() {
 return {
  PLAYER_HEIGHT: 1.8,
  SEA_LEVEL: -100,
  surfaceAt: () => ({ height: 0 }),
  // A thin structural slab blocks an intermediate capsule pose, while the
  // jump's endpoint is clear. An endpoint-only test would tunnel through.
  structuralObstructs: (_x, y) => y >= 1.35 && y <= 1.55,
 };
}
test('fast upward movement cannot tunnel through a thin structural ceiling', () => {
 const player = controller(worldWithRoof());
 const before = player.snapshot();
 const after = player.tick({ jump: true }, .05);
 assert.equal(before.y, 1);
 assert.ok(after.y < 1.35, 'feet must stop before the slab');
 assert.equal(after.vy, 0);
});
test('vertical movement proceeds when the structural query reports clear', () => {
 const world = worldWithRoof();
 world.structuralObstructs = () => false;
 const player = controller(world);
 const after = player.tick({ jump: true }, .05);
 assert.ok(after.y > 1.55, 'unobstructed jump should reach the endpoint');
});
test('a failing intermediate roof query cannot escape the simulation', () => {
 const world = worldWithRoof();
 world.structuralObstructs = (_x, y) => {
  if(y >= 1.35 && y <= 1.55) throw Error('chunk unavailable');
  return false;
 };
 const player = controller(world);
 assert.doesNotThrow(() => player.tick({ jump: true }, .05));
 assert.ok(player.snapshot().y < 1.35);
});
