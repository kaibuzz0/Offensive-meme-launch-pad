import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const sandbox={};
vm.runInNewContext(readFileSync(new URL('../city-voxel-physics.js',import.meta.url),'utf8'),sandbox);
const make=sandbox.CityVoxelPhysics.createController;
const roof={x:0,y:2,z:0,w:2,h:1,d:2,solid:true};
function world(queryOnly=false){
 const gateRoad={obstructs:()=>false,queryParts:()=>{throw Error('spatial index unavailable');}};
 if(!queryOnly)gateRoad.parts=[roof];
 return {PLAYER_HEIGHT:1.8,SEA_LEVEL:-100,surfaceAt:()=>({height:0}),gateRoad};
}
test('optional broadphase exception preserves roof spawn, movement and fixed-step simulation',()=>{
 const baseline=world();delete baseline.gateRoad.queryParts;
 const a=make(baseline,{x:.5,z:.5,y:3});
 const b=make(world(),{x:.5,z:.5,y:3});
 assert.deepEqual({...a.snapshot()},{...b.snapshot()});
 for(const input of [{forward:1},{jump:true},{right:1},{forward:-1}]){
  assert.deepEqual({...a.tickFrame(input,1/30).state},{...b.tickFrame(input,1/30).state});
 }
 assert.equal(b.teleport(.5,.5,3),true);
 assert.equal(b.snapshot().y,3);
});
test('query-only worlds surface provider errors instead of silently losing collision',()=>{
 assert.throws(()=>make(world(true),{x:.5,z:.5,y:3}),/spatial index unavailable/);
});
