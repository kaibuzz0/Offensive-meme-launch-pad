'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'city-voxel-physics.js'), 'utf8');
const context = { window: {} };
vm.runInNewContext(source, context);
const makeWorld = () => ({
  PLAYER_HEIGHT: 1.8,
  SEA_LEVEL: -100,
  surfaceAt: () => ({ height: 0 })
});
const create = () => context.window.CityVoxelPhysics.createController(makeWorld(), { x: 0, z: 0 });

test('non-numeric yaw is ignored rather than coercing steering', () => {
  const invalid = create();
  const baseline = create();
  const a = invalid.tick({ forward: 1, yaw: '1.5707963267948966' }, .02);
  const b = baseline.tick({ forward: 1, yaw: 0 }, .02);
  assert.equal(a.x, b.x);
  assert.equal(a.z, b.z);
});

test('truthy nonboolean jump input cannot trigger jumping', () => {
  const invalid = create();
  const baseline = create();
  const a = invalid.tick({ jump: 'true' }, .02);
  const b = baseline.tick({ jump: false }, .02);
  assert.equal(a.y, b.y);
  assert.equal(a.vy, b.vy);
  assert.equal(a.grounded, b.grounded);
});

test('boolean jump remains available to keyboard and touch adapters', () => {
  const controller = create();
  const state = controller.tick({ jump: true }, .02);
  assert.ok(state.y > 1);
  assert.equal(state.grounded, false);
});
