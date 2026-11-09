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
  const withoutActors=Object.create(world);
  withoutActors.chunkAt=(x,z)=>{
   const original=world.chunkAt(x,z);
   return original&&{...original,npc:[]};
  };
  const visible=renderer.generateMesh(world,cx,cz,1);
  const empty=renderer.generateMesh(withoutActors,cx,cz,1);
  assert.ok(visible.vertices>empty.vertices,'near actor adds visible geometry');
  assert.deepEqual(Array.from(visible.data.slice(0,empty.data.length)),
   Array.from(empty.data),'actor rendering must not alter preceding terrain/structures');
  assert.deepEqual(Array.from(renderer.generateMesh(world,cx,cz,1).data),
   Array.from(visible.data),'same seed and chunk produce identical actor geometry');
  const distant=renderer.generateMesh(world,cx,cz,4);
  const distantWithout=renderer.generateMesh(withoutActors,cx,cz,4);
  assert.deepEqual(Array.from(distant.data),Array.from(distantWithout.data),
   'distant LOD must not duplicate actor geometry');
 }
});
