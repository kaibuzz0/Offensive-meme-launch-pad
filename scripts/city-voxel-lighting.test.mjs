import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const context={};
for(const name of ['city-voxel-renderer.js'])
 vm.runInNewContext(readFileSync(new URL('../'+name,import.meta.url),'utf8'),context,{filename:name});
const {surfaceLight,terrainCastShade,waterColor,generateMesh}=context.CityVoxelRenderer;
const plain=value=>JSON.parse(JSON.stringify(value));

test('terrain contact shadows respond to neighboring cliffs without any additional voxel sampling',()=>{
 const tile={height:100},flat=Array.from({length:4},()=>({height:100}));
 const shaded=[{height:108},{height:119},{height:111},{height:114}];
 assert.equal(surfaceLight(tile,flat),1);
 assert.ok(surfaceLight(tile,shaded)<.6,'raised neighboring cliffs visibly shade the valley');
 assert.ok(surfaceLight(tile,shaded)>=.30,'ambient shading has a legible minimum');
 assert.ok(surfaceLight(tile,[null,null,null,null])<=1);
 assert.deepEqual(surfaceLight(tile,shaded),surfaceLight(tile,shaded));
});

test('ridges cast deterministic heightfield shadows into adjacent valleys',()=>{
 const flat={surfaceAt:()=>({height:100})};
 const highRidge={surfaceAt:(x)=>({height:x>=2&&x<=9?170:100})};
 assert.equal(terrainCastShade(flat,0,0,100),1);
 assert.ok(terrainCastShade(highRidge,0,0,100)<.80,'distant ridges darken an unobstructed valley');
 assert.ok(terrainCastShade(highRidge,0,0,100)>=.58,'shadows keep a legible ambient floor');
 assert.equal(terrainCastShade(highRidge,0,0,100),terrainCastShade(highRidge,0,0,100));
 assert.equal(terrainCastShade({surfaceAt:()=>null},0,0,90),1);
});

test('water tint transitions from pale shallows to deep blue independently of biome palettes',()=>{
 const shallow=plain(waterColor(0)),deep=plain(waterColor(80));
 assert.equal(shallow.length,3);
 assert.ok(shallow.every(Number.isFinite));
 assert.ok(deep.every(Number.isFinite));
 assert.ok(shallow[1]>deep[1]&&shallow[2]>deep[2]);
 assert.ok(shallow[0]>deep[0]);
 assert.deepEqual(plain(waterColor(-12)),shallow);
 assert.deepEqual(plain(waterColor(200)),deep);
});

function syntheticWorld(){
 function column(x,z){
  const height=x<8?104:83;
  return Object.freeze({
   x,z,height,water:true,slope:0,material:'shore',group:'wetland',
   hue:104,sat:35,light:35
  });
 }
 return {
  SEA_LEVEL:112,
  surfaceAt:column,
  chunkAt(cx,cz){
   const tiles=[];
   for(let z=cz*16;z<(cz+1)*16;z++)
    for(let x=cx*16;x<(cx+1)*16;x++)tiles.push(column(x,z));
   return {tiles,plants:[]};
  },
  caveRoomAt:()=>null
 };
}

test('voxel mesh tags water explicitly instead of identifying it by a guessed RGB threshold',()=>{
 const world=syntheticWorld(),mesh=generateMesh(world,0,0);
 const waterVerts=[];
 for(let i=0;i<mesh.data.length;i+=9){
  const nY=mesh.data[i+7];
  if(nY===-2)waterVerts.push(mesh.data.slice(i+3,i+6));
 }
 assert.ok(waterVerts.length>=256*6,'all surface tiles produce identified water geometry');
 assert.ok(waterVerts.every(c=>Array.from(c).every(Number.isFinite)));
 const seen=new Set(waterVerts.map(c=>Array.from(c,x=>x.toFixed(4)).join(',')));
 assert.ok(seen.size>=2,'water color reflects the depth below the sea surface');
 assert.equal(mesh.data.length,mesh.vertices*9);
 assert.ok(mesh.vertices<500000,'terrain remains bounded for mobile GPU upload');
 assert.ok(mesh.data.every(Number.isFinite));
});

test('distant meshes retain water geometry with 4x spatial detail reduction',()=>{
 const w=syntheticWorld(),near=generateMesh(w,0,0,1),far=generateMesh(w,0,0,4);
 assert.equal(near.tiles,256);assert.equal(far.tiles,16);
 assert.ok(far.vertices<near.vertices);
 assert.ok(Array.from(far.data).some((v,i)=>i%9===7&&v===-2));
 assert.equal(context.CityVoxelRenderer.MAX_GPU_BYTES,24*1024*1024);
});
