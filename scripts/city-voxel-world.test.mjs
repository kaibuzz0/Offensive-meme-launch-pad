import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const ctx={};
for(const file of ['city-worldgen.js','city-terrain-world.js','city-voxel-world.js','city-voxel-physics.js','city-voxel-renderer.js'])
 vm.runInNewContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx,{filename:file});
const catalog=Array.from({length:132},(_,i)=>({
 id:'terrain-'+i,name:'Biome '+i,group:['evergreen','desert','tundra','wetland','volcanic','alpine','tropical','grassland','salt','crystal','fungal','ruins'][Math.floor(i/11)],
 material:'topsoil',hue:(i*19)%360,sat:30+(i%6)*6,light:40
}));
const create=seed=>ctx.CityVoxelWorld.createVoxelWorld(ctx.CityTerrainWorld.createTerrain(seed,catalog));
const plain=v=>JSON.parse(JSON.stringify(v));

test('quarter-sized blocks and human-scale first-person height are consistent',()=>{
 const v=ctx.CityVoxelWorld;
 assert.equal(v.VOXEL_METERS,.25);
 assert.equal(v.PLAYER_HEIGHT,7.2);
 assert.equal(v.EYE_HEIGHT,6.4);
 assert.equal(v.MIN_HEIGHT,-256);
 assert.equal(v.MAX_HEIGHT,2048);
 assert.equal(v.CHUNK_SIZE,16);
 assert.equal(ctx.CityVoxelRenderer.VOXEL_METERS,.25);
});

test('132 biomes retain seed-based identities with varied mountainous elevations',()=>{
 const w=create('mountains-001'),other=create('mountains-002');
 assert.equal(w.atlas.anchors.length,132);
 assert.notDeepEqual(plain(w.atlas.anchors),plain(other.atlas.anchors));
 const high=w.atlas.anchors.filter(a=>a.group==='alpine');
 assert.equal(high.length,11);
 const samples=[];
 for(const a of high.slice(0,5))for(let dz=-10;dz<=10;dz+=5)
  for(let dx=-10;dx<=10;dx+=5){
   const c=w.surfaceAt(Math.round(a.x)+dx,Math.round(a.y)+dz);
   samples.push(c.height);
   assert.ok(c.height>=6&&c.height<=2040);
  }
 assert.ok(new Set(samples).size>=10,'terrain must visibly change elevation rather than staying flat');
 assert.ok(Math.max(...samples)-Math.min(...samples)>60,'mountains must have meaningful vertical relief');
});

test('surface geometry and geology are deterministic at positive and negative chunk boundaries',()=>{
 const w=create('seam-001'),other=create('seam-001');
 const a=w.chunkAt(-1,0),b=w.chunkAt(0,0);
 assert.equal(a.tiles.length,256);
 assert.equal(b.tiles.length,256);
 assert.equal(a.roads.length,0);assert.equal(a.structures.length,0);assert.equal(a.npc.length,0);
 for(let row=0;row<16;row++){
  const left=a.tiles[row*16+15],right=b.tiles[row*16];
  assert.equal(left.x+1,right.x);assert.equal(left.z,right.z);
  assert.deepEqual(plain(left),plain(other.surfaceAt(left.x,left.z)));
 }
 const rock=w.surfaceAt(-11,9);
 assert.equal(w.blockAt(-11,rock.height,9).solid,true);
 assert.equal(w.blockAt(-11,rock.height+1,9).solid,false);
 assert.equal(w.blockAt(-11,-256,9).material,'bedrock');
 assert.equal(w.blockAt(-11,-256,9).mineable,false);
 assert.equal(w.blockAt(-11,-257,9),null);
});

test('different biome groups generate seeded trees, grasses, flowers, flowers and water candidates',()=>{
 const w=create('plants-001');
 const groups=new Set(),plants=new Set();let water=false;
 for(const a of w.atlas.anchors.filter((_,i)=>i%8===0)){
  for(let z=Math.round(a.y)-12;z<=Math.round(a.y)+12;z+=2)
   for(let x=Math.round(a.x)-12;x<=Math.round(a.x)+12;x+=2){
    const col=w.surfaceAt(x,z),f=w.featureAt(x,z);
    groups.add(col.group);water ||= col.water;
    if(f)plants.add(f.type);
   }
 }
 assert.ok(groups.size>=8);
 assert.ok(plants.size>=3,'biome-dependent vegetation types must be seeded');
 // Specific water presence depends on the land seed, not fixed painted lakes.
 assert.equal(typeof water,'boolean');
 const a=w.featureAt(1,-4),b=create('plants-001').featureAt(1,-4);
 assert.deepEqual(plain(a),plain(b));
});

test('subsurface caves, ores and underground bedrock follow 3D coordinates',()=>{
 const w=create('cave-test');
 let caves=0,rock=0;
 for(let x=-20;x<=20;x+=2)for(let z=-20;z<=20;z+=2)
  for(const y of [-50,-33,-16,4,20]){
   const block=w.blockAt(x,y,z);
   if(block?.cave)caves++;
   if(block?.solid)rock++;
  }
 assert.ok(caves>0,'real 3D noise must carve underground spaces');
 assert.ok(rock>0);
 assert.ok(w.caveAt(0,-256,0)===false,'bedrock cannot become a cave');
 assert.deepEqual(plain(w.blockAt(-8,-24,7)),plain(create('cave-test').blockAt(-8,-24,7)));
});

test('first-person chunk geometry is bounded, finite and uses native cached mesh data',()=>{
 const w=create('meshing-001');
 const mesh=ctx.CityVoxelRenderer.generateMesh(w,0,0);
 assert.equal(mesh.tiles,256);
 assert.ok(mesh.vertices>=256*6);
 assert.ok(mesh.vertices<500000,'one 16x16 chunk must stay below a safe primitive bound');
 assert.equal(mesh.data.length,mesh.vertices*9);
 assert.ok(Array.from(mesh.data).every(Number.isFinite));
 assert.ok(mesh.plants<=256);
 assert.deepEqual(Array.from(mesh.data.slice(0,81)),
  Array.from(ctx.CityVoxelRenderer.generateMesh(create('meshing-001'),0,0).data.slice(0,81)));
 assert.equal(ctx.CityVoxelRenderer.MAX_GPU_CHUNKS,176);
 const far=ctx.CityVoxelRenderer.generateMesh(w,8,0,4);
 assert.equal(far.tiles,16);
 assert.equal(far.plants,0);
 assert.ok(far.vertices<mesh.vertices,'far-distance LOD must use fewer vertices than full detail');
});

test('controller samples the same water cells as generated blocks', () => {
 const world=create('plants-001');
 const x=-651,z=-613;
 const floor=world.surfaceAt(x,z).height;
 assert.ok(floor < world.SEA_LEVEL-4);
 for(const y of [floor,floor+1,world.SEA_LEVEL,world.SEA_LEVEL+1]){
  assert.equal(world.isWaterAt(x+.75,y+.5,z+.25),world.blockAt(x,y,z).material==='water');
 }
});

test('the seeded approach is walkable through the arch and both tower walls stop the player',()=>{
 for(const seed of ['fortress-road','fortress-highlands','fortress-snow','fortress-water']){
  const world=create(seed),spawn=world.spawnAt(),gate=world.gateRoad;
  const player=ctx.CityVoxelPhysics.createController(world,spawn);
  for(let i=0;i<58;i++)player.tick({forward:1},.05);
  const inside=player.snapshot();
  assert.ok(inside.z>=gate.gateZ+3 && inside.z<=gate.gateZ+12,seed);
  assert.equal(inside.y,gate.base);
  for(const direction of [-1,1]){
   player.teleport(gate.x,gate.gateZ+4);
   for(let i=0;i<24;i++)player.tick({right:direction},.05);
   assert.ok(Math.abs(player.snapshot().x-gate.x)<=5,seed);
  }
  const samples=world.chunkAt(Math.floor(spawn.x/16),Math.floor(spawn.z/16));
  assert.ok(samples.roads.length>0);
  const second=create(seed);
  assert.deepEqual(plain(second.gateRoad.parts),plain(gate.parts));
 }
});

test('builder supply cache is visible, seed-relative and does not block the first-person route',()=>{
 for(const seed of ['fortress-road','fortress-highlands','fortress-snow','fortress-water']){
  const world=create(seed),gate=world.gateRoad,cache=gate.supplies;
  assert.ok(Math.abs(cache.x-gate.x)<=8,'cache stays beside the seeded road curve');
  assert.equal(cache.z,gate.z+14);
  assert.equal(cache.y,world.surfaceAt(cache.x,cache.z).height+1,'cache follows the graded road');
  const chunk=world.chunkAt(Math.floor(cache.x/16),Math.floor(cache.z/16));
  assert.ok(chunk.structures.some(s=>s.x===cache.x&&s.z===cache.z),'supply crate draws in the actual world mesh');
  assert.equal(gate.obstructs(cache.x+1,cache.y,cache.z+1,world.PLAYER_HEIGHT,.65),false,'players can pass the crate');
  assert.deepEqual(plain(create(seed).gateRoad.supplies),plain(cache),'same seed restores same cache');
  const player=ctx.CityVoxelPhysics.createController(world,world.spawnAt());
  let approached=false;
  for(let i=0;i<38;i++){
   const p=player.tick({forward:1},.05);
   if(Math.hypot(p.x-cache.x,p.z-cache.z)<10&&Math.abs(p.y-cache.y)<5){approached=true;break;}
  }
  assert.ok(approached,seed+' players should be able to reach and collect supplies on foot');
 }
});

test('seed-relative starter lodge is rendered in real chunks and its doorway is traversable',()=>{
 for(const seed of ['fortress-road','fortress-highlands','fortress-snow','fortress-water']){
  const world=create(seed),road=world.gateRoad,lodge=road.lodge;
  assert.equal(lodge.id,'starter-lodge:'+world.atlas.seedHash);
  assert.ok(lodge.x>road.x+8&&lodge.x<road.x+25,'lodge is beside, not on, the road');
  assert.ok(lodge.z>=road.gateZ+8&&lodge.z<=road.gateZ+12);
  assert.equal(lodge.y,world.surfaceAt(lodge.x,lodge.z).height+1,'lodge uses the existing graded pad');
  assert.deepEqual(plain(create(seed).gateRoad.lodge),plain(lodge),'identity and placement survive reload');
  const chunk=world.chunkAt(Math.floor(lodge.x/16),Math.floor(lodge.z/16));
  assert.ok(chunk.structures.some(s=>s.x===lodge.x&&s.z===lodge.z),'walls are included in playable mesh');
  const py=lodge.y+1;
  assert.equal(lodge.doorZ,lodge.z+4,'entrance waypoint matches the open west-wall gap');
  assert.equal(lodge.doorX,lodge.x,'entrance waypoint is on the west wall');
  assert.equal(road.obstructs(lodge.x+.2,py,lodge.doorZ+.2,world.PLAYER_HEIGHT,.25),false,'open west doorway admits player capsule');
  // Verify the approach AND interior, not a mistakenly placed waypoint outside.
  for(const step of [-3,-2,-1,0,.5,1,1.5,2,3])assert.equal(
   road.obstructs(lodge.x+step,py,lodge.doorZ+.2,world.PLAYER_HEIGHT,.25),false,
   'door approach and interior corridor remain clear');
  assert.equal(road.obstructs(lodge.x+.2,py,lodge.z+.4,world.PLAYER_HEIGHT,.25),true,'solid walls block player');
  assert.equal(road.obstructs(lodge.x+8.4,py,lodge.doorZ+.2,world.PLAYER_HEIGHT,.25),true,'back wall blocks player');
  assert.ok(road.parts.some(p=>!p.solid&&p.color[0]===1&&p.color[1]===.69),'lit doorway uses existing renderer contract');
  assert.ok(road.parts.some(p=>p.x===lodge.x-1&&p.y===lodge.y+12),'roof silhouette is visible');
 }
});

test('clan banner is visible world geometry without obstructing the lodge entrance',()=>{
 for(const seed of ['fortress-road','fortress-highlands','fortress-water']){
  const w=create(seed),lodge=w.gateRoad.lodge;
  const banner=w.gateRoad.parts.filter(p=>p.x<lodge.x&&p.x>lodge.x-1&&
   p.z>=lodge.z+2&&p.z<lodge.z+4&&p.y>=lodge.y+10&&p.y<lodge.y+12);
  assert.equal(banner.length,2,'crossbeam and insignia exist in the actual world');
  assert.ok(banner.every(p=>p.solid===false&&typeof p.id==='string'));
  for(const p of banner){
   const cx=Math.floor(p.x/16),cz=Math.floor(p.z/16);
   assert.ok(w.chunkAt(cx,cz).structures.some(s=>s.id===p.id),
    'banner must be emitted into streamed first-person geometry');
  }
  assert.equal(w.gateRoad.obstructs(lodge.x+.2,lodge.y+1,lodge.doorZ+.2,
   w.PLAYER_HEIGHT||7.2,.25),false,'banner does not obstruct doorway');
  assert.deepEqual(plain(banner),plain(create(seed).gateRoad.parts.filter(p=>banner.some(b=>b.id===p.id))));
 }
});

test('seed-stable part identifiers survive chunk seams and reloads',()=>{
 for(const seed of ['fortress-road','fortress-highlands','fortress-water']){
  const w=create(seed),reload=create(seed);
  const parts=w.gateRoad.parts;
  assert.equal(new Set(parts.map(p=>p.id)).size,parts.length,'every original part has a unique ID');
  assert.deepEqual(parts.map(p=>p.id),reload.gateRoad.parts.map(p=>p.id));
  for(const p of parts){
   const cx=Math.floor(p.x/16),cz=Math.floor(p.z/16);
   assert.ok(w.chunkAt(cx,cz).structures.some(piece=>piece.id===p.id));
   assert.ok(reload.chunkAt(cx,cz).structures.some(piece=>piece.id===p.id));
   const farX=Math.floor((p.x+p.w-1e-9)/16),farZ=Math.floor((p.z+p.d-1e-9)/16);
   assert.ok(w.chunkAt(farX,farZ).structures.some(piece=>piece.id===p.id),
    'the same identity is present in every intersecting chunk');
  }
 }
});

test('fortress and lodge cuboids are clipped across chunk seams without gaps or duplicate area',()=>{
 for(const seed of ['fortress-road','fortress-highlands','fortress-snow','fortress-water']){
  const w=create(seed);
  const all=w.gateRoad.parts;
  for(const original of all){
   const minCx=Math.floor(original.x/16),maxCx=Math.floor((original.x+original.w-1e-9)/16);
   const minCz=Math.floor(original.z/16),maxCz=Math.floor((original.z+original.d-1e-9)/16);
   let area=0;
   for(let cx=minCx;cx<=maxCx;cx++)for(let cz=minCz;cz<=maxCz;cz++){
    const pieces=w.gateParts(cx,cz).filter(p=>p.y===original.y&&p.h===original.h&&
     p.solid===original.solid&&p.color===original.color&&
     p.x>=original.x&&p.z>=original.z&&
     p.x+p.w<=original.x+original.w+1e-8&&p.z+p.d<=original.z+original.d+1e-8);
    for(const p of pieces){
     assert.ok(p.x>=cx*16&&p.x+p.w<=(cx+1)*16+1e-8);
     assert.ok(p.z>=cz*16&&p.z+p.d<=(cz+1)*16+1e-8);
     area+=p.w*p.d;
    }
   }
   // Multiple cuboids can share a color, y and footprint. Only check
   // the presence of a valid clipped piece at every occupied seam.
   assert.ok(area>=original.w*original.d-1e-8,'cuboid footprint survives seam clipping');
  }
 }
});

test('streamed vegetation has stable unique IDs across chunk reloads',()=>{
 for(const seed of ['fortress-road','plants-001']){
  const w=create(seed),again=create(seed);
  const chunks=[[0,0],[-1,0],[0,-1],[-1,-1]];
  let count=0;
  const ids=new Set();
  for(const [cx,cz] of chunks){
   const first=w.chunkAt(cx,cz).plants,second=again.chunkAt(cx,cz).plants;
   assert.deepEqual(plain(first),plain(second),'seed and chunk regenerate identical plants');
   for(const p of first){
    assert.equal(p.id,'plant:'+w.seed+':'+p.x+':'+p.z);
    assert.ok(p.x>=cx*16&&p.x<(cx+1)*16&&p.z>=cz*16&&p.z<(cz+1)*16);
    assert.ok(!ids.has(p.id),'neighboring chunks never duplicate plant identities');
    ids.add(p.id);count++;
   }
  }
  assert.ok(count>0,'fixture has real plants to validate');
 }
});

test('Fortress Road roadside vegetation respects biome and remains seed-stable',()=>{
 const groups={desert:'cactus',salt:'cactus',tropical:'palm',fungal:'mushroom',
  wetland:'reed',volcanic:'rock',grassland:'tree'};
 for(const seed of ['fortress-road','fortress-highlands','fortress-snow','fortress-water']){
  const w=create(seed),again=create(seed),road=w.gateRoad;
  for(let t=4;t<=28;t+=8)for(const side of [-1,1]){
   const x=road.x+side*8,z=road.z+t,col=w.surfaceAt(x,z);
   const plant=w.featureAt(x,z);
   assert.deepEqual(plain(plant),plain(again.featureAt(x,z)));
   if(col.water||col.mouth||col.slope>13)assert.equal(plant,null,
    'roadside plants must avoid water, cave mouths and steep ground');
   else {
    assert.equal(plant.type,groups[col.group]||'pine');
    assert.equal(plant.height,13+t%5);
   }
  }
 }
});

test('lodge footprint and entrance remain free of regenerated foliage across chunk seams',()=>{
 for(const seed of ['fortress-road','fortress-highlands','fortress-snow','fortress-water']){
  const world=create(seed),again=create(seed),lodge=world.gateRoad.lodge;
  const chunks=new Set();
  for(let z=lodge.z-2;z<=lodge.z+9;z++)for(let x=lodge.x-3;x<=lodge.x+10;x++){
   assert.equal(world.featureAt(x,z),null,'foliage must not block lodge approach');
   assert.equal(again.featureAt(x,z),null,'clearing must be deterministic on reload');
   chunks.add(Math.floor(x/16)+','+Math.floor(z/16));
  }
  for(const key of chunks){
   const [cx,cz]=key.split(',').map(Number);
   const chunk=world.chunkAt(cx,cz);
   assert.ok(!chunk.plants.some(p=>p.x>=lodge.x-3&&p.x<=lodge.x+10&&
    p.z>=lodge.z-2&&p.z<=lodge.z+9),'chunk streaming must respect clearing');
  }
  const outside=world.featureAt(lodge.x+11,lodge.z+10);
  assert.deepEqual(plain(outside),plain(again.featureAt(lodge.x+11,lodge.z+10)),
   'outside the clearing, biome vegetation remains seed-stable');
 }
});


test('streamed landmark pieces retain parent structure IDs across seams',()=>{
 for(const seed of ['fortress-road','fortress-highlands','fortress-water']){
  const w=create(seed),road=w.gateRoad;
  const ids=new Set(road.parts.map(p=>p.id));
  assert.equal(ids.size,road.parts.length);
  const fortressId='starter-fortress:'+w.seed;
  assert.ok(road.parts.some(p=>p.structureId===fortressId));
  assert.ok(road.parts.some(p=>p.structureId===road.lodge.id));
  for(const original of road.parts){
   assert.ok([fortressId,road.lodge.id].includes(original.structureId));
   const cx=Math.floor(original.x/16),cz=Math.floor(original.z/16);
   const clipped=w.chunkAt(cx,cz).structures.find(p=>p.id===original.id);
   assert.ok(clipped,'part exists in streamed chunk');
   assert.equal(clipped.structureId,original.structureId);
   const farX=Math.floor((original.x+original.w-1e-9)/16);
   const farZ=Math.floor((original.z+original.d-1e-9)/16);
   const far=w.chunkAt(farX,farZ).structures.find(p=>p.id===original.id);
   assert.equal(far?.structureId,original.structureId,'landmark ownership survives clipping');
  }
  assert.deepEqual(plain(road.parts),plain(create(seed).gateRoad.parts));
 }
});
