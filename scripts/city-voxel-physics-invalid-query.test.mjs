import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const sandbox={};
vm.runInNewContext(readFileSync(new URL('../city-voxel-physics.js',import.meta.url),'utf8'),sandbox);
const make=sandbox.CityVoxelPhysics.createController;
const roof={x:0,y:2,z:0,w:2,h:1,d:2,solid:true};
const world=(withFallback)=>({
 PLAYER_HEIGHT:1.8,SEA_LEVEL:-100,surfaceAt:()=>({height:0}),
 gateRoad:{obstructs:()=>false,queryParts:()=>null,...(withFallback?{parts:[roof]}:{})}
});
test('invalid structural broadphase response falls back to complete roof list',()=>{
 const player=make(world(true),{x:.5,z:.5,y:3});
 assert.equal(player.snapshot().y,3);
 assert.equal(player.teleport(.5,.5,3),true);
 assert.equal(player.snapshot().y,3);
});
test('query-only malformed response fails closed instead of losing collision',()=>{
 assert.throws(()=>make(world(false),{x:.5,z:.5,y:3}),/invalid candidates without fallback geometry/);
});
