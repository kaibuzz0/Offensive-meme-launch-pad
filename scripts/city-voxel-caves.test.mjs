import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const root={};
for(const name of ['city-worldgen.js','city-terrain-world.js','city-voxel-world.js','city-voxel-renderer.js','city-voxel-physics.js']){
 vm.runInNewContext(readFileSync(new URL('../'+name,import.meta.url),'utf8'),root,{filename:name});
}
const catalog=Array.from({length:132},(_,i)=>({
 id:'frontier-'+i,name:'Biome '+i,
 group:['evergreen','desert','tundra','wetland','volcanic','alpine','tropical','grassland','salt','crystal','fungal','ruins'][Math.floor(i/11)],
 material:'topsoil',hue:i*19%360,sat:35,light:40
}));
const create=seed=>root.CityVoxelWorld.createVoxelWorld(root.CityTerrainWorld.createTerrain(seed,catalog));
const plain=value=>JSON.parse(JSON.stringify(value));

function findCaveMouth(world){
 for(let z=-350;z<=350;z+=3)
  for(let x=-350;x<=350;x+=3){
   const candidate=world.caveMouthAt(x,z);
   if(candidate?.inside&&world.caveRoomAt(candidate.x,candidate.z))return candidate;
  }
 throw Error('No cave mouth generated in the tested 700x700 starter landscape');
}

test('seeded surface shafts lead to actual subterranean gallery floors, ceilings and void blocks',()=>{
 const w=create('round4-gallery-01'),again=create('round4-gallery-01');
 const mouth=findCaveMouth(w);
 const center=w.caveRoomAt(mouth.x,mouth.z);
 assert.ok(center,'the cave entrance must connect to the gallery');
 assert.equal(center.id,mouth.id);
 assert.ok(center.floor<center.ceiling-7,'full-height human passage must fit inside gallery');
 assert.deepEqual(plain(center),plain(again.caveRoomAt(mouth.x,mouth.z)));
 assert.equal(w.surfaceAt(mouth.x,mouth.z).mouth,true);
 const x=Math.round(mouth.x+Math.cos(center.angle)*14);
 const z=Math.round(mouth.z+Math.sin(center.angle)*14);
 const far=w.caveRoomAt(x,z);
 assert.ok(far,'gallery extends inward from cave entrance');
 assert.ok(far.t>10);
 assert.equal(far.exposed,false,'underground chamber has a solid terrain roof');
 assert.ok(far.ceiling-far.floor>=8);
 const inside=w.blockAt(x,Math.ceil(far.floor+2),z);
 assert.equal(inside.material,'air','3D occupancy must be carved for traversable gallery');
 assert.equal(inside.cave,true);
 assert.equal(w.blockAt(x,w.MIN_HEIGHT,z).material,'bedrock');
});

test('near-field render mesh includes underground floor, wall and vault geometry',()=>{
 const w=create('round4-geom-02'),mouth=findCaveMouth(w);
 const cx=Math.floor(mouth.x/16),cz=Math.floor(mouth.z/16);
 const full=root.CityVoxelRenderer.generateMesh(w,cx,cz);
 const noRoom=root.CityVoxelRenderer.generateMesh({...w,caveRoomAt:()=>null},cx,cz);
 assert.ok(full.vertices>noRoom.vertices,'the cave is actual rendered geometry, not just metadata');
 assert.ok(full.vertices<550000);
 assert.ok(full.data.every(Number.isFinite));
 const far=root.CityVoxelRenderer.generateMesh(w,cx,cz,4);
 assert.equal(far.tiles,16);
 assert.ok(far.vertices<full.vertices,'distant LOD must omit costly underground chambers');
});

test('same-world character movement can pass beneath a solid rock roof without teleporting',()=>{
 const underground={
  SEA_LEVEL:2,PLAYER_HEIGHT:7.2,EYE_HEIGHT:6.4,
  surfaceAt:(x,z)=>({height:x>=2?25:10,water:false}),
  caveRoomAt:(x,z)=>x>=1&&x<=5?{
   floor:11,ceiling:20,exposed:x<=1
  }:null
 };
 const c=root.CityVoxelPhysics.createController(underground,{x:.5,z:.5});
 assert.equal(c.snapshot().y,11);
 for(let i=0;i<6;i++)c.tick({right:1,yaw:0},.05);
 const inCave=c.snapshot();
 assert.ok(inCave.x>2.5,'player must pass below the solid rock roof');
 assert.ok(inCave.y<20-underground.PLAYER_HEIGHT+1);
 assert.ok(inCave.grounded);
 assert.equal(c.floorAt(3,.5,inCave.y),11);
 // A solid wall outside the gallery blocks movement by height difference.
 for(let i=0;i<12;i++)c.tick({right:1,yaw:0},.05);
 assert.ok(c.snapshot().x<6,'underground player cannot walk through uncarved rock');
 c.tick({jump:true},.05);
 for(let i=0;i<15;i++)c.tick({},.05);
 assert.ok(c.snapshot().y<=20-7.2+.01,'the roof prevents jumping through solid terrain');
});

test('surface and cave generation remain identical across independent worlds with same seed',()=>{
 const one=create('round4-determinism'),two=create('round4-determinism');
 for(const [x,z] of [[-107,20],[0,0],[300,-200],[-512,113]]){
  assert.deepEqual(plain(one.surfaceAt(x,z)),plain(two.surfaceAt(x,z)));
  assert.deepEqual(plain(one.caveRoomAt(x,z)),plain(two.caveRoomAt(x,z)));
 }
 assert.deepEqual(plain(one.chunkAt(0,0).roads),plain(two.chunkAt(0,0).roads));
 assert.equal(one.chunkAt(0,0).npc.length,0);
 assert.equal(one.chunkAt(0,0).structures.length,0);
});
