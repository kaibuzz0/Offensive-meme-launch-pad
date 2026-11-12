import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const root={};
vm.runInNewContext(readFileSync(new URL('../city-voxel-physics.js',import.meta.url),'utf8'),root);
const world={SEA_LEVEL:0,PLAYER_HEIGHT:7.2,surfaceAt:()=>({height:10,water:false})};

test('non-finite or nonnumeric movement axes cannot propel the canonical player',()=>{
 const player=root.CityVoxelPhysics.createController(world,{x:0,z:0});
 const start=player.snapshot();
 for(const input of [
  {right:Infinity,forward:-Infinity},
  {right:NaN,forward:'1'},
  {right:'-1',forward:undefined},
  {right:{valueOf:()=>Infinity},forward:null}
 ]){
  const after=player.tick(input,.05);
  assert.equal(after.x,start.x);
  assert.equal(after.z,start.z);
  assert.ok(Number.isFinite(after.y));
 }
});

test('finite analog movement remains supported and bounded',()=>{
 const player=root.CityVoxelPhysics.createController(world,{x:0,z:0});
 const moved=player.tick({right:.5,forward:0,yaw:0},.05);
 assert.ok(moved.x>.3&&moved.x<.4,'half-speed axis should move 0.375 voxel units');
 assert.equal(moved.z,0);
});
