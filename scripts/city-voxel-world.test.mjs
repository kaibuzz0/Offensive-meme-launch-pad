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


test('seeded fortress pieces clip into every intersecting chunk without seam gaps',()=>{
 for(const seed of ['fortress-road','fortress-highlands','fortress-snow','fortress-water']){
  const w=create(seed),again=create(seed);
  for(let i=0;i<w.gateRoad.parts.length;i++){
   const p=w.gateRoad.parts[i],fragments=[];
   const firstX=Math.floor(p.x/16),lastX=Math.floor((p.x+p.w-1e-8)/16);
   const firstZ=Math.floor(p.z/16),lastZ=Math.floor((p.z+p.d-1e-8)/16);
   for(let cx=firstX;cx<=lastX;cx++)for(let cz=firstZ;cz<=lastZ;cz++){
    const matching=w.chunkAt(cx,cz).structures.filter(q=>q.id==='starter-gate:'+w.seed+':'+i);
    assert.equal(matching.length,1,'each touched chunk owns exactly one fragment');
    const q=matching[0];
    assert.equal(q.structureId,'starter-fortress:'+w.seed);
    assert.ok(q.x>=cx*16&&q.x+q.w<=cx*16+16+1e-8);
    assert.ok(q.z>=cz*16&&q.z+q.d<=cz*16+16+1e-8);
    fragments.push(q);
   }
   const area=fragments.reduce((sum,q)=>sum+q.w*q.d,0);
   assert.ok(Math.abs(area-p.w*p.d)<1e-7,'no gaps or overlap across seams');
  }
  const cx=Math.floor(w.gateRoad.x/16),cz=Math.floor(w.gateRoad.gateZ/16);
  assert.deepEqual(plain(w.chunkAt(cx,cz).structures),plain(again.chunkAt(cx,cz).structures));
 }
});


test('streamed foliage identities remain stable across reloads and chunk seams',()=>{
 for(const seed of ['plants-001','mountains-001','seam-001']){
  const w=create(seed),reloaded=create(seed);
  for(const [cx,cz] of [[0,0],[-1,0],[0,-1],[1,1]]){
   const a=w.chunkAt(cx,cz),b=reloaded.chunkAt(cx,cz);
   assert.deepEqual(plain(a.plants),plain(b.plants));
   assert.equal(new Set(a.plants.map(p=>p.id)).size,a.plants.length);
   for(const p of a.plants){
    assert.equal(p.id,'plant:'+w.seed+':'+p.x+':'+p.z);
    assert.ok(p.x>=cx*16&&p.x<(cx+1)*16);
    assert.ok(p.z>=cz*16&&p.z<(cz+1)*16);
   }
  }
 }
});

test('fortress roadside foliage follows the local biome and avoids unsafe slopes',()=>{
 for(const seed of ['plants-001','mountains-001','seam-001']){
  const w=create(seed),road=w.gateRoad;
  for(let t=4;t<=28;t+=8)for(const side of [-1,1]){
   const x=road.x+side*8,z=road.z+t;
   const col=w.surfaceAt(x,z),plant=w.featureAt(x,z);
   if(col.water||col.mouth||col.slope>18){
    assert.equal(plant,null);
    continue;
   }
   const expected=col.group==='desert'||col.group==='salt'?'cactus':
    col.group==='fungal'?'mushroom':col.group==='tropical'?'palm':
    ['evergreen','tundra','alpine'].includes(col.group)?'pine':'tree';
   assert.equal(plant?.type,expected);
  }
 }
});

test('roadside wildlife has one deterministic chunk owner and safe terrain footing',()=>{
 for(const seed of ['fortress-road','fortress-highlands','fortress-snow','fortress-water']){
  const world=create(seed),road=world.gateRoad;
  const x=road.x+3,z=road.z+22,cx=Math.floor(x/16),cz=Math.floor(z/16);
  const actors=world.chunkAt(cx,cz).npc;
  assert.equal(actors.length,1);
  const actor=actors[0];
  assert.equal(actor.id,'wildlife:'+world.seed+':fortress-road:0');
  assert.equal(actor.species,'fox');
  assert.equal(actor.y,world.surfaceAt(x,z).height+1);
  assert.equal(world.surfaceAt(x,z).water,false);
  assert.deepEqual(plain(actors),plain(create(seed).chunkAt(cx,cz).npc));
  for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]])
   assert.equal(world.chunkAt(cx+dx,cz+dz).npc.filter(a=>a.id===actor.id).length,0);
 }
});
