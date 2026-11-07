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

test('jumping under a solid fortress lintel stops at its underside', () => {
  const world = {
    PLAYER_HEIGHT: 7.2, SEA_LEVEL: -100,
    surfaceAt: () => ({height: 0}),
    gateRoad: {
      parts: [{x: -2, z: -2, y: 10, w: 4, h: 2, d: 4, solid: true}],
      obstructs: () => false
    }
  };
  const player = createController(world, {x: 0, z: 0});
  let hit = false;
  for (let i = 0; i < 20; i++) {
    const before = player.snapshot();
    const after = player.tick({jump: i === 0}, .05);
    assert.ok(after.y + world.PLAYER_HEIGHT <= 10 + 1e-9,
      'head must never pass through fortress lintel');
    if (before.vy > 0 && after.vy === 0 && !after.grounded) hit = true;
  }
  assert.ok(hit, 'upward collision must cancel ascent');
});

test('jumping beside the fortress lintel retains normal ascent', () => {
  const world = {
    PLAYER_HEIGHT: 7.2, SEA_LEVEL: -100,
    surfaceAt: () => ({height: 0}),
    gateRoad: {
      parts: [{x: 3, z: -2, y: 10, w: 4, h: 2, d: 4, solid: true}],
      obstructs: () => false
    }
  };
  const player = createController(world, {x: 0, z: 0});
  for (let i = 0; i < 5; i++) player.tick({jump: i === 0}, .05);
  assert.ok(player.snapshot().y > 2.8, 'open sky must not inherit lintel collision');
});

test('falling onto a solid fortress roof lands on its top without tunneling', () => {
  let terrainHeight = 10;
  const world = {
    PLAYER_HEIGHT: 7.2, SEA_LEVEL: -100,
    surfaceAt: () => ({height: terrainHeight}),
    gateRoad: {
      parts: [{x: -2, z: -2, y: 4, w: 4, d: 4, h: 1, solid: true}],
      obstructs: () => false
    }
  };
  const player = createController(world, {x: 0, z: 0});
  terrainHeight = 0;
  player.tick({}, .05);
  let landed = false;
  for (let i = 0; i < 80; i++) {
    const p = player.tick({}, .05);
    if (p.grounded && Math.abs(p.y - 5) < 1e-9) {landed = true; break;}
  }
  assert.ok(landed, 'player should land on the real solid roof top');
  for (let i = 0; i < 10; i++) assert.equal(player.tick({}, .05).y, 5);
});

test('falling beside a fortress roof does not snap onto its top', () => {
  let terrainHeight = 10;
  const world = {
    PLAYER_HEIGHT: 7.2, SEA_LEVEL: -100,
    surfaceAt: () => ({height: terrainHeight}),
    gateRoad: {
      parts: [{x: 3, z: -2, y: 4, w: 4, d: 4, h: 1, solid: true}],
      obstructs: () => false
    }
  };
  const player = createController(world, {x: 0, z: 0});
  terrainHeight = 0;
  player.tick({}, .05);
  for (let i = 0; i < 80; i++) player.tick({}, .05);
  assert.equal(player.snapshot().y, 1);
  assert.equal(player.snapshot().grounded, true);
});
