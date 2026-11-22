import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');
function createController() {
 const context = {};
 runInNewContext(source, context);
 return context.CityVoxelPhysics.createController({
  PLAYER_HEIGHT: 1.8, SEA_LEVEL: -10,
  surfaceAt: () => ({ height: 0 }),
 }, { x: 0, z: 0 });
}
test('physics telemetry distinguishes elapsed time from bounded simulation work', () => {
 const controller = createController();
 controller.tick({ forward: 1, yaw: 0 }, 0.2);
 const profile = controller.profileLastTick();
 assert.equal(profile.requestedSeconds, 0.2);
 assert.equal(profile.simulatedSeconds, 0.05);
 assert.ok(Math.abs(profile.discardedSeconds - 0.15) < 1e-12);
 assert.equal(profile.failed, false);
 assert.ok(profile.surfaceQueries > 0);
 controller.tick({ forward: 1, yaw: 0 }, 0.01);
 const normal = controller.profileLastTick();
 assert.equal(normal.requestedSeconds, 0.01);
 assert.equal(normal.simulatedSeconds, 0.01);
 assert.equal(normal.discardedSeconds, 0);
});
test('invalid elapsed time does not mutate physics state', () => {
 const controller = createController();
 const before = controller.snapshot();
 assert.throws(() => controller.tick({ forward: 1 }, Infinity), /Invalid time step/);
 assert.deepEqual({ ...controller.snapshot() }, { ...before });
});
