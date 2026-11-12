import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('../city-voxel-physics.js',import.meta.url),'utf8'),context);
const {createController}=context.CityVoxelPhysics;

test('walking off a raised road step starts falling without a hovering frame',()=>{
 const world={
  PLAYER_HEIGHT:7.2,SEA_LEVEL:-100,
  surfaceAt:(x)=>({height:x<2?4:0})
 };
 const player=createController(world,{x:1.4,z:0});
 assert.equal(player.snapshot().y,5);
 let departed=false;
 for(let i=0;i<12;i++){
  const before=player.snapshot();
  const after=player.tick({right:1},.05);
  if(before.grounded&&!after.grounded){
   departed=true;
   assert.ok(after.y<before.y,'gravity applies during the edge-crossing tick');
   assert.ok(after.vy<0,'falling velocity starts immediately');
   break;
  }
 }
 assert.ok(departed,'player must leave the raised road step');
});

test('walking on a level road remains grounded',()=>{
 const world={PLAYER_HEIGHT:7.2,SEA_LEVEL:-100,surfaceAt:()=>({height:4})};
 const player=createController(world,{x:0,z:0});
 for(let i=0;i<20;i++){
  const after=player.tick({right:1},.05);
  assert.equal(after.grounded,true);
  assert.equal(after.y,5);
 }
});
