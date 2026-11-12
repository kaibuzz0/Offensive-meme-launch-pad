import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Exercise the shipped seeded road, its real tower collision boxes and the
// shipped controller. No hand-authored substitute gate geometry or teleport.
const context=vm.createContext({});
for(const file of ['city-voxel-world.js','city-voxel-physics.js'])
 vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),context);
const {createVoxelWorld}=context.CityVoxelWorld;
const {createController}=context.CityVoxelPhysics;
function worldFor(seed){
 const atlas={seedHash:seed,biomeAt:()=>({id:'grass',name:'Grass',group:'grassland',hue:95,sat:30,light:50,moisture:.5,temperature:.5}),
  spawnAt:()=>({x:0,y:0})};
 return createVoxelWorld(atlas);
}
test('real seeded fortress approach stays grounded and reaches gate without teleport or clipping',()=>{
 for(const seed of [12345,98765]){
  const world=worldFor(seed),spawn=world.spawnAt(),gate=world.gateRoad;
  const controller=createController(world,{x:spawn.x,z:spawn.z});
  let previous=controller.snapshot(),entered=false;
  assert.ok(gate.parts.some(p=>p.solid),'real fortress walls are present');
  for(let i=0;i<160;i++){
   const next=controller.tick({forward:1},.05);
   assert.ok(Math.hypot(next.x-previous.x,next.z-previous.z)<=.751,'no teleport on road');
   assert.equal(world.gateRoad.obstructs(next.x,next.y,next.z,world.PLAYER_HEIGHT,.27),false,'no solid tower overlap');
   assert.ok(next.y>=world.surfaceAt(Math.floor(next.x),Math.floor(next.z)).height-2,'no fall through road');
   if(next.z>=gate.gateZ+4){entered=true;break;}
   previous=next;
  }
  assert.ok(entered,'walking from real spawn must pass through the real gate for seed '+seed);
 }
});

// Validate the collision contract against actual generated tower meshes, not
// an invented obstacle: the road opening must be traversable, while the
// adjacent solid gate towers must block the same player capsule.
test('seeded fortress has a real passable gate between collidable towers',()=>{
 for(const seed of [12345,98765]){
  const world=worldFor(seed),gate=world.gateRoad;
  const gateY=gate.base+1;
  assert.equal(gate.obstructs(gate.gateX,gateY,gate.gateZ,world.PLAYER_HEIGHT,.27),false,
   'central opening must remain passable');
  const towers=gate.parts.filter(p=>p.solid&&p.h>=20&&p.d>=9);
  assert.ok(towers.length>=2,'both fortress towers must exist');
  for(const tower of towers){
   const x=tower.x+tower.w/2,z=tower.z+tower.d/2;
   assert.equal(gate.obstructs(x,gateY,z,world.PLAYER_HEIGHT,.27),true,
    'tower collision must block a player-height capsule');
  }
 }
});
