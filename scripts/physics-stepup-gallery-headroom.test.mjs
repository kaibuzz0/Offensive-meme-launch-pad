import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');

function create(detail) {
  const context = {};
  runInNewContext(source, context);
  const world = {
    PLAYER_HEIGHT: 1.8, SEA_LEVEL: -100, visualDetail: detail,
    surfaceAt: (x) => ({ height: x >= 1 ? 0 : -1 }),
    caveRoomAt: (x) => x >= 1 ? { floor: 1, ceiling: 2.2, exposed: false } : null,
    gateRoad: { obstructs: () => false },
  };
  return context.CityVoxelPhysics.createController(world, { x: 0, z: 0, y: 0 });
}

test('step-up cannot push player head into a low gallery roof at either visual detail', () => {
  const low = create({ lod: 8 });
  const high = create({ lod: 0 });
  for (let i = 0; i < 30; i++) {
    const a = { ...low.tick({ right: 1, yaw: 0 }, 0.05) };
    const b = { ...high.tick({ right: 1, yaw: 0 }, 0.05) };
    assert.deepEqual(a, b);
    assert.deepEqual({ ...low.profileLastTick() }, { ...high.profileLastTick() });
    assert.ok(a.x < 0.73, 'capsule footprint must remain outside low roof');
    assert.equal(a.y, 0, 'step-up must not occur without headroom');
  }
});
