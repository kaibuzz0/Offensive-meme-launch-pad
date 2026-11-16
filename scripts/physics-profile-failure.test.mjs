import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('physics profiling finalizes failed ticks and resets on recovery', () => {
  const context = {};
  runInNewContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), context);
  let unavailable = false;
  const world = {
    PLAYER_HEIGHT: 1.8,
    SEA_LEVEL: -10,
    surfaceAt() {
      if (unavailable) throw new Error('chunk unavailable');
      return { height: 0 };
    },
  };
  const player = context.CityVoxelPhysics.createController(world, { x: 0, z: 0 });
  unavailable = true;
  assert.throws(() => player.tick({ forward: 1 }, 1 / 60), /chunk unavailable/);
  const failed = player.profileLastTick();
  assert.equal(failed.failed, true);
  assert.equal(typeof failed.surfaceQueries, 'number');
  assert.equal(Object.isFrozen(failed), true);
  unavailable = false;
  player.tick({ forward: 1 }, 1 / 60);
  const recovered = player.profileLastTick();
  assert.equal(recovered.failed, false);
  assert.equal(failed.failed, true);
  assert.notStrictEqual(failed, recovered);
});
