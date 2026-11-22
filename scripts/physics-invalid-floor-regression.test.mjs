import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');
function controller(world) {
 const context = {};
 runInNewContext(source, context);
 return context.CityVoxelPhysics.createController(world, { x: 0, z: 0, y: 1 });
}
function world(surfaceAt, caveRoomAt = () => null) {
 return { PLAYER_HEIGHT: 1.8, SEA_LEVEL: -100, surfaceAt, caveRoomAt };
}
test('invalid surface heights cannot corrupt movement or teleport state', () => {
 let corrupt = false;
 const c = controller(world((x) => ({height: corrupt && x >= 1 ? NaN : 0})));
 const before = {...c.snapshot()};
 corrupt = true;
 assert.equal(c.teleport(2, 0), false);
 assert.deepEqual({...c.snapshot()}, before);
 for (let i = 0; i < 8; i++) {
  const next = {...c.tick({right: 1}, .05)};
  for (const value of Object.values(next)) if (typeof value === 'number') assert.ok(Number.isFinite(value));
 }
});
test('invalid cave floor samples reject teleport without modifying player', () => {
 const c = controller(world(() => ({height:0}), x => x >= 2 ? ({floor: NaN, ceiling: 4, exposed:true}) : null));
 const before = {...c.snapshot()};
 assert.equal(c.teleport(3, 0), false);
 assert.deepEqual({...c.snapshot()}, before);
});
