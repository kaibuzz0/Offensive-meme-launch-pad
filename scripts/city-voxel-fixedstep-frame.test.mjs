// Regression coverage for the optional bounded fixed-step frame adapter.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';
const context={};
runInNewContext(readFileSync(new URL('../city-voxel-physics.js',import.meta.url),'utf8'),context);
const makeWorld=()=>({
 PLAYER_HEIGHT:1.8,SEA_LEVEL:-100,
 surfaceAt(x,z){return Math.abs(x)<100&&Math.abs(z)<100?{height:0}:null;},
});
const create=()=>context.CityVoxelPhysics.createController(makeWorld(),{x:0,z:0});
test('fixed-step movement is independent of 30 vs 60 fps render cadence',()=>{
 const a=create(),b=create();
 for(let i=0;i<60;i++)a.tickFrame({forward:1,yaw:0},1/60);
 for(let i=0;i<30;i++)b.tickFrame({forward:1,yaw:0},1/30);
 assert.ok(Math.abs(a.snapshot().z-b.snapshot().z)<1e-8);
 assert.ok(Math.abs(a.snapshot().z-15)<1e-8);
});
test('long stalls are bounded and invalid elapsed time is rejected',()=>{
 const c=create();
 const result=c.tickFrame({forward:1},10);
 assert.ok(result.steps<=c.MAX_SUBSTEPS);
 assert.ok(c.snapshot().z<=1.5);
 assert.throws(()=>c.tickFrame({},-1),/Invalid frame time/);
 assert.throws(()=>c.tickFrame({},NaN),/Invalid frame time/);
});
test('short frames retain fractional time without moving prematurely',()=>{
 const c=create();
 assert.equal(c.tickFrame({forward:1},1/120).steps,0);
 assert.equal(c.tickFrame({forward:1},1/120).steps,1);
 assert.ok(c.snapshot().z>0);
});
