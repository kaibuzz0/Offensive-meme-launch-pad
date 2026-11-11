import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const root={};
for(const file of ['city-worldgen.js','city-terrain-world.js','city-voxel-world.js'])
 vm.runInNewContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),root,{filename:file});
const groups=['evergreen','desert','tundra','wetland','volcanic','alpine','tropical','grassland','salt','crystal','fungal','ruins'];
const catalog=Array.from({length:132},(_,i)=>({
 id:'terrain-'+i,name:'Biome '+i,group:groups[Math.floor(i/11)],
 material:'topsoil',hue:(i*19)%360,sat:30+(i%6)*6,light:40
}));
const create=()=>root.CityVoxelWorld.createVoxelWorld(root.CityTerrainWorld.createTerrain('column-reuse-20261111',catalog));
const plain=value=>JSON.parse(JSON.stringify(value));

test('chunk vegetation matches direct seeded world queries after column reuse',()=>{
 const world=create(),spawn=world.spawnAt();
 for(const [cx,cz] of [[0,0],[-1,1],[Math.floor(spawn.x/16),Math.floor(spawn.z/16)]]){
  const chunk=world.chunkAt(cx,cz);
  assert.equal(chunk.tiles.length,256);
  const expected=[];
  for(const tile of chunk.tiles){
   const plant=world.featureAt(tile.x,tile.z);
   if(plant)expected.push({id:'plant:'+world.seed+':'+tile.x+':'+tile.z,
    x:tile.x,z:tile.z,y:tile.height+1,...plant});
  }
  assert.deepEqual(plain(chunk.plants),plain(expected));
  assert.deepEqual(plain(world.chunkAt(cx,cz).plants),plain(chunk.plants));
 }
 assert.ok(world.cacheSize()<=22528);
});


test('vegetation identities and placement survive surface-cache eviction',()=>{
 const world=create(),spawn=world.spawnAt();
 const cx=Math.floor(spawn.x/16)+3,cz=Math.floor(spawn.z/16)+3;
 const before=plain(world.chunkAt(cx,cz).plants);
 // Exceed the documented bounded surface cache without changing seed or edits.
 for(let i=0;i<23000;i++)world.surfaceAt(100000+i,100000);
 assert.ok(world.cacheSize()<=22528,'surface cache must remain bounded');
 const after=plain(world.chunkAt(cx,cz).plants);
 assert.deepEqual(after,before,'cache eviction must not change plant identities or geometry');
 const again=plain(create().chunkAt(cx,cz).plants);
 assert.deepEqual(again,before,'fresh world with the same seed must regenerate identical plants');
});

test('negative-coordinate chunk boundaries preserve deterministic vegetation ownership',()=>{
 const world=create();
 for(const [cx,cz] of [[-2,-2],[-1,0],[0,-1],[1,-1]]){
  const chunk=world.chunkAt(cx,cz);
  const ids=new Set();
  for(const plant of chunk.plants){
   assert.equal(Math.floor(plant.x/16),cx,'plant must belong to its X chunk');
   assert.equal(Math.floor(plant.z/16),cz,'plant must belong to its Z chunk');
   assert.ok(!ids.has(plant.id),'plant identity must be unique per chunk');
   ids.add(plant.id);
   assert.deepEqual(plain(world.featureAt(plant.x,plant.z)),plain({
    type:plant.type,height:plant.height,color:plant.color
   }));
  }
  assert.deepEqual(plain(chunk.plants),plain(create().chunkAt(cx,cz).plants));
 }
});
