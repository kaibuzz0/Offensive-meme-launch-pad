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
const plain=x=>JSON.parse(JSON.stringify(x));

test('seeded roadside wildlife survives chunk regeneration and has one owner',()=>{
 for(const seed of ['actor-owner-a','actor-owner-b','actor-owner-c']){
  const world=make(seed),replay=make(seed),{x,z}=world.gateRoad;
  const actor=world.actorsNear(x+3,z+22,0)[0];
  assert.ok(actor,'the seeded road must expose its fox');
  assert.ok(Object.isFrozen(actor));
  assert.equal(world.actorById(actor.id),actor);
  assert.deepEqual(plain(actor),plain(replay.actorById(actor.id)));
  assert.equal(actor.y,world.surfaceAt(actor.x,actor.z).height+1);
  const cx=Math.floor(actor.x/world.CHUNK_SIZE),cz=Math.floor(actor.z/world.CHUNK_SIZE);
  const before=world.chunkAt(cx,cz),after=world.chunkAt(cx,cz);
  assert.equal(before.npc.length,1);
  assert.equal(before.npc[0],actor);
  assert.equal(after.npc[0],actor,'chunk reload must not allocate a new identity');
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
   if(dx===0&&dz===0)continue;
   assert.equal(world.chunkAt(cx+dx,cz+dz).npc.length,0,'neighbor chunk must not duplicate actor');
  }
 }
});

test('invalid and remote actor queries avoid chunk allocation and cache growth',()=>{
 const world=make('actor-query-boundary'),{x,z}=world.gateRoad;
 const before=world.cacheSize(),caves=world.caveCacheSize();
 for(const [qx,qz,r] of [[NaN,z,10],[x,Infinity,10],[x,z,-1],[x,z,NaN],[x+10000,z+10000,1]]){
  assert.equal(world.actorsNear(qx,qz,r).length,0);
 }
 assert.equal(world.actorById('missing'),null);
 assert.equal(world.actorById(null),null);
 assert.equal(world.cacheSize(),before);
 assert.equal(world.caveCacheSize(),caves);
});
