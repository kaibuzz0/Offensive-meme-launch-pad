import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), context);
const createController = context.CityVoxelPhysics.createController;

function world(cave) {
  return {
    PLAYER_HEIGHT: 7.2,
    SEA_LEVEL: -100,
    // Keep the synthetic surface above the cave roof (12m); a player
    // standing at ground level must not intersect the underground roof.
    surfaceAt: () => ({ height: 15 }),
    caveRoomAt: () => cave,
    gateRoad: { obstructs: () => false },
  };
}

test('invalid galleries reject surface spawn as well as underground spawn', () => {
  for (const cave of [
    { floor: 3, ceiling: 3, exposed: false },
    { floor: 4, ceiling: 3, exposed: false },
    { floor: NaN, ceiling: 12, exposed: false },
    { floor: 3, ceiling: Infinity, exposed: false },
  ]) {
    assert.throws(() => createController(world(cave), { x: 0, z: 0 }), /Spawn outside supported world/);
    assert.throws(() => createController(world(cave), { x: 0, y: 2, z: 0 }), /Spawn outside supported world/);
  }
});

test('invalid gallery cannot be entered by walking or teleport after spawn', () => {
  let cave = null;
  const dynamic = world(null);
  dynamic.caveRoomAt = () => cave;
  const controller = createController(dynamic, { x: 0, z: 0 });
  const before = controller.snapshot();
  cave = { floor: 3, ceiling: 3, exposed: false };
  assert.equal(controller.teleport(2, 2), false);
  const afterTeleport = controller.snapshot();
  assert.deepEqual({ ...afterTeleport }, { ...before });
  controller.tick({ forward: 1 }, 1 / 60);
  assert.deepEqual({ ...controller.snapshot() }, { ...before });
});

test('valid cave columns still permit surface traversal', () => {
  const controller = createController(world({ floor: 3, ceiling: 12, exposed: false }), { x: 0, z: 0 });
  assert.equal(controller.teleport(1, 1), true);
});
