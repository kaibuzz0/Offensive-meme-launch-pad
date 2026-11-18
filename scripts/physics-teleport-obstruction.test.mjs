import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');

test('teleport refuses walls and low galleries without changing player state across visual detail', () => {
  for (const visualDetail of [{ lod: 0 }, { lod: 6, resolutionScale: 0.5 }]) {
    const sandbox = {};
    runInNewContext(source, sandbox);
    const world = {
      PLAYER_HEIGHT: 1.8,
      SEA_LEVEL: -10,
      visualDetail,
      surfaceAt: () => ({ height: 0 }),
      gateRoad: { obstructs: x => x >= 3 && x < 4 },
      caveRoomAt: x => x >= 5 && x < 6
        ? { floor: 0, ceiling: 2.5, exposed: false } : null,
    };
    const player = sandbox.CityVoxelPhysics.createController(world, { x: 0, z: 0 });
    const original = { ...player.snapshot() };
    assert.equal(player.teleport(3.2, 0), false, 'structural obstruction rejects fast travel');
    assert.deepEqual({ ...player.snapshot() }, original);
    assert.equal(player.teleport(5.2, 0, 1), false, 'enclosed low headroom rejects fast travel');
    assert.deepEqual({ ...player.snapshot() }, original);
    assert.equal(player.teleport(7, 0), true, 'open destination remains reachable');
    assert.equal(player.snapshot().x, 7);
  }
});
