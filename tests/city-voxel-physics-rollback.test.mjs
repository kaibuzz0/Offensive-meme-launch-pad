import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('late structural query failure rolls back both movement axes and velocity', () => {
  const context = {};
  runInNewContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), context);
  let calls = 0;
  let fail = true;
  const world = {
    PLAYER_HEIGHT: 1.8, SEA_LEVEL: -10,
    surfaceAt: () => ({ height: 0 }),
    gateRoad: { obstructs() {
      calls++;
      if (fail && calls === 2) throw new Error('late structure unavailable');
      return false;
    } },
  };
  const controller = context.CityVoxelPhysics.createController(world, { x: 0, z: 0 });
  const before = controller.snapshot();
  assert.throws(
    () => controller.tick({ right: 1, forward: 1, yaw: 0, jump: true }, 1 / 60),
    /late structure unavailable/
  );
  assert.ok(calls >= 2, 'the first movement axis completed before failure');
  assert.deepEqual({ ...controller.snapshot() }, { ...before });
  const failed = controller.profileLastTick();
  assert.equal(failed.failed, true);
  assert.equal(failed.structuralQueries, 2);
  fail = false;
  controller.tick({ right: 1, forward: 1, yaw: 0 }, 1 / 60);
  assert.equal(controller.profileLastTick().failed, false);
  assert.ok(controller.snapshot().x > before.x);
  assert.ok(controller.snapshot().z > before.z);
});
