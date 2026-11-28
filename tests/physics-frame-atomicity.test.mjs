import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');
function setup() {
 const context = { console };
 context.globalThis = context;
 vm.runInNewContext(source, context);
 let calls = 0;
 let fail = false;
 const world = {
  PLAYER_HEIGHT: 1.8, SEA_LEVEL: -100,
  surfaceAt() {
   calls++;
   if (fail && calls > 25) throw Error('world query unavailable');
   return { height: 0 };
  }
 };
 const controller = context.CityVoxelPhysics.createController(world, { x: 0, z: 0 });
 return { controller, setFailure(value) { fail = value; calls = 0; } };
}

test('failed later substep rolls back all frame movement and accumulated time', () => {
 const { controller, setFailure } = setup();
 setFailure(true);
 assert.throws(() => controller.tickFrame({ forward: 1 }, 2 / 60), /world query unavailable/);
 assert.equal(controller.snapshot().z, 0);
 setFailure(false);
 const idle = controller.tickFrame({ forward: 1 }, 0);
 assert.equal(idle.steps, 0);
 assert.equal(controller.snapshot().z, 0);
 const recovered = controller.tickFrame({ forward: 1 }, 2 / 60);
 assert.equal(recovered.steps, 2);
 assert.ok(controller.snapshot().z > 0);
});
