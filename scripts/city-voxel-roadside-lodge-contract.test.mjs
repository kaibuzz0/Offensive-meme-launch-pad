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

test('roadside lodge uses stable chunk-clipped structure geometry and keeps doorway open',()=>{
 for(const seed of ['lodge-a','lodge-b']){
  const a=create(seed),b=create(seed),parts=a.gateRoad.parts;
  const lodge=parts.slice(-9);
  assert.equal(lodge.length,9);
  assert.deepEqual(plain(lodge),plain(b.gateRoad.parts.slice(-9)));
  const floor=lodge[0],east=lodge[1],roof=lodge[7];
  assert.equal(floor.w,9);assert.equal(floor.d,9);
  assert.equal(east.x,floor.x+8);
  assert.ok(roof.y>floor.y+10);
  const doorwayX=floor.x+.5,doorwayZ=floor.z+4.5;
  assert.equal(a.gateRoad.obstructs(doorwayX,floor.y+1,doorwayZ,7,.2),false,
   'doorway must admit a standing player');
  assert.equal(a.gateRoad.obstructs(floor.x+8.5,floor.y+1,doorwayZ,7,.2),true,
   'solid exterior wall must block passage');
  for(const p of lodge){
   const cx=Math.floor(p.x/a.CHUNK_SIZE),cz=Math.floor(p.z/a.CHUNK_SIZE);
   assert.ok(a.gateParts(cx,cz).some(q=>q.y===p.y&&q.color[0]===p.color[0]));
  }
 }
});
