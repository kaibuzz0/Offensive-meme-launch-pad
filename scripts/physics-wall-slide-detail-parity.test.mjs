import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');

function player(detail) {
  const sandbox = {};
  runInNewContext(source, sandbox);
  return sandbox.CityVoxelPhysics.createController({
    PLAYER_HEIGHT: 1.8,
    SEA_LEVEL: -10,
    visualDetail: detail,
    surfaceAt: () => ({ height: 0 }),
    gateRoad: { obstructs: (x) => x > 0.6 },
  }, { x: 0, z: 0 });
}

test('diagonal wall slide and bounded long-frame movement match across visual detail', () => {
  const a = player({ lod: 5, resolutionScale: 0.5 });
  const b = player({ lod: 0, resolutionScale: 1 });
  for (const dt of [1 / 60, 0.2, 1 / 30, 0.5]) {
    const input = { right: 1, forward: 1, yaw: 0 };
    const low = a.tick(input, dt);
    const high = b.tick(input, dt);
    assert.deepEqual({ ...low }, { ...high });
    assert.deepEqual({ ...a.profileLastTick() }, { ...b.profileLastTick() });
    assert.equal(a.profileLastTick().failed, false);
    assert.ok(low.x <= 0.6, 'structural wall must block X even during a long frame');
    assert.ok(low.z > 0, 'unblocked Z movement must slide along the wall');
  }
  assert.ok(a.snapshot().z < 3, 'long frames must not accumulate unlimited movement');
});

test('invalid teleport cannot change the shared controller state', () => {
  const p = player({ lod: 2 });
  const before = { ...p.snapshot() };
  assert.equal(p.teleport(1000000, 0), false);
  assert.deepEqual({ ...p.snapshot() }, before);
});
