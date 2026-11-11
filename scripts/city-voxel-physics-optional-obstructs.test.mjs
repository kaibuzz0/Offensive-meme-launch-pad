import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const source = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');
const sandbox = {};
runInNewContext(source, sandbox);
const createController = sandbox.CityVoxelPhysics.createController;
const base = {
  PLAYER_HEIGHT: 7.2,
  SEA_LEVEL: -100,
  surfaceAt: () => ({ height: 0 }),
};

test('structural provider without obstructs permits normal ground movement', () => {
  const player = createController({ ...base, gateRoad: { parts: [] } }, { x: 0, z: 0 });
  const before = player.snapshot();
  const after = player.tick({ forward: 1, yaw: 0 }, 1 / 60);
  assert.ok(after.z > before.z, 'player must move through unobstructed ground');
});

test('existing structural obstruction callback still blocks movement', () => {
  let queries = 0;
  const player = createController({
    ...base,
    gateRoad: { obstructs: () => { queries++; return true; } },
  }, { x: 0, z: 0 });
  const after = player.tick({ forward: 1, yaw: 0 }, 1 / 60);
  assert.equal(after.z, 0);
  assert.ok(queries > 0);
});
