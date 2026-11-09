import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), context);
const { createController } = context.CityVoxelPhysics;

function makeWorld() {
 const roof = { x: -3, y: 10, z: -3, w: 6, h: 2, d: 12, solid: true };
 return {
  PLAYER_HEIGHT: 1.8, SEA_LEVEL: -100,
  surfaceAt(x, z) { return { height: z < 0 ? 11 : -1 }; },
  gateRoad: { parts: [roof], obstructs(x, y, z, height, radius) {
   return x + radius > roof.x && x - radius < roof.x + roof.w &&
    z + radius > roof.z && z - radius < roof.z + roof.d &&
    y < roof.y + roof.h && y + height > roof.y;
  } },
 };
}

test('walking along a structural roof retains grounded state and elevation', () => {
 const world = makeWorld();
 const walker = createController(world, { x: 0, z: -1 });
 assert.equal(walker.snapshot().y, 12);
 for (let i = 0; i < 30; i++) walker.tickFrame({ forward: 1, yaw: 0 }, 1 / 60);
 const state = walker.snapshot();
 assert.equal(state.grounded, true);
 assert.equal(state.y, 12);
 assert.ok(state.z > 1);
});
