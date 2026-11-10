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

test('starter actors stand on terrain without overlapping fortress collision',()=>{
 const center=world.gateRoad.supplies;
 const actors=world.actorsNear(center.x,center.z,256);
 for(const actor of actors){
  const ground=world.surfaceAt(actor.x,actor.z);
  assert.ok(ground&&!ground.water&&!ground.mouth,
   'actors require a dry standing surface');
  assert.equal(actor.y,ground.height+1,
   'actor feet must follow the canonical terrain grade');
  for(const [dx,dz] of [[.25,.25],[.75,.25],[.25,.75],[.75,.75]]){
   assert.equal(world.gateRoad.obstructs(actor.x+dx,actor.y,actor.z+dz,
    world.PLAYER_HEIGHT,.35),false,
   'actor footprint must not overlap fortress collision');
  }
 }
});


test('streamed neighboring chunks never double-own a seeded actor',()=>{
 const center=world.gateRoad.supplies;
 const actors=world.actorsNear(center.x,center.z,256);
 const seen=new Map();
 for(const actor of actors){
  const cx=Math.floor(actor.x/16),cz=Math.floor(actor.z/16);
  for(let dx=-1;dx<=1;dx++) for(let dz=-1;dz<=1;dz++){
   const chunk=world.chunkAt(cx+dx,cz+dz);
   for(const entry of chunk.npc){
    if(entry.id!==actor.id) continue;
    const owner=(cx+dx)+','+(cz+dz);
    assert.equal(owner,cx+','+cz,'actor must belong to its position-derived chunk');
    assert.equal(seen.has(entry.id),false,'actor must appear in exactly one streamed chunk');
    seen.set(entry.id,owner);
   }
  }
  assert.equal(seen.has(actor.id),true,'each queried actor must be owned by a chunk');
 }
});


test('starter actor standing footprints remain clear of tall seeded vegetation',()=>{
 const actors=world.actorsNear(world.gateRoad.supplies.x,world.gateRoad.supplies.z,256);
 assert.ok(actors.length>0,'starter actor fixture must be present');
 for(const actor of actors){
  for(const [dx,dz] of [[0,0],[1,0],[0,1],[1,1]]){
   const feature=world.featureAt(actor.x+dx,actor.z+dz);
   assert.ok(!feature||feature.height<6,
    'seeded actor footprints must not overlap tree or tall vegetation geometry');
  }
 }
});


test('actor identities are isolated between different seeded worlds',()=>{
 const other=ctx.CityVoxelWorld.createVoxelWorld(ctx.CityTerrainWorld.createTerrain('fortress-road-alternate',catalog));
 const original=world.actorsNear(world.gateRoad.supplies.x,world.gateRoad.supplies.z,256);
 const alternate=other.actorsNear(other.gateRoad.supplies.x,other.gateRoad.supplies.z,256);
 assert.ok(original.length>0&&alternate.length>0,'both worlds should seed starter actors');
 assert.notEqual(world.seed,other.seed,'fixture must use distinct world seeds');
 const originalIds=new Set(original.map(actor=>actor.id));
 for(const actor of alternate){
  assert.equal(originalIds.has(actor.id),false,'different world seeds must not share persistent actor IDs');
  assert.strictEqual(other.actorById(actor.id),actor,'alternate world resolves its own actor');
  assert.equal(world.actorById(actor.id),null,'cross-world actor IDs must not resolve');
 }
});


test('chunk request order cannot change seeded actor mesh or ownership',()=>{
 const seed='fortress-road';
 const a=ctx.CityVoxelWorld.createVoxelWorld(ctx.CityTerrainWorld.createTerrain(seed,catalog));
 const b=ctx.CityVoxelWorld.createVoxelWorld(ctx.CityTerrainWorld.createTerrain(seed,catalog));
 const actors=a.actorsNear(a.gateRoad.supplies.x,a.gateRoad.supplies.z,256);
 assert.ok(actors.length>0);
 for(const actor of actors){
  const cx=Math.floor(actor.x/16),cz=Math.floor(actor.z/16);
  // A streamed world may visit far chunks first or load adjacent chunks
  // before the actor's home chunk; generation must not depend on visit order.
  const first=a.chunkAt(cx,cz);
  b.chunkAt(cx+64,cz-64);
  b.chunkAt(cx+1,cz);
  b.chunkAt(cx,cz+1);
  const second=b.chunkAt(cx,cz);
  assert.deepEqual(second.npc.map(n=>n.id),first.npc.map(n=>n.id));
  assert.deepEqual(Array.from(renderer.generateMesh(a,cx,cz,1).data),
   Array.from(renderer.generateMesh(b,cx,cz,1).data),
   'first-person geometry must be independent of chunk activation order');
 }
});
