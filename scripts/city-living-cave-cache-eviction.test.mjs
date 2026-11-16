import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const context={};
for(const file of ['city-worldgen.js','city-terrain-world.js','city-voxel-world.js']){
  vm.runInNewContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),context,{filename:file});
}
const catalog=Array.from({length:132},(_,i)=>({
  id:'terrain-'+i,name:'Biome '+i,
  group:['evergreen','desert','tundra','wetland','volcanic','alpine','tropical','grassland','salt','crystal','fungal','ruins'][Math.floor(i/11)],
  material:'topsoil',hue:(i*19)%360,sat:30+(i%6)*6,light:40
}));
const create=seed=>context.CityVoxelWorld.createVoxelWorld(context.CityTerrainWorld.createTerrain(seed,catalog));
const plain=value=>JSON.parse(JSON.stringify(value));

test('cave descriptors regenerate identically after bounded cave-cell eviction',()=>{
  for(const seed of ['fortress-road','cave-test']){
    const world=create(seed),fresh=create(seed);
    const points=[[-113,-113],[-1,-1],[0,0],[111,111],[112,112],[225,-225]];
    const baseline=points.map(([x,z])=>plain(world.caveRoomAt(x,z)));
    for(let i=0;i<500;i++){
      const x=(i-250)*112+24,z=(i*31-250)*112+24;
      world.caveRoomAt(x,z);
      assert.ok(world.caveCacheSize()<=256,'cave-cell cache must stay bounded');
    }
    assert.deepEqual(points.map(([x,z])=>plain(world.caveRoomAt(x,z))),baseline,
      'eviction must not change world geometry');
    assert.deepEqual(points.map(([x,z])=>plain(fresh.caveRoomAt(x,z))),baseline,
      'reloaded worlds must preserve cave identities and dimensions');
  }
});
