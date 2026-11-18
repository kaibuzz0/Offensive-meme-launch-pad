import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');

test('late collision failure restores all axes and profiling resets on recovery', () => {
  const sandbox = {};
  runInNewContext(source, sandbox);
  let throwOnZ = true;
  const world = {
    PLAYER_HEIGHT: 1.8,
    SEA_LEVEL: -10,
    surfaceAt: () => ({ height: 0 }),
    gateRoad: {
      obstructs(x, y, z) {
        if (throwOnZ && z > 0.01) throw new Error('unavailable structural chunk');
        return false;
      },
    },
  };
  const controller = sandbox.CityVoxelPhysics.createController(world, { x: 0, z: 0 });
  const before = { ...controller.snapshot() };
  assert.throws(() => controller.tick({ right: 1, forward: 1, yaw: 0 }, 0.05), /unavailable structural chunk/);
  assert.deepEqual({ ...controller.snapshot() }, before, 'late Z failure must roll back earlier X sweep');
  const failed = { ...controller.profileLastTick() };
  assert.equal(failed.failed, true);
  assert.ok(failed.sweepSegments > 0);
  assert.ok(failed.structuralQueries > 0);
  throwOnZ = false;
  const after = controller.tick({ right: 1, forward: 1, yaw: 0 }, 0.05);
  const recovered = { ...controller.profileLastTick() };
  assert.equal(recovered.failed, false);
  assert.ok(after.x > before.x && after.z > before.z, 'normal traversal resumes after a transient query failure');
  assert.ok(recovered.sweepSegments > 0 && recovered.structuralQueries > 0);
  assert.ok(recovered.surfaceQueries < 100, 'telemetry is per tick, not cumulative across failures');
});
