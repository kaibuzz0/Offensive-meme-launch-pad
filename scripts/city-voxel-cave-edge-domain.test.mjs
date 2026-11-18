import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../city-voxel-world.js',import.meta.url),'utf8');
const groups=['evergreen','desert','tundra','wetland','volcanic','alpine','tropical','grassland','salt','crystal','fungal','ruins'];
const catalog=Array.from({length:132},(_,i)=>({id:'terrain-'+i,name:'Biome '+i,
 group:groups[Math.floor(i/11)],hue:(i*19)%360,sat:45,light:40}));

test('cave queries at supported domain edges never sample invalid mouth terrain',()=>{
 for(let seed=1;seed<=24;seed++){
  const ctx={};vm.runInNewContext(source,ctx);
  const atlas={seedHash:seed,biomeAt:()=>catalog[0],spawnAt:()=>({x:0,y:0})};
  const world=ctx.CityVoxelWorld.createVoxelWorld(atlas);
  for(const x of [-1000000,-999999,999999,1000000])
   for(const z of [-1000000,-999999,999999,1000000,0]){
    assert.doesNotThrow(()=>world.caveRoomAt(x,z),`seed ${seed}, ${x},${z}`);
    assert.ok(world.caveCacheSize()<=256);
   }
  assert.equal(world.caveRoomAt(1000001,0),null);
 }
});
