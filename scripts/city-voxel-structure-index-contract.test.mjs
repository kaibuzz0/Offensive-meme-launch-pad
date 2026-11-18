import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const context={};
for(const file of ['city-worldgen.js','city-terrain-world.js','city-voxel-world.js'])
 vm.runInNewContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),context,{filename:file});
const groups=['evergreen','desert','tundra','wetland','volcanic','alpine','tropical','grassland','salt','crystal','fungal','ruins'];
const catalog=Array.from({length:132},(_,i)=>({
 id:'terrain-'+i,name:'Biome '+i,group:groups[Math.floor(i/11)],
 material:'topsoil',hue:(i*19)%360,sat:30+(i%6)*6,light:40
}));
const make=seed=>context.CityVoxelWorld.createVoxelWorld(context.CityTerrainWorld.createTerrain(seed,catalog));
const plain=value=>JSON.parse(JSON.stringify(value));

test('starter structure fragments are indexed once and shared across chunk reloads',()=>{
 for(const seed of ['structure-index-a','structure-index-b']){
  const world=make(seed),replay=make(seed),{x,z}=world.gateRoad;
  const cx=Math.floor(x/world.CHUNK_SIZE),cz=Math.floor(z/world.CHUNK_SIZE);
  const visited=new Set();
  for(let dz=-3;dz<=4;dz++)for(let dx=-3;dx<=3;dx++){
   const qx=cx+dx,qz=cz+dz;
   const first=world.gateParts(qx,qz);
   assert.strictEqual(world.gateParts(qx,qz),first,'chunk fragment list must be reused');
   assert.ok(Object.isFrozen(first),'fragment list must be immutable');
   assert.deepEqual(plain(first),plain(replay.gateParts(qx,qz)));
   assert.strictEqual(world.chunkAt(qx,qz).structures[0],first[0]);
   for(const part of first){
    assert.ok(Object.isFrozen(part));
    assert.ok(part.x>=qx*world.CHUNK_SIZE-1e-8);
    assert.ok(part.z>=qz*world.CHUNK_SIZE-1e-8);
    assert.ok(part.x+part.w<=(qx+1)*world.CHUNK_SIZE+1e-8);
    assert.ok(part.z+part.d<=(qz+1)*world.CHUNK_SIZE+1e-8);
    assert.ok(!visited.has(part.fragmentId),'fragments must have one owning chunk');
    visited.add(part.fragmentId);
   }
  }
  assert.ok(visited.size>0);
  const far=world.gateParts(cx+10000,cz+10000);
  assert.equal(far.length,0);
  assert.strictEqual(far,world.gateParts(cx-10000,cz-10000));
 }
});
