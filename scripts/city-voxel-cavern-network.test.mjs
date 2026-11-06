import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const root={};
for(const name of ['city-worldgen.js','city-terrain-world.js','city-voxel-world.js','city-voxel-renderer.js','city-voxel-physics.js'])
 vm.runInNewContext(readFileSync(new URL('../'+name,import.meta.url),'utf8'),root,{filename:name});
const families=['evergreen','desert','tundra','wetland','volcanic','alpine','tropical','grassland','salt','crystal','fungal','ruins'];
const biomes=Array.from({length:132},(_,i)=>({
 id:'biome-'+i,name:'Biome '+i,group:families[Math.floor(i/11)],
 material:'soil',hue:(i*19)%360,sat:35,light:42
}));
const make=seed=>root.CityVoxelWorld.createVoxelWorld(root.CityTerrainWorld.createTerrain(seed,biomes));
const plain=v=>JSON.parse(JSON.stringify(v));

function findEntrance(w){
 for(let cz=-2;cz<=2;cz++)for(let cx=-2;cx<=2;cx++)
  for(let z=cz*112+24;z<cz*112+88;z+=3)
   for(let x=cx*112+24;x<cx*112+88;x+=3){
    const m=w.caveMouthAt(x,z);
    if(m?.inside&&w.caveRoomAt(m.x,m.z))return {x:m.x,z:m.z,id:m.id};
   }
 throw Error('No valid starter entrance');
}
function cavernTiles(w,entrance){
 const all=new Map(),x0=Math.floor(entrance.x/112)*112,z0=Math.floor(entrance.z/112)*112;
 for(let z=z0;z<z0+112;z++)for(let x=x0;x<x0+112;x++){
  const room=w.caveRoomAt(x,z);
  if(room)all.set(x+','+z,room);
 }
 return all;
}

test('one generated mouth opens into an approach, two rooms and a connector under the same seed',()=>{
 const w=make('round5-cavern-network-01'),m=findEntrance(w),all=cavernTiles(w,m);
 const types=new Set(Array.from(all.values(),r=>r.kind));
 assert.ok(types.has('gallery'),'preserve legacy entrance gallery');
 assert.ok(types.has('chamber-a'),'first chamber exists');
 assert.ok(types.has('chamber-b'),'second chamber exists');
 assert.ok(types.has('approach')||types.has('connector'),'rooms have a passage');
 assert.ok(all.size>180,'cave complex has considerably more volume than old short gallery');
 assert.ok(Array.from(all.values()).some(r=>!r.exposed&&r.ceiling-r.floor>=15));
 assert.ok(Array.from(all.values()).every(r=>r.id===m.id),'complex cannot leak into another cave seed-cell');
});

test('entrance and both chambers are navigably connected by cardinal tunnel steps',()=>{
 const w=make('round5-cavern-network-01'),m=findEntrance(w),all=cavernTiles(w,m);
 const a=[...all.entries()].find(([,v])=>v.kind==='chamber-a'),b=[...all.entries()].find(([,v])=>v.kind==='chamber-b');
 assert.ok(a&&b,'both destination rooms exist');
 // Search the authored floor cells with a maximum climb of two quarter-blocks.
 const start=m.x+','+m.z,q=[start],seen=new Set([start]);
 for(let qi=0;qi<q.length;qi++){
  const [x,z]=q[qi].split(',').map(Number),r=all.get(q[qi]);if(!r)continue;
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const key=(x+dx)+','+(z+dz),n=all.get(key);
   if(seen.has(key)||!n||Math.abs(n.floor-r.floor)>2)continue;
   seen.add(key);q.push(key);
  }
 }
 assert.ok(seen.has(a[0]),'player can walk from entrance into chamber A');
 assert.ok(seen.has(b[0]),'player can continue through the connector to chamber B');
});

test('different seeds change chamber layouts, same seed restores exact geometry',()=>{
 const a=make('round5-cavern-network-01'),b=make('round5-cavern-network-01');
 const m=findEntrance(a),sample=[[m.x,m.z],[m.x+9,m.z+4],[-30,60],[95,110]];
 for(const [x,z] of sample){
  assert.deepEqual(plain(a.caveRoomAt(x,z)),plain(b.caveRoomAt(x,z)));
  assert.deepEqual(plain(a.surfaceAt(x,z)),plain(b.surfaceAt(x,z)));
 }
 const next=make('round5-cavern-network-02');
 const other=findEntrance(next);
 assert.notEqual(m.id+':'+m.x+':'+m.z,other.id+':'+other.x+':'+other.z);
});

test('underground vertical position survives controller recreation and two-chamber geometry remains finite',()=>{
 const w=make('round5-cavern-network-01'),m=findEntrance(w),all=cavernTiles(w,m);
 const room=[...all.values()].find(v=>v.kind==='chamber-b'&&!v.exposed);
 assert.ok(room);
 const first=root.CityVoxelPhysics.createController(w,{x:room.x+.5,z:room.z+.5,y:room.floor});
 const snapshot=plain(first.snapshot());
 assert.ok(snapshot.y<=room.ceiling-w.PLAYER_HEIGHT+1);
 const reloaded=root.CityVoxelPhysics.createController(w,{x:snapshot.x,z:snapshot.z,y:snapshot.y});
 assert.ok(Math.abs(reloaded.snapshot().y-snapshot.y)<=2);
 const cx=Math.floor(room.x/16),cz=Math.floor(room.z/16);
 const mesh=root.CityVoxelRenderer.generateMesh(w,cx,cz);
 const baseline=root.CityVoxelRenderer.generateMesh({...w,caveRoomAt:()=>null},cx,cz);
 assert.ok(mesh.vertices>baseline.vertices);
 assert.ok(mesh.vertices<650000);
 assert.ok(mesh.data.every(Number.isFinite));
 assert.equal(root.CityVoxelRenderer.MAX_GPU_BYTES,24*1024*1024);
});

test('cave metadata cache stays bounded while sampling across the world',()=>{
 const w=make('cache-caverns');
 for(let cz=-17;cz<=17;cz++)for(let cx=-17;cx<=17;cx++)
  w.caveRoomAt(cx*112+42,cz*112+51);
 assert.ok(w.caveCacheSize()<=256);
 assert.equal(w.chunkAt(0,0).npc.length,0);
 assert.deepEqual(JSON.parse(JSON.stringify(w.chunkAt(0,0).structures)),JSON.parse(JSON.stringify(make('cache-caverns').chunkAt(0,0).structures)),'seeded roadside structures remain stable across independent loads');
});
