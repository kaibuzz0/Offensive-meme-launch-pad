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
