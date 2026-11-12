import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');
const context = vm.createContext({});
vm.runInContext(source, context);

function world(ceiling) {
  return {
    PLAYER_HEIGHT: 7.2,
    SEA_LEVEL: -100,
    surfaceAt(x) { return { height: x >= 1 ? 0 : -1 }; },
    caveRoomAt(x) { return x >= 1 ? { floor: 1, ceiling, exposed: false } : null; },
    gateRoad: { obstructs() { return false; } },
  };
}

test('stepping onto raised cave floor requires clearance at prospective feet height', () => {
  const controller = context.CityVoxelPhysics.createController(world(7.6), { x: 0.4, z: 0 });
  for (let i = 0; i < 10; i++) controller.tick({ right: 1, forward: 0, yaw: 0 }, 0.05);
  const state = controller.snapshot();
  assert.ok(state.x < 0.73, 'capsule must not enter low-roof raised floor');
  assert.equal(state.y, 0, 'rejected step must not raise feet');
});

test('same raised floor remains traversable with adequate cave headroom', () => {
  const controller = context.CityVoxelPhysics.createController(world(9), { x: 0.4, z: 0 });
  for (let i = 0; i < 10; i++) controller.tick({ right: 1, forward: 0, yaw: 0 }, 0.05);
  const state = controller.snapshot();
  assert.ok(state.x > 1.1, 'clear doorway should permit forward movement');
  assert.equal(state.y, 1, 'accepted step should raise feet to cave floor');
});
