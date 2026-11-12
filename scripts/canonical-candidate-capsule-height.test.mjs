import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), context);

test('airborne structural query uses actual feet, not raised terrain ahead', () => {
  const checked = [];
  const world = {
    PLAYER_HEIGHT: 7.2,
    SEA_LEVEL: -100,
    surfaceAt(x) { return { height: x >= 1 ? 3 : -1 }; },
    gateRoad: { obstructs(x, y) { checked.push({ x, y }); return false; } },
  };
  const controller = context.CityVoxelPhysics.createController(world, { x: 0.4, z: 0 });
  controller.tick({ jump: true }, 0.01);
  controller.tick({ right: 1 }, 0.05);
  assert.ok(checked.some(p => p.x >= 0.73), 'sweep should query the raised terrain boundary');
  assert.ok(checked.every(p => p.y < 4), 'airborne collision must not snap query to the higher floor');
});

test('grounded structural query uses stepped-up feet height', () => {
  const checked = [];
  const world = {
    PLAYER_HEIGHT: 7.2,
    SEA_LEVEL: -100,
    surfaceAt(x) { return { height: x >= 1 ? 0 : -1 }; },
    gateRoad: { obstructs(x, y) { checked.push({ x, y }); return false; } },
  };
  const controller = context.CityVoxelPhysics.createController(world, { x: 0.4, z: 0 });
  controller.tick({ right: 1 }, 0.05);
  assert.ok(checked.some(p => p.y === 1), 'grounded step must query at raised feet height');
});
