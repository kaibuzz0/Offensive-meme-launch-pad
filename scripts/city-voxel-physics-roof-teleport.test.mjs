import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), context);
const { createController } = context.CityVoxelPhysics;

function world() {
 const roof = { x: 4, y: 10, z: 4, w: 5, h: 2, d: 5, solid: true };
 return {
  PLAYER_HEIGHT: 1.8, SEA_LEVEL: -100,
  surfaceAt() { return { height: -1 }; },
  gateRoad: {
   parts: [roof],
   obstructs(x, y, z, height, radius) {
    return x + radius > roof.x && x - radius < roof.x + roof.w &&
     z + radius > roof.z && z - radius < roof.z + roof.d &&
     y < roof.y + roof.h && y + height > roof.y;
   }
  }
 };
}

test('explicit elevated teleport restores roof support and keeps the player grounded', () => {
 const controller = createController(world(), { x: 0, z: 0 });
 assert.equal(controller.teleport(6, 6, 12), true);
 assert.equal(controller.snapshot().y, 12);
 assert.equal(controller.snapshot().grounded, true);
 const frame = controller.tickFrame({}, 1 / 60);
 assert.equal(frame.state.y, 12);
 assert.equal(frame.state.grounded, true);
});

test('ordinary teleport beneath a roof does not lift the player onto it', () => {
 const controller = createController(world(), { x: 0, z: 0 });
 assert.equal(controller.teleport(6, 6), true);
 assert.equal(controller.snapshot().y, 0);
});

test('failed elevated teleport retains previous state', () => {
 const blockedWorld = world();
 const baseObstructs = blockedWorld.gateRoad.obstructs;
 blockedWorld.gateRoad.obstructs = (x, y, z, height, radius) =>
  (x === 6 && z === 6) || baseObstructs(x, y, z, height, radius);
 const controller = createController(blockedWorld, { x: 0, z: 0 });
 const before = controller.snapshot();
 assert.equal(controller.teleport(6, 6, 12), false);
 assert.deepEqual({ ...controller.snapshot() }, { ...before });
});
