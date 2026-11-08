import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';

const sandbox = {};
runInNewContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), sandbox);

function controller() {
  const world = {
    PLAYER_HEIGHT: 1.8,
    SEA_LEVEL: -100,
    surfaceAt(x, z) {
      return x >= -20 && x <= 20 && z >= -20 && z <= 20 ? {height: 0} : null;
    },
    gateRoad: {
      obstructs(x, y, z, height, radius) {
        return x + radius >= 3 && x - radius <= 4 && Math.abs(z) <= 1;
      },
    },
    caveRoomAt(x, z) {
      return x >= 8 && x <= 9 && Math.abs(z) <= 1
        ? {floor: 0, ceiling: 1.5, exposed: false}
        : null;
    },
  };
  return sandbox.CityVoxelPhysics.createController(world, {x: 0, z: 0});
}

test('rejected solid-wall and unsupported-world teleports preserve player state', () => {
  const c = controller();
  c.tickFrame({jump: true}, 1 / 60);
  const before = c.snapshot();
  assert.equal(c.teleport(3.5, 0), false);
  assert.deepEqual({...c.snapshot()}, {...before});
  assert.equal(c.teleport(100, 0), false);
  assert.deepEqual({...c.snapshot()}, {...before});
});

test('rejected low-headroom cave teleport preserves player state', () => {
  const c = controller();
  const before = c.snapshot();
  assert.equal(c.teleport(8.5, 0, 0), false);
  assert.deepEqual({...c.snapshot()}, {...before});
});

test('successful teleport discards partial pre-transition simulation frame', () => {
  const c = controller();
  assert.equal(c.tickFrame({}, 1 / 120).steps, 0);
  assert.equal(c.teleport(-5, 5), true);
  const next = c.tickFrame({}, 1 / 120);
  assert.equal(next.steps, 0, 'old-world fractional step replayed after teleport');
  assert.equal(next.state.x, -5);
  assert.equal(next.state.z, 5);
});
