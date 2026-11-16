import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const context={};
for(const file of ['city-worldgen.js','city-terrain-world.js','city-voxel-world.js'])
 vm.runInNewContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),context,{filename:file});
const catalog=Array.from({length:132},(_,i)=>({
 id:'terrain-'+i,name:'Biome '+i,group:'evergreen',material:'topsoil',hue:110,sat:40,light:40
}));
const create=seed=>context.CityVoxelWorld.createVoxelWorld(context.CityTerrainWorld.createTerrain(seed,catalog));
const plain=x=>JSON.parse(JSON.stringify(x));

test('roadside keeper is deterministic, unique, terrain-fitted and chunk-owned',()=>{
 for(const seed of ['keeper-a','keeper-b']){
  const a=create(seed),b=create(seed);
  const id='npc:'+a.seed+':roadside-lodge:keeper';
  const actor=a.actorById(id);
  assert.ok(actor);
  assert.equal(actor.role,'supply-keeper');
  assert.deepEqual(plain(actor),plain(b.actorById(id)));
  const cx=Math.floor(actor.x/a.CHUNK_SIZE),cz=Math.floor(actor.z/a.CHUNK_SIZE);
  assert.equal(a.chunkAt(cx,cz).npc.filter(n=>n.id===id).length,1);
  assert.equal(b.chunkAt(cx,cz).npc.filter(n=>n.id===id).length,1);
  // Repeated streaming of the same owning chunk reuses frozen actor arrays.
  // Tile snapshots may regenerate; actor identity and population must not.
  const firstActors=a.chunkAt(cx,cz).npc;
  const nextActors=a.chunkAt(cx,cz).npc;
  assert.strictEqual(firstActors,nextActors);
  assert.ok(Object.isFrozen(firstActors));
  assert.strictEqual(firstActors.find(n=>n.id===id),actor);
  assert.equal(a.actorsNear(actor.x,actor.z,1).filter(n=>n.id===id).length,1);
  assert.ok(actor.y>=a.surfaceAt(actor.x,actor.z).height+1);
  const floor=a.gateRoad.lodgeFloor;
  assert.ok(floor,'lodge floor must be explicit metadata, not a positional parts-array dependency');
  assert.deepEqual(plain(floor),plain(b.gateRoad.lodgeFloor));
  assert.ok(actor.x>=floor.x&&actor.x<floor.x+floor.w&&actor.z>=floor.z&&actor.z<floor.z+floor.d,
   'keeper must remain on the canonical lodge floor even if decorative parts are reordered');
  const before=a.cacheSize();
  assert.equal(a.actorsNear(actor.x+1000,actor.z+1000,1).length,0);
  assert.equal(a.cacheSize(),before);
 }
});

test('keeper and wildlife queries reject invalid ranges without allocating terrain',()=>{
 const world=create('keeper-invalid-range');
 const before=world.cacheSize();
 const bad=[
  [NaN,0,1],[0,Infinity,1],[0,0,NaN],[0,0,-1],
  [Infinity,0,1],[0,0,-Infinity]
 ];
 const empty=world.actorsNear(0,0,-1);
 for(const args of bad){
  assert.strictEqual(world.actorsNear(...args),empty,
   'invalid proximity queries must reuse the immutable empty population');
 }
 assert.ok(Object.isFrozen(empty));
 assert.equal(world.actorById(null),null);
 assert.equal(world.actorById('npc:other-seed:roadside-lodge:keeper'),null);
 assert.equal(world.cacheSize(),before,
  'invalid actor queries must not sample or cache terrain');
});

test('actor proximity preserves inclusive boundary and extreme-coordinate behavior',()=>{
 const world=create('keeper-distance-boundaries');
 const keeper=world.actorById('npc:'+world.seed+':roadside-lodge:keeper');
 assert.ok(keeper);
 assert.ok(world.actorsNear(keeper.x+3,keeper.z,3).some(actor=>actor.id===keeper.id));
 assert.ok(!world.actorsNear(keeper.x+3.01,keeper.z,3).some(actor=>actor.id===keeper.id));
 assert.ok(!world.actorsNear(1e308,1e308,1e308).some(actor=>actor.id===keeper.id),
  'overflowing squared distances must not make a distant actor appear nearby');
});
