import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const root = {};
vm.runInNewContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), root);
const world = {
  PLAYER_HEIGHT: 7.2, SEA_LEVEL: -100,
  surfaceAt: (x, z) => ({height: 0}),
};
const spawn = () => root.CityVoxelPhysics.createController(world, {x: 0, z: 0});

test('large stalled frame cannot advance player farther than bounded physics tick', () => {
  const stalled = spawn();
  const bounded = spawn();
  const input = {forward: 1, right: 0, yaw: 0};
  const afterStall = stalled.tick(input, 3);
  const afterBounded = bounded.tick(input, .05);
  assert.equal(afterStall.x, afterBounded.x);
  assert.equal(afterStall.z, afterBounded.z);
  assert.equal(afterStall.y, afterBounded.y);
});

test('diagonal touch axes do not increase walking speed', () => {
  const straight = spawn(), diagonal = spawn();
  const a = straight.tick({forward: 1, yaw: 0}, .05);
  const b = diagonal.tick({forward: 1, right: 1, yaw: 0}, .05);
  assert.ok(Math.abs(Math.hypot(b.x, b.z) - Math.hypot(a.x, a.z)) < 1e-9);
});

test('the controller does not depend on renderer detail or visual LOD', () => {
  const low = spawn(), high = spawn();
  const input = {forward: 1, right: .2, yaw: .3};
  for (let i = 0; i < 60; i++) {
    const a = low.tick(input, 1 / 60);
    const b = high.tick(input, 1 / 60);
    assert.deepEqual({...a}, {...b});
  }
});
