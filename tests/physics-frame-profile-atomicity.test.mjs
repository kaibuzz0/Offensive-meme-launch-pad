import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');

test('failed fixed-step frame restores last successful telemetry with player state', () => {
 const context = {};
 vm.runInNewContext(source, context);
 let queries = 0;
 let fail = false;
 const world = {
  PLAYER_HEIGHT: 1.8,
  SEA_LEVEL: -100,
  surfaceAt() {
   if (fail && ++queries > 25) throw Error('terrain unavailable');
   return { height: 0 };
  }
 };
 const controller = context.CityVoxelPhysics.createController(world, { x: 0, z: 0 });
 controller.tick({ forward: 1 }, 1 / 60);
 const prior = controller.profileLastTick();
 const position = controller.snapshot();
 fail = true;
 queries = 0;
 assert.throws(() => controller.tickFrame({ forward: 1 }, 2 / 60), /terrain unavailable/);
 assert.equal(controller.profileLastTick(), prior);
 assert.deepEqual({ ...controller.snapshot() }, { ...position });
 fail = false;
 const recovered = controller.tickFrame({ forward: 1 }, 0);
 assert.equal(recovered.steps, 0);
 assert.equal(controller.profileLastTick(), prior);
});
