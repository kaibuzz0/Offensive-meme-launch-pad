import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

test('late Z-axis structural query failure rolls back earlier X-axis movement',()=>{
 const context={};
 runInNewContext(readFileSync(new URL('../city-voxel-physics.js',import.meta.url),'utf8'),context);
 let fail=true;
 const world={
  PLAYER_HEIGHT:1.8,SEA_LEVEL:-10,
  surfaceAt:()=>({height:0}),
  gateRoad:{obstructs(x,_y,z){
   if(fail&&z>0)throw Error('late structural chunk failure');
   return false;
  }}
 };
 const player=context.CityVoxelPhysics.createController(world,{x:0,z:0});
 const before={...player.snapshot()};
 assert.throws(()=>player.tick({right:1,forward:1,yaw:0},1/30),/late structural chunk failure/);
 assert.deepEqual({...player.snapshot()},before,'first-axis motion must not survive a later query failure');
 assert.equal(player.profileLastTick().failed,true);
 assert.ok(player.profileLastTick().sweepSegments>=2,'both axes were attempted');
 fail=false;
 const after=player.tick({right:1,forward:1,yaw:0},1/30);
 assert.ok(after.x>before.x&&after.z>before.z,'both axes recover after the chunk becomes available');
 assert.equal(player.profileLastTick().failed,false);
});
