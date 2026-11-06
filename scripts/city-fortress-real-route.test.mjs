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
