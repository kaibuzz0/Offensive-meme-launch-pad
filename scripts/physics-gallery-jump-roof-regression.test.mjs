import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');

function makeController(visualDetail) {
  const sandbox = {};
  runInNewContext(source, sandbox);
  const world = {
    PLAYER_HEIGHT: 1.8,
    SEA_LEVEL: -20,
    visualDetail,
    surfaceAt: () => ({ height: -1 }),
    caveRoomAt: () => ({ floor: 0, ceiling: 2.3, exposed: false }),
    gateRoad: { obstructs: () => false },
  };
  return sandbox.CityVoxelPhysics.createController(world, { x: 0, z: 0, y: 0 });
}

test('jumping beneath a solid gallery roof cannot tunnel through it at any visual LOD', () => {
  const low = makeController({ lod: 6, resolutionScale: 0.5 });
  const high = makeController({ lod: 0, resolutionScale: 1 });
  for (let i = 0; i < 40; i++) {
    const input = { jump: i === 0, forward: 0, right: 0, yaw: 0 };
    const a = { ...low.tick(input, 0.05) };
    const b = { ...high.tick(input, 0.05) };
    assert.deepEqual(a, b, 'physics must not depend on visual LOD');
    assert.deepEqual({ ...low.profileLastTick() }, { ...high.profileLastTick() });
    assert.ok(a.y >= -1e-9, 'player must not fall through the gallery floor');
    assert.ok(a.y + low.PLAYER_HEIGHT <= 2.3 + 1e-9,
      'player head must remain below the solid gallery ceiling');
  }
});
