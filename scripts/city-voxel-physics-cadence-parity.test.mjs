import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';
const context={};
runInNewContext(readFileSync(new URL('../city-voxel-physics.js',import.meta.url),'utf8'),context);
function controller(){
 const world={PLAYER_HEIGHT:1.8,SEA_LEVEL:-100,
  surfaceAt(x,z){return Math.abs(x)<50&&Math.abs(z)<50?{height:0}:null;},
  gateRoad:{obstructs(x,y,z){return x>=1&&x<=2&&z>=0;}}};
 return context.CityVoxelPhysics.createController(world,{x:0,z:0});
}
function simulate(hz){
 const c=controller();let steps=0;
 for(let i=0;i<hz;i++)steps+=c.tickFrame({forward:1,right:1,yaw:0},1/hz).steps;
 return {state:c.snapshot(),steps};
}
test('30, 60 and 120 Hz display cadences share diagonal collision',()=>{
 const baseline=simulate(60);
 for(const hz of [30,120]){
  const result=simulate(hz);
  assert.equal(result.steps,60);
  for(const axis of ['x','y','z'])
   assert.ok(Math.abs(result.state[axis]-baseline.state[axis])<1e-8,
    `${hz}Hz ${axis} drifted from 60Hz physics`);
 }
 assert.ok(baseline.state.x<1,'solid wall must block lateral entry');
});

test('fixed-step gate traversal preserves open doorway and solid wall at 30/60/120 Hz',()=>{
 const make=(z)=>context.CityVoxelPhysics.createController({
  PLAYER_HEIGHT:1.8,SEA_LEVEL:-100,
  surfaceAt(){return {height:0};},
  gateRoad:{obstructs(x,y,pz,height,radius){
   return x+radius>=1&&x-radius<=2&&Math.abs(pz)>.6;
  }}
 },{x:0,z});
 function travel(z,hz){
  const c=make(z);let steps=0;
  for(let i=0;i<hz;i++)steps+=c.tickFrame({right:1,yaw:0},1/hz).steps;
  return {state:c.snapshot(),steps};
 }
 const referenceWall=travel(2,60),referenceDoor=travel(0,60);
 assert.ok(referenceWall.state.x<1,'wall collision was bypassed');
 assert.ok(referenceDoor.state.x>2,'open gate doorway could not be crossed');
 for(const hz of [30,120]){
  const wall=travel(2,hz),door=travel(0,hz);
  assert.equal(wall.steps,60);
  assert.equal(door.steps,60);
  assert.ok(Math.abs(wall.state.x-referenceWall.state.x)<1e-8,
   `wall drift at ${hz} Hz`);
  assert.ok(Math.abs(door.state.x-referenceDoor.state.x)<1e-8,
   `door drift at ${hz} Hz`);
 }
});


test('fixed-step cave headroom blocks rising through an adjacent solid roof',()=>{
 const world={
  PLAYER_HEIGHT:1.8,SEA_LEVEL:-100,
  surfaceAt(){return {height:0};},
  caveRoomAt(x,z){return {floor:0,ceiling:2.1,exposed:false};}
 };
 const c=context.CityVoxelPhysics.createController(world,{x:0,z:0,y:0});
 // A cave player can jump, but the capsule head must remain below the roof.
 let peak=-Infinity;
 for(let i=0;i<60;i++){
  const frame=c.tickFrame({jump:i===0},1/60);
  assert.equal(frame.steps,1);
  peak=Math.max(peak,frame.state.y);
  assert.ok(frame.state.y+world.PLAYER_HEIGHT<=2.1+1e-8,
   'cave ceiling must constrain the entire player capsule');
 }
 assert.ok(peak>0,'jump should move before contacting the roof');
});
