import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const ctx={};
for(const file of ['city-worldgen.js','city-terrain-world.js','city-voxel-world.js'])
 vm.runInNewContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx,{filename:file});
const catalog=Array.from({length:132},(_,i)=>({
 id:'terrain-'+i,name:'Biome '+i,group:['evergreen','desert','tundra','wetland','volcanic','alpine','tropical','grassland','salt','crystal','fungal','ruins'][Math.floor(i/11)],
 material:'topsoil',hue:(i*19)%360,sat:30+(i%6)*6,light:40
}));
const create=seed=>ctx.CityVoxelWorld.createVoxelWorld(ctx.CityTerrainWorld.createTerrain(seed,catalog));
const plain=value=>JSON.parse(JSON.stringify(value));

test('roadside wildlife has one seed-stable owning chunk and consistent spatial lookup',()=>{
 const world=create('fox-contract-01');
 const x=world.gateRoad.x+3,z=world.gateRoad.z+22;
 const cx=Math.floor(x/world.CHUNK_SIZE),cz=Math.floor(z/world.CHUNK_SIZE);
 const owner=world.chunkAt(cx,cz);
 assert.equal(owner.npc.filter(a=>a.kind==='wildlife').length,1);
 const fox=owner.npc[0];
 assert.equal(fox.kind,'wildlife');
 assert.equal(fox.species,'fox');
 assert.equal(fox.x,x);assert.equal(fox.z,z);
 assert.equal(fox.y,world.surfaceAt(x,z).height+1);
 assert.equal(world.actorById(fox.id),fox);
 assert.equal(world.actorsNear(x,z,1)[0],fox);
 assert.equal(world.actorsNear(x+100,z+100,1).length,0);
 assert.equal(world.actorsNear(NaN,z,20).length,0);
 assert.equal(world.actorsNear(x,z,-1).length,0);
 assert.equal(world.chunkAt(cx+1,cz).npc.filter(a=>a.kind==='wildlife').length,0);
 assert.equal(world.chunkAt(cx,cz+1).npc.filter(a=>a.kind==='wildlife').length,0);
 assert.equal(world.chunkAt(cx,cz).npc[0],fox,'chunk regeneration must reuse the descriptor');
 assert.deepEqual(plain(create('fox-contract-01').actorById(fox.id)),plain(fox));
 assert.equal(create('fox-contract-02').actorById(fox.id),null,'another seed must not resolve this actor');
});

test('wildlife descriptor cannot be mutated through chunk snapshots or actor queries',()=>{
 const world=create('fox-contract-02');
 const fox=world.actorsNear(world.gateRoad.x+3,world.gateRoad.z+22,2)[0];
 assert.ok(fox);
 assert.ok(Object.isFrozen(fox));
 assert.equal(Object.isFrozen(world.actorsNear(fox.x,fox.z,1)),true);
 assert.equal(world.actorById('missing'),null);
 assert.equal(world.actorById(null),null);
});

test('actor lookups do not generate terrain chunks or grow terrain caches',()=>{
 const world=create('fox-cache-budget');
 // The first actor materialization samples its home terrain once. Measure
 // subsequent lookups against the warmed cache, not the cold world baseline.
 const cold=world.cacheSize();
 const caveInitial=world.caveCacheSize();
 const fox=world.actorsNear(world.gateRoad.x+3,world.gateRoad.z+22,0)[0];
 assert.ok(fox,'exact-position query resolves the seeded fox');
 const initial=world.cacheSize();
 assert.ok(initial-cold<=1,'first actor resolution samples at most its home column');
 for(let i=0;i<200;i++){
  assert.equal(world.actorById(fox.id),fox);
  assert.equal(world.actorsNear(fox.x+1000+i,fox.z,1).length,0);
  assert.equal(world.actorsNear(fox.x,fox.z,0)[0],fox);
 }
 assert.equal(world.cacheSize(),initial,'actor queries must not materialize terrain tiles');
 assert.equal(world.caveCacheSize(),caveInitial,'actor queries must not materialize caves');
 assert.equal(world.chunkAt(62501,0),null,'out-of-bounds chunk rejected');
 assert.equal(world.chunkAt(0,NaN),null,'noninteger chunk rejected');
 assert.equal(world.actorById({id:fox.id}),null,'untrusted object ID rejected');
});
