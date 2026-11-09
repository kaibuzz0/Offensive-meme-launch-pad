import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('../city-voxel-physics.js',import.meta.url),'utf8'),context);
const {createController}=context.CityVoxelPhysics;

function world(){
 const roof={x:-2,y:8,z:-2,w:4,h:2,d:4,solid:true};
 return {PLAYER_HEIGHT:1.8,SEA_LEVEL:-100,
  surfaceAt(){return {height:-1};},
  gateRoad:{parts:[roof],obstructs(x,y,z,height,radius){
   return x+radius>roof.x&&x-radius<roof.x+roof.w&&
    z+radius>roof.z&&z-radius<roof.z+roof.d&&
    y<roof.y+roof.h&&y+height>roof.y;
  }}
 };
}

test('saved feet position on a structural roof restores at roof height',()=>{
 const actor=createController(world(),{x:0,z:0,y:10});
 assert.equal(actor.snapshot().y,10);
 assert.equal(actor.snapshot().grounded,true);
 for(let i=0;i<10;i++)actor.tickFrame({},1/60);
 assert.equal(actor.snapshot().y,10);
});

test('ordinary spawn below roof remains on terrain',()=>{
 const actor=createController(world(),{x:0,z:0,y:0});
 assert.equal(actor.snapshot().y,0);
});
