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
  assert.equal(before.npc.filter(a=>a.kind==='wildlife').length,1);
  assert.equal(before.npc[0],actor);
  assert.equal(after.npc[0],actor,'chunk reload must not allocate a new identity');
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
   if(dx===0&&dz===0)continue;
   assert.equal(world.chunkAt(cx+dx,cz+dz).npc.filter(a=>a.kind==='wildlife').length,0,'neighbor chunk must not duplicate fox');
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

test('lodge keeper retains seed identity, single-chunk ownership and bounded proximity queries',()=>{
 for(const seed of ['keeper-owner-a','keeper-owner-b']){
  const world=make(seed),replay=make(seed);
  const id='npc:'+world.seed+':roadside-lodge:keeper';
  const keeper=world.actorById(id);
  assert.ok(keeper,'keeper must be addressable without generating a chunk');
  assert.equal(keeper.role,'supply-keeper');
  assert.equal(keeper.faction,'roadside-neutral');
  assert.ok(Object.isFrozen(keeper));
  assert.deepEqual(plain(keeper),plain(replay.actorById(id)));
  const cx=Math.floor(keeper.x/world.CHUNK_SIZE),cz=Math.floor(keeper.z/world.CHUNK_SIZE);
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
   const actors=world.chunkAt(cx+dx,cz+dz).npc.filter(a=>a.id===id);
   assert.equal(actors.length,dx===0&&dz===0?1:0,'keeper must have exactly one owning chunk');
   if(dx===0&&dz===0)assert.equal(actors[0],keeper);
  }
  const near=world.actorsNear(keeper.x,keeper.z,0);
  assert.equal(near.filter(a=>a.id===id).length,1);
  assert.equal(near.find(a=>a.id===id),keeper);
  const before=world.cacheSize(),caves=world.caveCacheSize();
  assert.equal(world.actorsNear(keeper.x+10000,keeper.z+10000,1).length,0);
  assert.equal(world.cacheSize(),before);
  assert.equal(world.caveCacheSize(),caves);
 }
});

test('repeated near-actor queries reuse frozen arrays without changing actor ownership',()=>{
 const world=make('actor-proximity-reuse');
 const fox=world.actorById('wildlife:'+world.seed+':fortress-road:0');
 const keeper=world.actorById('npc:'+world.seed+':roadside-lodge:keeper');
 for(const actor of [fox,keeper]){
  const first=world.actorsNear(actor.x,actor.z,0);
  assert.ok(Object.isFrozen(first));
  assert.equal(world.actorsNear(actor.x,actor.z,0),first,'same nearby actors reuse immutable array');
  assert.ok(first.includes(actor));
 }
 const midpointX=(fox.x+keeper.x)/2,midpointZ=(fox.z+keeper.z)/2;
 const radius=Math.max(Math.hypot(midpointX-fox.x,midpointZ-fox.z),Math.hypot(midpointX-keeper.x,midpointZ-keeper.z))+1;
 const both=world.actorsNear(midpointX,midpointZ,radius);
 assert.equal(both.length,2);
 assert.equal(world.actorsNear(midpointX,midpointZ,radius),both);
 assert.equal(world.actorById(fox.id),fox);
 assert.equal(world.actorById(keeper.id),keeper);
});

test('direct fox lookup stays stable and avoids terrain allocation after first resolution',()=>{
 for(const seed of ['fox-lookup-a','fox-lookup-b']){
  const world=make(seed);
  const id='wildlife:'+world.seed+':fortress-road:0';
  const fox=world.actorById(id);
  assert.ok(fox);
  const before=world.cacheSize(),caves=world.caveCacheSize();
  for(let i=0;i<32;i++)assert.strictEqual(world.actorById(id),fox);
  assert.equal(world.cacheSize(),before);
  assert.equal(world.caveCacheSize(),caves);
  const cx=Math.floor(fox.x/world.CHUNK_SIZE),cz=Math.floor(fox.z/world.CHUNK_SIZE);
  assert.strictEqual(world.chunkAt(cx,cz).npc.find(a=>a.id===id),fox);
 }
});
