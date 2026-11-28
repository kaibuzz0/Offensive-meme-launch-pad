import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function controllerFor(visualDetail) {
  const context = {};
  runInNewContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), context);
  const world = {
    PLAYER_HEIGHT: 1.8,
    SEA_LEVEL: -10,
    visualDetail,
    surfaceAt: () => ({ height: 0 }),
    gateRoad: { obstructs: (x, _y, z) => x > 1.4 && z > 0.5 },
  };
  return context.CityVoxelPhysics.createController(world, { x: 0, z: 0 });
}

test('visual detail settings cannot alter first-person motion or structural collision', () => {
  const low = controllerFor({ resolutionScale: 0.5, renderDistance: 2, lod: 4 });
  const high = controllerFor({ resolutionScale: 1, renderDistance: 16, lod: 0 });
  const inputs = [
    { right: 1, forward: 1, yaw: 0 },
    { right: 1, forward: 1, yaw: 0 },
    { right: 1, forward: 1, yaw: 0, jump: true },
    { right: 1, forward: 1, yaw: Math.PI / 4 },
    { right: 0, forward: 1, yaw: 0 },
  ];
  for (const input of inputs) {
    const a = low.tick(input, 1 / 30);
    const b = high.tick(input, 1 / 30);
    assert.deepEqual({ ...a }, { ...b });
    assert.deepEqual({ ...low.profileLastTick() }, { ...high.profileLastTick() });
  }
});
