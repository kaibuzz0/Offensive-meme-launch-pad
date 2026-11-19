import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');
function controller() {
  const context = {};
  runInNewContext(source, context);
  return context.CityVoxelPhysics.createController({
    PLAYER_HEIGHT: 1.8, SEA_LEVEL: -100,
    surfaceAt: () => ({ height: -1 }),
    gateRoad: { obstructs: () => false },
  }, { x: 0, z: 0, y: 0 });
}

test('non-finite touch or desktop axes cannot become full-speed movement', () => {
  for (const invalid of [Infinity, -Infinity, NaN, 'Infinity', 'NaN']) {
    const player = controller();
    const initial = { ...player.snapshot() };
    player.tick({ forward: invalid, right: invalid, yaw: 0 }, 0.05);
    assert.deepEqual({ ...player.snapshot() }, initial);
    assert.equal(player.profileLastTick().failed, false);
  }
});

test('finite input remains clamped and diagonal movement normalized', () => {
  const large = controller(), unit = controller();
  large.tick({ forward: 999, right: -999, yaw: 0 }, 0.05);
  unit.tick({ forward: 1, right: -1, yaw: 0 }, 0.05);
  assert.deepEqual({ ...large.snapshot() }, { ...unit.snapshot() });
});
