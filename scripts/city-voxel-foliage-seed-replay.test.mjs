import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function world(seed){
 const context={};
 for(const file of ['city-worldgen.js','city-terrain-world.js','city-voxel-world.js'])
  vm.runInNewContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),context,{filename:file});
 const groups=['evergreen','desert','tundra','wetland','volcanic','alpine','tropical','grassland','salt','crystal','fungal','ruins'];
 const catalog=Array.from({length:132},(_,i)=>({
  id:'terrain-'+i,name:'Biome '+i,group:groups[Math.floor(i/11)],
  material:'topsoil',hue:(i*19)%360,sat:30+(i%6)*6,light:40
 }));
 return context.CityVoxelWorld.createVoxelWorld(context.CityTerrainWorld.createTerrain(seed,catalog));
}
const plain=value=>JSON.parse(JSON.stringify(value));

test('foliage stays seed-stable, terrain-fitted and chunk-owned across regeneration',()=>{
 for(const seed of ['foliage-replay-a','foliage-replay-b']){
  const a=world(seed),b=world(seed);
  const {x,z}=a.gateRoad;
  for(let dz=0;dz<3;dz++)for(let dx=-1;dx<=1;dx++){
   const cx=Math.floor(x/a.CHUNK_SIZE)+dx,cz=Math.floor(z/a.CHUNK_SIZE)+dz;
   const first=a.chunkAt(cx,cz),second=b.chunkAt(cx,cz);
   assert.deepEqual(plain(first.plants),plain(second.plants));
   assert.equal(new Set(first.plants.map(p=>p.id)).size,first.plants.length);
   for(const plant of first.plants){
    assert.equal(Math.floor(plant.x/a.CHUNK_SIZE),cx);
    assert.equal(Math.floor(plant.z/a.CHUNK_SIZE),cz);
    assert.equal(plant.y,a.surfaceAt(plant.x,plant.z).height+1);
    assert.ok(!a.surfaceAt(plant.x,plant.z).water);
    assert.ok(Object.isFrozen(plant));
   }
   assert.strictEqual(a.chunkAt(cx,cz),first,'cached chunk must preserve immutable foliage identities');
  }
  assert.ok(a.chunkCacheSize()<=12);
 }
});
