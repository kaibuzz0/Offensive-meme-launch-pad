import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const ctx={};
for(const file of ['city-worldgen.js','city-terrain-world.js','city-voxel-world.js'])
 vm.runInNewContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx,{filename:file});
const catalog=Array.from({length:132},(_,i)=>({
 id:'terrain-'+i,name:'Biome '+i,
 group:['evergreen','desert','tundra','wetland','volcanic','alpine','tropical','grassland','salt','crystal','fungal','ruins'][Math.floor(i/11)],
 material:'topsoil',hue:(i*19)%360,sat:30+(i%6)*6,light:40
}));
const world=ctx.CityVoxelWorld.createVoxelWorld(ctx.CityTerrainWorld.createTerrain('edge-domain-contract',catalog));

test('positive edge chunk rejects out-of-domain tiles without mutating caches',()=>{
 const before=world.cacheSize();
 for(const [cx,cz] of [[62500,0],[0,62500],[62500,62500],[-62501,0],[0,-62501]]){
  assert.equal(world.chunkAt(cx,cz),null,`invalid chunk ${cx},${cz}`);
 }
 assert.equal(world.cacheSize(),before);
});

test('last fully representable positive and negative chunks remain valid',()=>{
 for(const [cx,cz] of [[62499,0],[0,62499],[-62500,0],[0,-62500]]){
  const chunk=world.chunkAt(cx,cz);
  assert.ok(chunk,`valid chunk ${cx},${cz}`);
  assert.equal(chunk.tiles.length,world.CHUNK_SIZE**2);
  assert.ok(chunk.tiles.every(Boolean),'no null tiles in accepted chunks');
 }
});
