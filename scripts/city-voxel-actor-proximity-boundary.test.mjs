import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const context={};
for(const file of ['city-worldgen.js','city-terrain-world.js','city-voxel-world.js'])
 vm.runInNewContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),context,{filename:file});
const groups=['evergreen','desert','tundra','wetland','volcanic','alpine','tropical','grassland','salt','crystal','fungal','ruins'];
const catalog=Array.from({length:132},(_,i)=>({
 id:'terrain-'+i,name:'Biome '+i,group:groups[Math.floor(i/11)],
 material:'topsoil',hue:(i*19)%360,sat:30+(i%6)*6,light:40
}));
const make=seed=>context.CityVoxelWorld.createVoxelWorld(context.CityTerrainWorld.createTerrain(seed,catalog));

test('actor proximity radius includes boundary, excludes outside and never allocates remote chunks',()=>{
 for(const seed of ['proximity-edge-a','proximity-edge-b']){
  const world=make(seed);
  const fox=world.actorById('wildlife:'+world.seed+':fortress-road:0');
  const keeper=world.actorById('npc:'+world.seed+':roadside-lodge:keeper');
  assert.ok(fox&&keeper);
  const terrainBefore=world.cacheSize(),cavesBefore=world.caveCacheSize();
  for(const actor of [fox,keeper]){
   assert.ok(world.actorsNear(actor.x,actor.z,0).includes(actor));
   assert.ok(world.actorsNear(actor.x+3,actor.z,3).includes(actor),'radius boundary is inclusive');
   assert.ok(!world.actorsNear(actor.x+3.01,actor.z,3).includes(actor),'outside radius is excluded');
  }
  for(const query of [
   [1e200,1e200,1],[-1e200,-1e200,1],
   [fox.x,fox.z,1e200],[fox.x,fox.z,Number.MAX_VALUE],
   [fox.x,fox.z,-Infinity],[fox.x,fox.z,Infinity]
  ]){
   const result=world.actorsNear(...query);
   assert.ok(Object.isFrozen(result));
   assert.equal(new Set(result.map(a=>a.id)).size,result.length);
   assert.ok(result.length<=2);
  }
  assert.equal(world.cacheSize(),terrainBefore);
  assert.equal(world.caveCacheSize(),cavesBefore);
  assert.strictEqual(world.actorById(fox.id),fox);
  assert.strictEqual(world.actorById(keeper.id),keeper);
 }
});
