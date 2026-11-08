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
