import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');

function controller(detail) {
  const sandbox = {};
  runInNewContext(source, sandbox);
  const world = {
    PLAYER_HEIGHT: 1.8,
    SEA_LEVEL: -20,
    visualDetail: detail,
    surfaceAt: () => ({ height: 0 }),
    // An enclosed gallery with only 1.5m of headroom. The standing
    // controller must not enter it regardless of visual detail.
    caveRoomAt: (x, z) => x >= 1 ? { floor: 0, ceiling: 2.5, exposed: false } : null,
    gateRoad: { obstructs: () => false },
  };
  return sandbox.CityVoxelPhysics.createController(world, { x: 0, z: 0 });
}

test('enclosed low-headroom gallery blocks the same player footprint at every visual detail', () => {
  const low = controller({ lod: 6, resolutionScale: 0.5 });
  const high = controller({ lod: 0, resolutionScale: 1 });
  for (let i = 0; i < 8; i++) {
    const input = { right: 1, forward: 0, yaw: 0 };
    const a = { ...low.tick(input, 0.05) };
    const b = { ...high.tick(input, 0.05) };
    assert.deepEqual(a, b);
    assert.deepEqual({ ...low.profileLastTick() }, { ...high.profileLastTick() });
    assert.equal(low.profileLastTick().failed, false);
    assert.ok(a.x < 0.75, 'capsule footprint must not enter an enclosed low ceiling');
  }
});
