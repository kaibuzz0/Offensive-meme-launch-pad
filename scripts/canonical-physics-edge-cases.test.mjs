import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

// Additional behavior coverage for the existing shared first-person controller.
// Synthetic world fixtures do not replace seeded-world Chromium acceptance.
const source = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');
function create(world, start = { x: 0, z: 0 }) {
  const scope = {};
  runInNewContext(source, scope);
  return scope.CityVoxelPhysics.createController({
    PLAYER_HEIGHT: 1.8,
    SEA_LEVEL: -100,
    surfaceAt: () => ({ height: -1 }),
    gateRoad: { obstructs: () => false },
    ...world,
  }, start);
}

test('controller caps a long frame to the documented 50ms step', () => {
  const a = create({});
  const b = create({});
  a.tick({ forward: 1 }, 2);
  b.tick({ forward: 1 }, 0.05);
  assert.deepEqual({ x: a.snapshot().x, z: a.snapshot().z },
    { x: b.snapshot().x, z: b.snapshot().z });
});

test('teleport rejects unloaded cells without changing player position', () => {
  const c = create({ surfaceAt: (x) => x >= 5 ? null : { height: -1 } });
  const before = c.snapshot();
  assert.equal(c.teleport(6, 0), false);
  assert.deepEqual({ x: c.snapshot().x, z: c.snapshot().z, y: c.snapshot().y },
    { x: before.x, z: before.z, y: before.y });
});

test('jump from an underground gallery stops below its solid roof', () => {
  const c = create({
    caveRoomAt: () => ({ floor: 0, ceiling: 4, exposed: false }),
  }, { x: 0, z: 0, y: 0 });
  for (let i = 0; i < 15; i++) c.tick({ jump: i === 0 }, 1 / 60);
  assert.ok(c.snapshot().y + 1.8 <= 4 + 1e-8,
    'player head must not cross a solid cave ceiling');
});

test('invalid negative and non-finite time steps are rejected', () => {
  const c = create({});
  assert.throws(() => c.tick({}, -0.01), /Invalid time step/);
  assert.throws(() => c.tick({}, Infinity), /Invalid time step/);
});

test('teleport cannot bypass a structural wall or insufficient cave headroom', () => {
  const wall = create({ gateRoad: { obstructs: (x) => x >= 2 } });
  const beforeWall = wall.snapshot();
  assert.equal(wall.teleport(3, 0), false);
  assert.deepEqual([wall.snapshot().x, wall.snapshot().z], [beforeWall.x, beforeWall.z]);

  const cave = create({
    surfaceAt: () => ({ height: 0 }),
    caveRoomAt: (x) => x >= 2 ? { floor: 1, ceiling: 2, exposed: false } : null,
  });
  const beforeCave = cave.snapshot();
  assert.equal(cave.teleport(3, 0, 1), false);
  assert.deepEqual([cave.snapshot().x, cave.snapshot().z], [beforeCave.x, beforeCave.z]);
});

test('step-up cannot enter a cave cell with insufficient headroom at the raised feet height', () => {
  const c = create({
    surfaceAt: (x) => ({ height: x >= 2 ? 0 : -1 }),
    caveRoomAt: (x) => x >= 2 ? { floor: 1, ceiling: 2.4, exposed: false } : null,
  });
  // A 1m step is within MAX_STEP, but the 1.4m gap above the step
  // cannot fit the 1.8m player. Check the prospective, raised capsule.
  for (let i = 0; i < 8; i++) c.tick({ forward: 1, yaw: Math.PI / 2 }, 0.05);
  assert.ok(c.snapshot().x < 2 - 0.27,
    'the capsule must stop before its radius overlaps the low-roof cell');
});
