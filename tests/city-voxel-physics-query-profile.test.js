import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('physics workload counts structural and water callbacks without changing movement', () => {
  const context = {};
  runInNewContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), context);
  let structural = 0;
  let water = 0;
  const world = {
    PLAYER_HEIGHT: 1.8,
    SEA_LEVEL: -10,
    surfaceAt: () => ({ height: 0 }),
    gateRoad: { obstructs() { structural++; return false; } },
    isWaterAt() { water++; return false; },
  };
  const player = context.CityVoxelPhysics.createController(world, { x: 0, z: 0 });
  player.tick({ forward: 1 }, 1 / 60);
  const first = player.profileLastTick();
  assert.equal(first.failed, false);
  assert.equal(first.structuralQueries, structural);
  assert.equal(first.waterQueries, water);
  assert.ok(first.structuralQueries > 0);
  assert.equal(first.waterQueries, 1);
  assert.ok(Object.isFrozen(first));
  player.tick({}, 1 / 60);
  const second = player.profileLastTick();
  assert.equal(second.waterQueries, 1);
  assert.equal(second.structuralQueries, 2);
  assert.equal(first.waterQueries, 1);
});
