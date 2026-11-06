import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const root={};
for(const name of ['city-worldgen.js','city-terrain-world.js','city-voxel-world.js','city-voxel-renderer.js','city-voxel-physics.js'])
 vm.runInNewContext(readFileSync(new URL('../'+name,import.meta.url),'utf8'),root,{filename:name});
const catalog=Array.from({length:132},(_,i)=>({
 id:'frontier-'+i,name:'Biome '+i,
 group:['evergreen','desert','tundra','wetland','volcanic','alpine','tropical','grassland','salt','crystal','fungal','ruins'][Math.floor(i/11)],
 material:'topsoil',hue:i*19%360,sat:35,light:40
}));
const world=seed=>root.CityVoxelWorld.createVoxelWorld(root.CityTerrainWorld.createTerrain(seed,catalog));
const plain=value=>JSON.parse(JSON.stringify(value));

test('first-person physics uses 25cm voxels, 1.8m player and bounded steps',()=>{
 const w={SEA_LEVEL:5,PLAYER_HEIGHT:7.2,surfaceAt:(x,z)=>({height:x>=3?18:x>=1?11:10,water:false})};
 const p=root.CityVoxelPhysics.createController(w,{x:.2,z:.2});
 assert.equal(p.PLAYER_HEIGHT,7.2);
 assert.equal(p.MAX_STEP,2.2);
 assert.equal(p.snapshot().y,11);
 for(let i=0;i<10;i++)p.tick({right:1,yaw:0},.05);
 assert.ok(p.snapshot().x>=.5&&p.snapshot().x<3,
  'can traverse small ground steps but must not clip through a tall cliff');
 assert.ok(p.snapshot().grounded,'walking preserves stable ground contact');
 assert.equal(p.snapshot().y,12,'controller climbs a one-voxel step');
 assert.equal(p.teleport(0,0),true);
 assert.equal(p.snapshot().y,11);
 assert.throws(()=>p.tick({},Infinity),/Invalid time step/);
});

test('jump has an arc with gravitational fall and lands on solid terrain',()=>{
 const w={SEA_LEVEL:5,PLAYER_HEIGHT:7.2,surfaceAt:()=>({height:35})};
 const p=root.CityVoxelPhysics.createController(w,{x:0,z:0});
 assert.equal(p.snapshot().y,36);
 const rising=p.tick({jump:true},.05);
 assert.equal(rising.grounded,false);
 assert.ok(rising.y>36);
 let peak=rising.y,landed=false;
 for(let i=0;i<45;i++){
  const s=p.tick({},.05);
  peak=Math.max(peak,s.y);
  if(s.grounded){landed=true;break;}
 }
 assert.ok(landed,'gravity must bring the player back to the ground');
 assert.ok(peak>=39,'jump should visibly clear several quarter-meter blocks');
 assert.equal(p.snapshot().y,36);
});

test('nearby cave entrances have a deterministic mouth and dark rock floor',()=>{
 const w=world('mouth-seed-01'),again=world('mouth-seed-01');
 let found=null;
 outer:for(let z=-260;z<=260;z+=2)
  for(let x=-260;x<=260;x+=2){
   const mouth=w.caveMouthAt(x,z);
   if(mouth?.inside){found={x,z,mouth};break outer;}
  }
 assert.ok(found,'seed-driven cave entrance must occur in the starter landscape');
 const {x,z}=found,col=w.surfaceAt(x,z);
 assert.equal(col.mouth,true);
 assert.equal(col.material,'cave-rock');
 assert.ok(col.mouthDepth>=1);
 assert.equal(col.mouthId,found.mouth.id);
 assert.deepEqual(plain(col),plain(again.surfaceAt(x,z)));
 assert.equal(w.blockAt(x,col.height,z).solid,true);
 assert.equal(w.featureAt(x,z),null,'do not grow full-size trees from cave entrances');
});

test('biome materials and natural vegetation remain seed-stable without streets or NPCs',()=>{
 const w=world('nature-01'),other=world('nature-01');
 const types=new Set(),material=new Set();let plants=0;
 for(const a of w.atlas.anchors.filter((_,i)=>i%9===0)){
  const cx=Math.floor(a.x/16),cz=Math.floor(a.y/16),chunk=w.chunkAt(cx,cz);
  for(const tile of chunk.tiles)material.add(tile.material);
  for(const plant of chunk.plants){
   types.add(plant.type);plants++;
  }
  assert.equal(chunk.roads.length,0);assert.equal(chunk.npc.length,0);
  assert.equal(chunk.structures.length,0);
 }
 assert.ok(material.size>=3,'shore, snow, stone and soil must differ physically');
 assert.ok(types.size>=2,'biomes must have more than one vegetation archetype');
 assert.ok(plants>=8,'seeded forests must include visible vegetation');
 const sample=w.chunkAt(-3,2);
 assert.deepEqual(plain(sample),plain(other.chunkAt(-3,2)));
});

test('organic foliage, exposed rocky walls and shoreline mesh stay bounded and finite',()=>{
 const w=world('render-nature-01');
 const meshes=[[0,0,1],[2,-3,4],[-7,5,1]].map(([x,z,lod])=>
  root.CityVoxelRenderer.generateMesh(w,x,z,lod));
 for(const m of meshes){
  assert.ok(m.vertices>m.tiles*6);
  assert.ok(m.vertices<550000,'one streaming chunk must fit mobile GPU budget');
  assert.equal(m.data.length,m.vertices*9);
  assert.ok(m.data.every(Number.isFinite));
 }
 assert.equal(meshes[1].tiles,16);
 assert.equal(root.CityVoxelRenderer.MAX_GPU_CHUNKS,176);
});
