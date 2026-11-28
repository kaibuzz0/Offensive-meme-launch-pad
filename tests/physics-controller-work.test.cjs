'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync('city-voxel-physics.js', 'utf8'), context);
const { createController } = context.window.CityVoxelPhysics;

test('physics query telemetry is per tick, bounded and renderer-independent', () => {
  const world = {
    PLAYER_HEIGHT: 7.2, SEA_LEVEL: -100,
    surfaceAt: () => ({ height: 0 }),
    caveRoomAt: () => null
  };
  const controller = createController(world, { x: 0, z: 0 });
  const initial = controller.profileLastTick();
  assert.equal(initial.surfaceQueries, 0);
  assert.equal(initial.sweepSegments, 0);
  assert.ok(Object.isFrozen(initial));
  controller.tick({ forward: 1, yaw: 0 }, 10);
  const first = controller.profileLastTick();
  assert.ok(first.sweepSegments > 0);
  assert.ok(first.sweepSegments <= 8, 'catch-up is capped to 50ms movement');
  assert.ok(first.surfaceQueries > 0);
  assert.ok(first.caveQueries > 0);
  assert.ok(Object.isFrozen(first));
  controller.tick({ forward: 0 }, 0);
  const second = controller.profileLastTick();
  assert.equal(second.sweepSegments, 0);
  assert.ok(second.surfaceQueries > 0);
  assert.notEqual(first, second);
  assert.equal(first.sweepSegments > 0, true, 'prior snapshot stays unchanged');
});
