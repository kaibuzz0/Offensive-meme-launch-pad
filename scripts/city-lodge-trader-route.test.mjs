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
const world=seed=>ctx.CityVoxelWorld.createVoxelWorld(ctx.CityTerrainWorld.createTerrain(seed,catalog));

test('lodge trader uses stable ID, shared chunk descriptor, and clear terrain near entrance',()=>{
 let validSpawns=0;
 for(const seed of ['fortress-road','fortress-highlands','fortress-snow','fortress-water']){
  const w=world(seed),lodge=w.gateRoad.lodge;
  const trader=w.actorById('starter-trader:'+seed);
  if(!trader)continue; // Unsafe seeds intentionally omit actors rather than clipping.
  validSpawns++;
  assert.equal(trader.kind,'trader');
  assert.ok(Math.hypot(trader.x-(lodge.doorX-3),trader.z-lodge.doorZ)<=Math.SQRT2*8,
   'trader must remain within bounded lodge-entrance search radius');
  assert.strictEqual(w.chunkAt(Math.floor(trader.x/w.CHUNK_SIZE),Math.floor(trader.z/w.CHUNK_SIZE))
   .npc.find(actor=>actor.id===trader.id),trader,'chunk streaming must reuse actor identity');
  assert.equal(w.gateRoad.obstructs(trader.x+.5,trader.y,trader.z+.5,w.PLAYER_HEIGHT,.35),false);
  assert.strictEqual(world(seed).actorById(trader.id)?.id,trader.id);
 }
 assert.ok(validSpawns>0,'at least one representative seed must expose the playable lodge trader');
});

test('starter actors remain bounded and uniquely owned across repeated chunk streams',()=>{
 for(const seed of ['fortress-road','fortress-highlands','fortress-snow','fortress-water']){
  const w=world(seed);
  const actors=['starter-trader:'+seed,'starter-wildlife:'+seed]
   .map(id=>w.actorById(id)).filter(Boolean);
  assert.ok(actors.length<=2);
  assert.equal(new Set(actors.map(actor=>actor.id)).size,actors.length);
  assert.equal(w.actorById('retired-or-unknown:'+seed),null);
  for(const actor of actors){
   const cx=Math.floor(actor.x/w.CHUNK_SIZE),cz=Math.floor(actor.z/w.CHUNK_SIZE);
   const owner=w.chunkAt(cx,cz);
   assert.equal(owner.npc.filter(a=>a.id===actor.id).length,1);
   assert.strictEqual(w.chunkAt(cx,cz).npc.find(a=>a.id===actor.id),actor);
   for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){
    assert.equal(w.chunkAt(cx+dx,cz+dz).npc.some(a=>a.id===actor.id),false,
     'adjacent chunks must not duplicate persistent actors');
   }
  }
 }
});

test('spatial activation uses the same immutable actors without loading chunks',()=>{
 for(const seed of ['fortress-road','fortress-highlands','fortress-snow','fortress-water']){
  const w=world(seed);
  const actors=['starter-trader:'+seed,'starter-wildlife:'+seed]
   .map(id=>w.actorById(id)).filter(Boolean);
  const initialCache=w.cacheSize(),initialCaves=w.caveCacheSize();
  assert.equal(w.actorsNear(NaN,0,10).length,0);
  assert.equal(w.actorsNear(0,Infinity,10).length,0);
  assert.equal(w.actorsNear(0,0,-1).length,0);
  for(const actor of actors){
   const near=w.actorsNear(actor.x,actor.z,0);
   assert.ok(near.some(candidate=>candidate===actor),
    'zero-radius query must return the canonical actor at its exact position');
   const outside=w.actorsNear(actor.x+2,actor.z,1);
   assert.ok(!outside.some(candidate=>candidate.id===actor.id),
    'spatial query must reject actors beyond its radius');
   assert.strictEqual(w.actorById(actor.id),actor);
  }
  assert.equal(w.cacheSize(),initialCache,
   'actor activation must not generate terrain chunks');
  assert.equal(w.caveCacheSize(),initialCaves,
   'actor activation must not populate cave caches');
 }
});

// Regression: active actor queries must not multiply streamed populations as
// the player repeatedly crosses a chunk boundary or changes view distance.
test('repeated actor proximity queries preserve canonical identities and cache budgets',()=>{
 for(const seed of ['fortress-road','fortress-highlands','fortress-snow','fortress-water']){
  const w=world(seed);
  const actors=['starter-trader:'+seed,'starter-wildlife:'+seed]
   .map(id=>w.actorById(id)).filter(Boolean);
  const terrainBefore=w.cacheSize(),cavesBefore=w.caveCacheSize();
  for(const actor of actors){
   const first=w.actorsNear(actor.x,actor.z,24);
   for(let i=0;i<12;i++){
    const again=w.actorsNear(actor.x,actor.z,24);
    assert.equal(again.length,first.length,'repeated activation must not append duplicate actors');
    assert.equal(new Set(again.map(item=>item.id)).size,again.length);
    assert.strictEqual(again.find(item=>item.id===actor.id),actor,
     'proximity query must retain the shared immutable actor descriptor');
   }
  }
  assert.equal(w.cacheSize(),terrainBefore,'actor proximity must not allocate terrain chunks');
  assert.equal(w.caveCacheSize(),cavesBefore,'actor proximity must not allocate caves');
 }
});
