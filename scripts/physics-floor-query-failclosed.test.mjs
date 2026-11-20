import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('../city-voxel-physics.js',import.meta.url),'utf8'),context);
const create=context.CityVoxelPhysics.createController;
const base={PLAYER_HEIGHT:7.2,SEA_LEVEL:-100,surfaceAt:()=>({height:2})};
test('unavailable surface query rejects teleport without changing position',()=>{
 const world={...base,surfaceAt:(x)=>x>3?(()=>{throw Error('chunk unavailable')})():{height:2}};
 const controller=create(world,{x:0,z:0});
 const before=controller.snapshot();
 assert.equal(controller.teleport(5,0),false);
 assert.deepEqual({...controller.snapshot()},{...before});
});
test('invalid surface heights fail closed at spawn',()=>{
 assert.throws(()=>create({...base,surfaceAt:()=>({height:Infinity})},{x:0,z:0}),/Spawn outside supported world/);
});
test('invalid cave floor rejects teleport and retains state',()=>{
 const world={...base,caveRoomAt:(x)=>x>3?{exposed:true,floor:NaN,ceiling:10}:null};
 const controller=create(world,{x:0,z:0});
 const before=controller.snapshot();
 assert.equal(controller.teleport(5,0),false);
 assert.deepEqual({...controller.snapshot()},{...before});
});
