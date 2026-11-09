import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

// Rendering parity regression: actor meshes must consume the canonical
// chunk descriptors, not invent a second population or alter terrain LOD.
const ctx={};
for(const file of ['city-worldgen.js','city-terrain-world.js','city-voxel-world.js','city-voxel-renderer.js'])
 vm.runInNewContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx,{filename:file});
const catalog=Array.from({length:132},(_,i)=>({
 id:'terrain-'+i,name:'Biome '+i,
 group:['evergreen','desert','tundra','wetland','volcanic','alpine','tropical','grassland','salt','crystal','fungal','ruins'][Math.floor(i/11)],
 material:'topsoil',hue:(i*19)%360,sat:30+(i%6)*6,light:40
}));
const world=ctx.CityVoxelWorld.createVoxelWorld(ctx.CityTerrainWorld.createTerrain('fortress-road',catalog));
const renderer=ctx.CityVoxelRenderer;

test('actor silhouettes use chunk ownership, preserve terrain LOD and stay deterministic',()=>{
 const actors=world.actorsNear(world.gateRoad.supplies.x,world.gateRoad.supplies.z,256);
 assert.ok(actors.length>0,'fixture must contain a visible starter actor');
 for(const actor of actors){
  const cx=Math.floor(actor.x/16),cz=Math.floor(actor.z/16);
  const chunk=world.chunkAt(cx,cz);
  assert.equal(chunk.npc.filter(a=>a.id===actor.id).length,1);
  // The canonical world is frozen; a prototype child cannot shadow its
  // non-writable chunkAt method. Copy its public interface for this test.
  const withoutActors={...world,chunkAt:(x,z)=>{
   const original=world.chunkAt(x,z);
   return original&&{...original,npc:[]};
  }};
  const visible=renderer.generateMesh(world,cx,cz,1);
  const empty=renderer.generateMesh(withoutActors,cx,cz,1);
  assert.ok(visible.vertices>empty.vertices,'near actor adds visible geometry');
  // Actor boxes are inserted between structures and foliage. Comparing the
  // entire no-actor mesh as a prefix is incorrect whenever a chunk has plants.
  // The canonical terrain and foliage counts must remain unchanged.
  assert.equal(visible.tiles,empty.tiles,'actors must not alter terrain tiles');
  assert.equal(visible.plants,empty.plants,'actors must not alter foliage');
  assert.deepEqual(Array.from(renderer.generateMesh(world,cx,cz,1).data),
   Array.from(visible.data),'same seed and chunk produce identical actor geometry');
  const distant=renderer.generateMesh(world,cx,cz,4);
  const distantWithout=renderer.generateMesh(withoutActors,cx,cz,4);
  assert.deepEqual(Array.from(distant.data),Array.from(distantWithout.data),
   'distant LOD must not duplicate actor geometry');
 }
});

test('actor queries remain bounded, stable and independent of chunk activation',()=>{
 const center=world.gateRoad.supplies;
 const near=world.actorsNear(center.x,center.z,256);
 assert.ok(near.length>0);
 assert.ok(near.length<=2,'starter population has a fixed upper bound');
 assert.equal(world.actorsNear(center.x,center.z,-1).length,0);
 assert.equal(world.actorsNear(NaN,center.z,10).length,0);
 assert.equal(world.actorsNear(center.x,Infinity,10).length,0);
 assert.equal(world.actorsNear(center.x,center.z,NaN).length,0);
 assert.equal(world.actorById('unknown:retired-actor'),null);
 assert.equal(world.actorById(null),null);
 for(const actor of near){
  assert.strictEqual(world.actorById(actor.id),actor,
   'stable IDs resolve the same immutable descriptor');
  assert.ok(Object.isFrozen(actor),'actor definitions must not carry mutable AI state');
  assert.strictEqual(world.actorsNear(actor.x,actor.z,0)[0],actor,
   'exact-position queries reuse the canonical descriptor');
  const cx=Math.floor(actor.x/16),cz=Math.floor(actor.z/16);
  assert.strictEqual(world.chunkAt(cx,cz).npc.find(a=>a.id===actor.id),actor,
   'chunk streaming must not recreate or rename actors');
 }
 assert.deepEqual(world.actorsNear(center.x,center.z,256).map(a=>a.id),
  near.map(a=>a.id),'repeat queries must preserve order and IDs');
});


test('seeded actors survive chunk eviction and preserve spatial query boundaries',()=>{
 const center=world.gateRoad.supplies;
 const actors=world.actorsNear(center.x,center.z,256);
 const rebuilt=ctx.CityVoxelWorld.createVoxelWorld(ctx.CityTerrainWorld.createTerrain('fortress-road',catalog));
 assert.deepEqual(rebuilt.actorsNear(center.x,center.z,256).map(a=>({id:a.id,x:a.x,z:a.z,role:a.role})),
  actors.map(a=>({id:a.id,x:a.x,z:a.z,role:a.role})),
  'reconstructing the same seed must preserve actor identity and placement');
 for(const actor of actors){
  const cx=Math.floor(actor.x/16),cz=Math.floor(actor.z/16);
  const before=world.chunkAt(cx,cz).npc.map(a=>a.id);
  // Streaming unrelated chunks must not change the population or ownership.
  world.chunkAt(cx+32,cz+32);
  world.chunkAt(cx-32,cz-32);
  assert.deepEqual(world.chunkAt(cx,cz).npc.map(a=>a.id),before);
  assert.equal(world.actorsNear(actor.x,actor.z,0).filter(a=>a.id===actor.id).length,1);
  assert.equal(world.actorsNear(actor.x+512,actor.z+512,0).some(a=>a.id===actor.id),false);
 }
});
