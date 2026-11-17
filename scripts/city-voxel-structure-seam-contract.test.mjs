import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const context={};
for(const file of ['city-worldgen.js','city-terrain-world.js','city-voxel-world.js'])
 vm.runInNewContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),context,{filename:file});
const catalog=Array.from({length:132},(_,i)=>({
 id:'terrain-'+i,name:'Biome '+i,
 group:['evergreen','desert','tundra','wetland','volcanic','alpine','tropical','grassland','salt','crystal','fungal','ruins'][Math.floor(i/11)],
 material:'topsoil',hue:(i*19)%360,sat:30+(i%6)*6,light:40
}));
const create=seed=>context.CityVoxelWorld.createVoxelWorld(context.CityTerrainWorld.createTerrain(seed,catalog));
const plain=x=>JSON.parse(JSON.stringify(x));

test('fortress structures preserve geometry identity across chunk seams and regeneration',()=>{
 for(const seed of ['structure-seam-a','structure-seam-b']){
  const world=create(seed),other=create(seed),size=world.CHUNK_SIZE;
  const parts=world.gateRoad.parts;
  const all=new Map();
  for(let i=0;i<parts.length;i++){
   const p=parts[i];
   const minCX=Math.floor(p.x/size),maxCX=Math.ceil((p.x+p.w)/size)-1;
   const minCZ=Math.floor(p.z/size),maxCZ=Math.ceil((p.z+p.d)/size)-1;
   let area=0;
   for(let cz=minCZ;cz<=maxCZ;cz++)for(let cx=minCX;cx<=maxCX;cx++){
    const fragments=world.gateParts(cx,cz).filter(f=>f.id==='starter-gate:'+world.seed+':'+i);
    assert.equal(fragments.length,1,'each intersected chunk owns one fragment');
    const f=fragments[0];
    assert.equal(f.structureId,'starter-fortress:'+world.seed);
    assert.ok(f.w>0&&f.d>0);
    assert.ok(f.x>=cx*size&&f.x+f.w<=(cx+1)*size);
    assert.ok(f.z>=cz*size&&f.z+f.d<=(cz+1)*size);
    assert.equal(f.y,p.y);assert.equal(f.h,p.h);
    area+=f.w*f.d;
    assert.deepEqual(plain(f),plain(other.gateParts(cx,cz).find(q=>q.id===f.id)));
    const key=cx+','+cz+':'+f.id;
    assert.ok(!all.has(key));all.set(key,true);
   }
   assert.ok(Math.abs(area-p.w*p.d)<1e-7,'chunk fragments must cover original footprint exactly');
  }
 }
});

test('non-owning structure chunk queries do not grow terrain or cave caches',()=>{
 const world=create('structure-query-budget');
 const before=world.cacheSize(),caves=world.caveCacheSize();
 for(let i=0;i<100;i++){
  assert.equal(world.gateParts(100+i,100).length,0);
  assert.equal(world.gateParts(-100-i,-100).length,0);
 }
 assert.equal(world.cacheSize(),before);
 assert.equal(world.caveCacheSize(),caves);
});
