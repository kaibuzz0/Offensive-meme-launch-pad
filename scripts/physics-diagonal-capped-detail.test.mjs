import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');
function controller(detail) {
  const context = {};
  runInNewContext(source, context);
  const world = {
    PLAYER_HEIGHT: 1.8, SEA_LEVEL: -100, visualDetail: detail,
    surfaceAt: () => ({ height: -1 }),
    gateRoad: { obstructs: () => false },
  };
  return context.CityVoxelPhysics.createController(world, { x: 0, z: 0, y: 0 });
}

test('diagonal movement is normalized and detail independent under capped frame time', () => {
  const low = controller({ lod: 8 });
  const high = controller({ lod: 0 });
  const straight = controller({ lod: 0 });
  const input = { forward: 1, right: 1, yaw: Math.PI / 3 };
  for (let i = 0; i < 20; i++) {
    const a = { ...low.tick(input, 0.2) };
    const b = { ...high.tick(input, 0.2) };
    assert.deepEqual(a, b);
    assert.deepEqual({ ...low.profileLastTick() }, { ...high.profileLastTick() });
    assert.ok(low.profileLastTick().sweepSegments <= 8,
      'one capped tick must have bounded quarter-voxel sweep segments');
    straight.tick({ forward: 1, right: 0, yaw: Math.PI / 3 }, 0.05);
  }
  const a = low.snapshot();
  const b = straight.snapshot();
  assert.ok(Math.abs(Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z)) < 1e-8,
    'diagonal input must not increase horizontal travel speed');
});
