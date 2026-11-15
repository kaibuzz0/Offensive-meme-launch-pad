import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function controller(world) {
 const sandbox = {};
 vm.runInNewContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), sandbox);
 return sandbox.CityVoxelPhysics.createController(world, { x: 0, z: 0 });
}
function worldWithRoof() {
 return {
  PLAYER_HEIGHT: 1.8,
  SEA_LEVEL: -100,
  surfaceAt: () => ({ height: 0 }),
  // A thin structural slab blocks an intermediate capsule pose, while the
  // jump's endpoint is clear. An endpoint-only test would tunnel through.
  structuralObstructs: (_x, y) => y >= 1.35 && y <= 1.55,
 };
}
test('fast upward movement cannot tunnel through a thin structural ceiling', () => {
 const player = controller(worldWithRoof());
 const before = player.snapshot();
 const after = player.tick({ jump: true }, .05);
 assert.equal(before.y, 1);
 assert.ok(after.y < 1.35, 'feet must stop before the slab');
 assert.equal(after.vy, 0);
});
test('vertical movement proceeds when the structural query reports clear', () => {
 const world = worldWithRoof();
 world.structuralObstructs = () => false;
 const player = controller(world);
 const after = player.tick({ jump: true }, .05);
 assert.ok(after.y > 1.55, 'unobstructed jump should reach the endpoint');
});
test('a failing intermediate roof query cannot escape the simulation', () => {
 const world = worldWithRoof();
 world.structuralObstructs = (_x, y) => {
  if(y >= 1.35 && y <= 1.55) throw Error('chunk unavailable');
  return false;
 };
 const player = controller(world);
 assert.doesNotThrow(() => player.tick({ jump: true }, .05));
 assert.ok(player.snapshot().y < 1.35);
});

test('falling onto an edited structural floor lands and remains supported', () => {
 const world = worldWithRoof();
 let floorEnabled = false;
 // The edit is placed after the player has jumped above the slab.
 world.structuralObstructs = (_x, y) => floorEnabled && y >= 1.35 && y <= 1.55;
 const player = controller(world);
 for (let i = 0; i < 12; i++) player.tick({ jump: i === 0 }, .05);
 assert.ok(player.snapshot().y > 1.8, 'player must rise above the future floor');
 floorEnabled = true;
 let landed = false;
 for (let i = 0; i < 50; i++) {
  const state = player.tick({}, .05);
  if (state.grounded && state.y > 1.55) { landed = true; break; }
 }
 assert.ok(landed, 'fall should land on the edited floor above terrain');
 const standing = player.snapshot();
 assert.equal(standing.vy, 0);
 for (let i = 0; i < 5; i++) player.tick({}, .05);
 assert.ok(player.snapshot().y >= standing.y - .001, 'landing must not sink through the slab');
});

test('edited floor remains stable and releases player after removal', () => {
 const world = worldWithRoof();
 let enabled = false;
 world.structuralObstructs = (_x, y) => enabled && y >= 1.35 && y <= 1.55;
 const player = controller(world);
 for (let i = 0; i < 12; i++) player.tick({ jump: i === 0 }, .05);
 enabled = true;
 let landed = false;
 for (let i = 0; i < 50; i++) {
  const s = player.tick({}, .05);
  if (s.grounded && s.y > 1.55) { landed = true; break; }
 }
 assert.ok(landed, 'must land on the structural floor');
 const height = player.snapshot().y;
 for (let i = 0; i < 8; i++) {
  const s = player.tick({}, .05);
  assert.equal(s.grounded, true);
  assert.equal(s.y, height, 'stationary player must not bob');
 }
 enabled = false;
 let falling = false;
 for (let i = 0; i < 8; i++) {
  const s = player.tick({}, .05);
  if (!s.grounded && s.y < height) falling = true;
 }
 assert.ok(falling, 'removing floor should resume falling');
});

test('a failed intermediate downward occupancy query stops the fall without throwing', () => {
 const world = worldWithRoof();
 let unavailable = false;
 world.structuralObstructs = (_x, y) => {
  if (unavailable && y >= 1.35 && y <= 1.55) throw Error('edited chunk evicted');
  return false;
 };
 const player = controller(world);
 for (let i = 0; i < 12; i++) player.tick({ jump: i === 0 }, .05);
 assert.ok(player.snapshot().y > 1.8, 'player must begin above the missing chunk');
 unavailable = true;
 let stopped = false;
 for (let i = 0; i < 50; i++) {
  assert.doesNotThrow(() => player.tick({}, .05));
  const s = player.snapshot();
  if (s.grounded && s.y > 1.55) {
   assert.equal(s.vy, 0);
   stopped = true;
   break;
  }
 }
 assert.ok(stopped, 'unknown structural occupancy must block falling through it');
 unavailable = false;
 let resumed = false;
 for (let i = 0; i < 20; i++) {
  const s = player.tick({}, .05);
  if (s.y < 1.35) { resumed = true; break; }
 }
 assert.ok(resumed, 'fall should resume when authoritative occupancy returns clear');
});

test('swept horizontal movement rejects a thin edited wall and resumes after removal', () => {
 const world = worldWithRoof();
 let wallEnabled = true;
 world.structuralObstructs = (x) => wallEnabled && x >= .45 && x <= .65;
 const player = controller(world);
 for (let i = 0; i < 5; i++) player.tick({ right: 1 }, .05);
 const blocked = player.snapshot();
 assert.ok(blocked.x < .45, 'capsule must stop before a thin wall');
 assert.equal(blocked.z, 0);
 wallEnabled = false;
 for (let i = 0; i < 3; i++) player.tick({ right: 1 }, .05);
 assert.ok(player.snapshot().x > .65, 'movement must resume when the edit is removed');
});

test('diagonal movement slides along an edited wall without crossing it', () => {
 const world = worldWithRoof();
 world.structuralObstructs = x => x >= .45 && x <= .65;
 const player = controller(world);
 for (let i = 0; i < 8; i++) player.tick({ right: 1, forward: 1 }, .05);
 const state = player.snapshot();
 assert.ok(state.x < .45, 'solid wall must stop lateral penetration');
 assert.ok(state.z > 1, 'unblocked axis must continue sliding along wall');
});

test('temporary horizontal occupancy failure blocks movement and recovers', () => {
 const world = worldWithRoof();
 let unavailable = true;
 world.structuralObstructs = x => {
  if (unavailable && x >= .25) throw Error('chunk unavailable');
  return false;
 };
 const player = controller(world);
 for (let i = 0; i < 4; i++) {
  assert.doesNotThrow(() => player.tick({ right: 1 }, .05));
 }
 assert.ok(player.snapshot().x < .25, 'unknown occupancy must not be traversed');
 unavailable = false;
 for (let i = 0; i < 3; i++) player.tick({ right: 1 }, .05);
 assert.ok(player.snapshot().x > .25, 'controller must recover after chunk returns');
});
