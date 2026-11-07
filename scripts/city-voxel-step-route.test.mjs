import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), context);
const {createController} = context.CityVoxelPhysics;

function steppedGallery(ceiling) {
  return {
    PLAYER_HEIGHT: 7.2, SEA_LEVEL: -100,
    surfaceAt: () => ({height: 20}),
    caveRoomAt: x => ({floor: x < 1 ? 2 : 3.5, ceiling, exposed: false})
  };
}

test('low cave doorway rejects a step that would lift head into the lintel', () => {
  const player = createController(steppedGallery(10), {x: 0, z: 0, y: 2});
  const after = player.tick({right: 1}, .05);
  assert.ok(after.x < .75, 'step into low doorway must be blocked before the footprint crosses it');
  assert.equal(after.y, 2, 'player must not be lifted through solid roof');
});

test('high cave doorway allows the same step-up without clipping', () => {
  const player = createController(steppedGallery(12), {x: 0, z: 0, y: 2});
  const after = player.tick({right: 1}, .05);
  assert.ok(after.x > .5, 'traversable doorway should remain reachable');
  assert.equal(after.y, 3.5);
});

test('road to fortress doorway can be walked without teleporting through walls', () => {
  const world = {
    PLAYER_HEIGHT: 7.2, SEA_LEVEL: -100,
    surfaceAt: x => ({height: x >= 1 ? 1 : 0}),
    gateRoad: {obstructs(x, y, z) {
      // A fortress wall with a pedestrian-sized opening along the road.
      return x >= 3 && x < 3.5 && (z < 1 || z > 3);
    }}
  };
  const player = createController(world, {x: 0, z: 0});
  let prev = player.snapshot();
  for (let i = 0; i < 8; i++) {
    const next = player.tick({right: 1}, .05);
    assert.ok(Math.hypot(next.x-prev.x, next.z-prev.z) <= .751, 'no teleport');
    prev = next;
  }
  assert.ok(player.snapshot().x < 3, 'fortress wall blocks direct entry');
  for (let i = 0; i < 3; i++) player.tick({forward: 1}, .05);
  assert.ok(player.snapshot().z >= 1 && player.snapshot().z <= 3, 'road leads to gate');
  for (let i = 0; i < 8; i++) player.tick({right: 1}, .05);
  assert.ok(player.snapshot().x > 3.5, 'player walks through opening into building');
  assert.ok(player.snapshot().y >= 2, 'step remains grounded');
});


test('airborne capsule cannot slip through a low obstacle when floor ahead is slightly higher', () => {
  let raisedHeight = 0;
  const wallStart = 1;
  const world = {
    PLAYER_HEIGHT: 7.2, SEA_LEVEL: -100,
    surfaceAt: x => ({height: x >= wallStart ? raisedHeight : 0}),
    gateRoad: {obstructs(x, y) {
      // A thin overhang/wall at the airborne feet level. A collision query
      // at the *higher* floor would incorrectly clear its top.
      return x >= wallStart && y < raisedHeight + 1;
    }}
  };
  const player = createController(world, {x: 0, z: 0});
  player.tick({jump: true}, .05);
  const inAir = player.snapshot();
  assert.equal(inAir.grounded, false);
  for (let i = 0; i < 3; i++) {
    // Keep the adjacent ledge just above current feet while airborne.
    // This isolates the height passed to the collision callback.
    raisedHeight = player.snapshot().y - 1 + .1;
    player.tick({right: 1}, .05);
  }
  assert.ok(player.snapshot().x < wallStart,
    'airborne player must not enter a wall by checking raised ground instead of current feet');
});
