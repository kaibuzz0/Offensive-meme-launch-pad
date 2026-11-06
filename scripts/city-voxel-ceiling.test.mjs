import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), context);
const {createController} = context.CityVoxelPhysics;

function caveWorld() {
  return {
    PLAYER_HEIGHT: 7.2,
    SEA_LEVEL: -100,
    surfaceAt: () => ({height: 10}),
    caveRoomAt: () => ({floor: 2, ceiling: 8, exposed: false})
  };
}

test('surface jump remains above underground gallery roof', () => {
  const player = createController(caveWorld(), {x: 0, z: 0});
  const after = player.tick({jump: true}, 0.05);
  assert.ok(after.y > 11, 'surface jump must not be snapped inside cave');
  assert.equal(after.grounded, false);
});

test('underground jump is capped by solid gallery ceiling', () => {
  const player = createController(caveWorld(), {x: 0, z: 0, y: 0});
  assert.equal(player.snapshot().y, 2);
  const after = player.tick({jump: true}, 0.05);
  assert.ok(after.y <= 8 - caveWorld().PLAYER_HEIGHT + 1e-9);
  assert.equal(after.vy, 0);
});

test('surface movement over a buried gallery does not enter it', () => {
  const player = createController(caveWorld(), {x: 0, z: 0});
  for (let i = 0; i < 20; i++) player.tick({forward: 1}, 0.05);
  assert.ok(player.snapshot().y >= 11);
});
