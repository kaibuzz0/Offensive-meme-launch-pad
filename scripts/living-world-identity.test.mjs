import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// World-only contract: no renderer, browser, wallet, or extra engine dependency.
const source=readFileSync(new URL('../city-voxel-world.js',import.meta.url),'utf8');
const context={};
runInNewContext(source,context);
const biome=Object.freeze({id:1,name:'Starter Woodland',group:'grassland',hue:110,sat:40,light:50,moisture:.5,temperature:.5});
const atlasFor=seedHash=>({seedHash,biomeAt:()=>biome,spawnAt:()=>({x:0,y:0})});
const worldFor=seed=>context.CityVoxelWorld.createVoxelWorld(atlasFor(seed));
const snapshot=world=>{
 const {x,z}=world.spawnAt(),out=[];
 for(let cz=Math.floor((z-8)/16);cz<=Math.floor((z+55)/16);cz++)
  for(let cx=Math.floor((x-26)/16);cx<=Math.floor((x+26)/16);cx++){
   const chunk=world.chunkAt(cx,cz);
   out.push({cx,cz,structures:Array.from(chunk.structures,p=>[p.id,p.structureId,p.x,p.y,p.z,p.w,p.h,p.d,p.solid]),
    plants:Array.from(chunk.plants,p=>[p.id,p.x,p.y,p.z,p.type])});
  }
 return out;
};
test('fortress road, chunk geometry and foliage regenerate identically after eviction',()=>{
 for(const seed of [1,73,0x12345678]){
  const a=worldFor(seed),b=worldFor(seed);
  assert.deepEqual(snapshot(a),snapshot(b));
  const {x,z}=a.gateRoad.supplies;
  assert.equal(a.chunkAt(Math.floor(x/16),Math.floor(z/16)).structures.some(p=>p.x<=x&&p.x+p.w>x&&p.z<=z&&p.z+p.d>z),true);
  for(let i=0;i<600;i++)a.surfaceAt(500+i,800+i);
  assert.deepEqual(snapshot(a),snapshot(b));
  assert.ok(a.cacheSize()<=4096,'terrain column cache must remain bounded');
  assert.ok(a.caveCacheSize()<=256,'cave cell cache must remain bounded');
 }
});
test('chunk structure fragments are clipped and retain stable source IDs',()=>{
 const world=worldFor(73);
 for(const chunk of snapshot(world)){
  const seen=new Set();
  for(const [id,structureId,x,y,z,w,h,d] of chunk.structures){
   assert.ok(id&&structureId&&Number.isFinite(y)&&h>0);
   assert.ok(w>0&&d>0);
   assert.ok(x>=chunk.cx*16&&x+w<=chunk.cx*16+16);
   assert.ok(z>=chunk.cz*16&&z+d<=chunk.cz*16+16);
   assert.ok(!seen.has(id),'one source structure should have at most one fragment per chunk');
   seen.add(id);
  }
 }
});
