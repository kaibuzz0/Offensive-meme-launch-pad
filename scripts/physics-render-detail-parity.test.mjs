import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// This is in scripts/ so npm test executes the parity gate, rather than
// leaving it solely in the optional tests/ directory.
function makePlayer(detail) {
  const context = {};
  runInNewContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), context);
  const world = {
    PLAYER_HEIGHT: 1.8,
    SEA_LEVEL: -10,
    visualDetail: detail,
    surfaceAt: () => ({ height: 0 }),
    gateRoad: { obstructs: (x, _y, z) => x > 0.6 && z > 0.1 },
  };
  return context.CityVoxelPhysics.createController(world, { x: 0, z: 0 });
}

test('physics sweep and work budget remain identical across automatic visual detail', () => {
  const low = makePlayer({ lod: 4, renderDistance: 2, resolutionScale: 0.5 });
  const high = makePlayer({ lod: 0, renderDistance: 16, resolutionScale: 1 });
  const inputs = [
    { right: 1, forward: 1, yaw: 0, dt: 1 / 30 },
    { right: 1, forward: 1, yaw: 0, dt: 1 / 30 },
    { right: 0, forward: 1, yaw: Math.PI / 3, dt: 0.2 },
    { right: -1, forward: 0, yaw: 0, dt: 1 / 60 },
  ];
  for (const { dt, ...input } of inputs) {
    const a = low.tick(input, dt);
    const b = high.tick(input, dt);
    assert.deepEqual({ ...a }, { ...b }, 'render detail must not change physics');
    assert.deepEqual({ ...low.profileLastTick() }, { ...high.profileLastTick() },
      'render detail must not change collision-query work');
    assert.equal(low.profileLastTick().failed, false);
    assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(a.z));
  }
  assert.ok(low.snapshot().x < 2, 'bounded steps must not allow an unbounded teleport');
});
