import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const sandbox={};
vm.runInNewContext(readFileSync(new URL('../city-voxel-physics.js',import.meta.url),'utf8'),sandbox);
const create=sandbox.CityVoxelPhysics.createController;

test('malformed spatial-query entries cannot crash roof spawn or fixed-step ceiling checks',()=>{
 const roof={x:0,y:2,z:0,w:4,h:1,d:4,solid:true};
 const world={
  PLAYER_HEIGHT:1.8,SEA_LEVEL:-100,
  surfaceAt:()=>({height:0}),
  gateRoad:{
   obstructs:()=>false,
   queryParts:()=>[null,undefined,false,0,roof]
  }
 };
 const controller=create(world,{x:1,z:1,y:3});
 assert.equal(controller.snapshot().y,3);
 for(let i=0;i<90;i++){
  const frame=controller.tickFrame(i===0?{jump:true}:{},1/60);
  assert.ok(Number.isFinite(frame.state.y));
  assert.ok(frame.steps<=controller.MAX_SUBSTEPS);
 }
 assert.equal(controller.snapshot().grounded,true);
 assert.equal(controller.snapshot().y,3);
 assert.equal(controller.teleport(1,1,3),true);
});
