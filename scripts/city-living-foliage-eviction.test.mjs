import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const context = {};
for (const file of ['city-worldgen.js', 'city-terrain-world.js', 'city-voxel-world.js']) {
  vm.runInNewContext(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), context, {filename:file});
}
const catalog = Array.from({length:132}, (_,i)=>({
  id:'terrain-'+i,name:'Biome '+i,
  group:['evergreen','desert','tundra','wetland','volcanic','alpine','tropical','grassland','salt','crystal','fungal','ruins'][Math.floor(i/11)],
  material:'topsoil',hue:(i*19)%360,sat:30+(i%6)*6,light:40
}));
const make = seed => context.CityVoxelWorld.createVoxelWorld(context.CityTerrainWorld.createTerrain(seed,catalog));
const plain = value => JSON.parse(JSON.stringify(value));

test('streamed foliage is seed-stable after distant terrain-cache churn', () => {
  const seed='living-foliage-eviction';
  const world=make(seed);
  const spawn=world.spawnAt();
  const cx=Math.floor(spawn.x/16),cz=Math.floor(spawn.z/16);
  const before=plain(world.chunkAt(cx,cz).plants);
  assert.ok(before.length<=256,'a chunk may not exceed its 16x16 plant-cell budget');
  assert.equal(new Set(before.map(p=>p.id)).size,before.length);
  // Exceed the terrain column cache capacity without retaining the traversed chunks.
  for(let i=0;i<23000;i++)world.surfaceAt(20000+i,30000+(i%13));
  const after=plain(world.chunkAt(cx,cz).plants);
  assert.deepEqual(after,before,'eviction must not alter local vegetation identities');
  assert.deepEqual(after,plain(make(seed).chunkAt(cx,cz).plants),'fresh regeneration must match');
  for(const p of after){
    assert.ok(p.x>=cx*16&&p.x<(cx+1)*16);
    assert.ok(p.z>=cz*16&&p.z<(cz+1)*16);
  }
});
