import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');
function controllerFor(world) {
  const sandbox = {};
  runInNewContext(source, sandbox);
  return () => sandbox.CityVoxelPhysics.createController(world, { x: 0, z: 0 });
}
const baseWorld = () => ({
  surfaceAt: () => ({ height: 0 }),
  PLAYER_HEIGHT: 1.8,
  SEA_LEVEL: -100
});

test('canonical physics refuses invalid capsule heights before movement', () => {
  for (const height of [undefined, null, 0, -1, NaN, Infinity, '1.8']) {
    const create = controllerFor({ ...baseWorld(), PLAYER_HEIGHT: height });
    assert.throws(create, /Finite positive player collision height required/);
  }
});

test('canonical physics requires a callable terrain surface query', () => {
  for (const surfaceAt of [undefined, null, {}, 1, 'surface']) {
    const create = controllerFor({ ...baseWorld(), surfaceAt });
    assert.throws(create, /Voxel world and finite player coordinates required/);
  }
});

test('valid canonical collision height still permits movement', () => {
  const create = controllerFor(baseWorld());
  const controller = create();
  const before = controller.snapshot();
  const after = controller.tick({ forward: 1, yaw: 0 }, 1 / 60);
  assert.ok(after.z > before.z);
  assert.equal(controller.PLAYER_HEIGHT, 1.8);
});
