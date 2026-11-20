import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), context);
const make = () => context.CityVoxelPhysics.createController({
  PLAYER_HEIGHT: 1.8, SEA_LEVEL: -100,
  surfaceAt: () => ({ height: 0 }),
}, { x: 0, z: 0 });

test('capped frame discards all unprocessed whole physics steps', () => {
  const controller = make();
  const frame = controller.tickFrame({ forward: 1, yaw: 0 }, 0.25);
  assert.equal(frame.steps, 4);
  assert.ok(Math.abs(frame.discardedSeconds - (0.25 - 4 / 60)) < 1e-8);
  assert.ok(frame.alpha < 1e-8, 'no full fixed step remains queued');
  const position = controller.snapshot().z;
  const zero = controller.tickFrame({ forward: 1 }, 0);
  assert.equal(zero.steps, 0, 'zero-delta frame must not advance dropped time');
  assert.equal(controller.snapshot().z, position);
});

test('fractional remainder is preserved without retaining a full step', () => {
  const controller = make();
  const frame = controller.tickFrame({ forward: 1 }, 0.105);
  assert.equal(frame.steps, 4);
  assert.ok(Math.abs(frame.alpha - 0.3) < 1e-8);
  assert.ok(Math.abs(frame.discardedSeconds - (0.105 - 0.005 - 4 / 60)) < 1e-8);
});
