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
const make=seed=>ctx.CityVoxelWorld.createVoxelWorld(ctx.CityTerrainWorld.createTerrain(seed,catalog));
const snapshot=value=>JSON.parse(JSON.stringify(value));

test('roadside foliage is deterministic, terrain-fitted and owned by exactly one streamed chunk',()=>{
 for(const seed of ['road-flora-a','road-flora-b','road-flora-c']){
  const world=make(seed),again=make(seed),seen=new Set();
  const {x,z}=world.gateRoad;
  // Cover the entire approach and both shoulders, including negative chunk boundaries.
  const minCX=Math.floor((x-12)/world.CHUNK_SIZE),maxCX=Math.floor((x+12)/world.CHUNK_SIZE);
  const minCZ=Math.floor((z+2)/world.CHUNK_SIZE),maxCZ=Math.floor((z+30)/world.CHUNK_SIZE);
  for(let cz=minCZ;cz<=maxCZ;cz++)for(let cx=minCX;cx<=maxCX;cx++){
   const chunk=world.chunkAt(cx,cz),replay=again.chunkAt(cx,cz);
   assert.deepEqual(snapshot(chunk.plants),snapshot(replay.plants),'same seed must reproduce foliage');
   for(const plant of chunk.plants){
    assert.ok(plant.x>=cx*world.CHUNK_SIZE&&plant.x<(cx+1)*world.CHUNK_SIZE);
    assert.ok(plant.z>=cz*world.CHUNK_SIZE&&plant.z<(cz+1)*world.CHUNK_SIZE);
    assert.equal(plant.y,world.surfaceAt(plant.x,plant.z).height+1);
    assert.equal(world.surfaceAt(plant.x,plant.z).road===true,false,'foliage cannot block graded road');
    assert.ok(!seen.has(plant.id),'a plant must not duplicate across chunks');
    seen.add(plant.id);
   }
  }
 }
});

test('repeated foliage lookups do not create caves or mutate actor identity',()=>{
 const world=make('flora-actor-cache');
 const fox=world.actorsNear(world.gateRoad.x+3,world.gateRoad.z+22,0)[0];
 assert.ok(fox);
 const caveCount=world.caveCacheSize();
 for(let i=0;i<30;i++){
  const x=world.gateRoad.x+(i%17)-8,z=world.gateRoad.z+4+(i%25);
  const feature=world.featureAt(x,z);
  if(feature)assert.ok(Object.isFrozen(feature));
  assert.equal(world.actorById(fox.id),fox);
 }
 assert.equal(world.caveCacheSize(),caveCount);
});
