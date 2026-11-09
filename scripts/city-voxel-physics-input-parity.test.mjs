import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), context);
const { createController } = context.CityVoxelPhysics;

function world(detail) {
 const wall = { x: -2, y: 0, z: 5, w: 4, h: 5, d: 1, solid: true };
 return {
  PLAYER_HEIGHT: 1.8, SEA_LEVEL: -100, visualDetail: detail,
  surfaceAt() { return { height: 0 }; },
  gateRoad: { parts: [wall], obstructs(x, y, z, height, radius) {
   return x + radius > wall.x && x - radius < wall.x + wall.w &&
    z + radius > wall.z && z - radius < wall.z + wall.d &&
    y < wall.y + wall.h && y + height > wall.y;
  } },
 };
}

test('desktop and touch normalized inputs share the same fixed-step wall collision', () => {
 const desktop = createController(world('near'), { x: 0, z: 0 });
 const touch = createController(world('far'), { x: 0, z: 0 });
 for (let frame = 0; frame < 90; frame++) {
  const keyboard = { forward: 1, right: 0, yaw: 0 };
  const joystick = { forward: 1, right: 0, yaw: 0 };
  const a = desktop.tickFrame(keyboard, 1 / 60);
  const b = touch.tickFrame(joystick, 1 / 60);
  assert.deepEqual(JSON.parse(JSON.stringify(a.state)), JSON.parse(JSON.stringify(b.state)));
  assert.equal(a.steps, b.steps);
  assert.equal(a.obstructionQueries, b.obstructionQueries);
 }
 assert.ok(desktop.snapshot().z < 5, 'player must not cross solid gate geometry');
});

test('diagonal input is normalized before applying shared collision', () => {
 const straight = createController(world('near'), { x: -10, z: 0 });
 const diagonal = createController(world('far'), { x: -10, z: 0 });
 for (let frame = 0; frame < 12; frame++) {
  straight.tickFrame({ forward: 1, right: 0, yaw: 0 }, 1 / 60);
  diagonal.tickFrame({ forward: 1, right: 1, yaw: 0 }, 1 / 60);
 }
 const s = straight.snapshot(), d = diagonal.snapshot();
 const straightDistance = Math.hypot(s.x + 10, s.z);
 const diagonalDistance = Math.hypot(d.x + 10, d.z);
 assert.ok(Math.abs(straightDistance - diagonalDistance) < 0.001);
});
