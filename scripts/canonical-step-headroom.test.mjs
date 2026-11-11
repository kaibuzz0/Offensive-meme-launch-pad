import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const source = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');
function make(roof) {
  const context = {};
  runInNewContext(source, context);
  return context.CityVoxelPhysics.createController({
    PLAYER_HEIGHT: 1.8, SEA_LEVEL: -100,
    surfaceAt: (x) => ({ height: x >= 1 ? 0 : -1 }),
    caveRoomAt: (x) => ({ floor: x >= 1 ? 1 : 0, ceiling: roof, exposed: false }),
    gateRoad: { obstructs: () => false },
  }, { x: 0, z: 0, y: 0 });
}

test('step-up refuses insufficient headroom at the raised foot position', () => {
  const c = make(2.2); // one-meter step leaves only 1.2m clearance
  for (let i = 0; i < 15; i++) c.tick({ right: 1 }, 1 / 60);
  const p = c.snapshot();
  assert.ok(p.x < 0.75, 'capsule radius must not enter the low-roof step');
  assert.equal(p.y, 0, 'rejected step must not raise the player');
});

test('same step remains traversable when roof clears the full capsule', () => {
  const c = make(3.2);
  for (let i = 0; i < 15; i++) c.tick({ right: 1 }, 1 / 60);
  const p = c.snapshot();
  assert.ok(p.x > 1, 'valid step is traversable');
  assert.equal(p.y, 1, 'feet rise to step elevation');
});

test('step-up checks low roof across capsule footprint, not only its center', () => {
  const context = {};
  runInNewContext(source, context);
  const c = context.CityVoxelPhysics.createController({
    PLAYER_HEIGHT: 1.8, SEA_LEVEL: -100,
    surfaceAt: (x) => ({ height: x >= 1 ? 0 : -1 }),
    caveRoomAt: (x, z) => ({
      floor: x >= 1 ? 1 : 0,
      ceiling: z >= 1 ? 2.2 : 3.2,
      exposed: false,
    }),
    gateRoad: { obstructs: () => false },
  }, { x: 0, z: 0.8, y: 0 });
  for (let i = 0; i < 15; i++) c.tick({ right: 1 }, 1 / 60);
  const p = c.snapshot();
  assert.ok(p.x < 0.75, 'capsule edge must not clip the adjacent low roof');
  assert.equal(p.y, 0, 'blocked step must leave the player at original elevation');
});
