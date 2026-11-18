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

test('immutable streamed chunks are reused with bounded LRU eviction',()=>{
 const world=make('chunk-lru-regression');
 const fox=world.actorById('wildlife:'+world.seed+':fortress-road:0');
 const cx=Math.floor(fox.x/world.CHUNK_SIZE),cz=Math.floor(fox.z/world.CHUNK_SIZE);
 const original=world.chunkAt(cx,cz);
 assert.ok(Object.isFrozen(original));
 assert.strictEqual(world.chunkAt(cx,cz),original,'revisit should reuse base snapshot');
 assert.equal(world.chunkCacheSize(),1);
 for(let i=1;i<=11;i++)world.chunkAt(cx+i,cz);
 assert.equal(world.chunkCacheSize(),12);
 world.chunkAt(cx,cz); // refresh original before eviction
 world.chunkAt(cx+12,cz);
 assert.strictEqual(world.chunkAt(cx,cz),original,'recently used chunk survives eviction');
 assert.equal(world.chunkCacheSize(),12);
 for(let i=13;i<=27;i++)world.chunkAt(cx+i,cz);
 assert.ok(world.chunkCacheSize()<=12);
 const replay=world.chunkAt(cx,cz);
 assert.notStrictEqual(replay,original,'evicted chunk is regenerated');
 assert.deepEqual(plain(replay),plain(original),'eviction must not alter seeded world content');
 assert.strictEqual(replay.npc.find(a=>a.id===fox.id),fox,'actor identity survives chunk eviction');
 assert.ok(world.cacheSize()<=22528);
});

test('invalid chunks never allocate snapshot cache entries',()=>{
 const world=make('chunk-lru-invalid');
 const before=world.chunkCacheSize();
 for(const coords of [[NaN,0],[0,Infinity],[62500,0],[-62501,0],[0,62500],[0,-62501]])
  assert.equal(world.chunkAt(...coords),null);
 assert.equal(world.chunkCacheSize(),before);
});
