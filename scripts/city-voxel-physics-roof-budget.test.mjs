import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const scope = {};
vm.runInNewContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), scope);

function undergroundWorld(ceiling) {
  return {
    PLAYER_HEIGHT: 7.2,
    SEA_LEVEL: -100,
    surfaceAt: () => ({height: 20}),
    caveRoomAt: () => ({floor: 0, ceiling, exposed: false}),
  };
}

test('jumping inside a cave stops at solid roof without changing horizontal coordinates', () => {
  const player = scope.CityVoxelPhysics.createController(undergroundWorld(8), {x: 0, z: 0, y: 0});
  for (let i = 0; i < 30; i++) {
    const position = player.tick({jump: i === 0, yaw: 0}, 1 / 60);
    assert.ok(position.y + 7.2 <= 8 + 1e-8, 'head penetrated the cave roof');
    assert.equal(position.x, 0);
    assert.equal(position.z, 0);
  }
});

test('a too-low cave roof prevents jumping through even at the largest allowed tick', () => {
  const player = scope.CityVoxelPhysics.createController(undergroundWorld(7.5), {x: 0, z: 0, y: 0});
  for (let i = 0; i < 12; i++) {
    const position = player.tick({jump: i === 0}, .05);
    assert.ok(position.y + 7.2 <= 7.5 + 1e-8, 'head passed through low roof');
  }
});
