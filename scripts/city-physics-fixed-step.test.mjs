import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../city-voxel-physics.js',import.meta.url),'utf8');
function controller(){
 const context={};vm.runInNewContext(source,context);
 const world={PLAYER_HEIGHT:1.8,SEA_LEVEL:-100,surfaceAt:()=>({height:0})};
 return context.CityVoxelPhysics.createController(world,{x:10,z:10});
}
test('fixed scheduler accumulates partial frames and advances on 60 Hz boundary',()=>{
 const c=controller();
 const a=c.tickFrame({forward:1,yaw:0},1/120);
 assert.equal(a.steps,0);
 const b=c.tickFrame({forward:1,yaw:0},1/120);
 assert.equal(b.steps,1);
 assert.ok(b.state.z>10);
 assert.ok(Math.abs(b.simulatedSeconds-1/60)<1e-10);
});
test('fixed scheduler bounds catch-up after a stalled frame',()=>{
 const c=controller();
 const result=c.tickFrame({forward:1},2);
 assert.equal(result.steps,4);
 assert.ok(result.discardedSeconds>1.9);
 assert.ok(result.alpha>=0&&result.alpha<=1);
 assert.equal(result.activeBodies,1);
 assert.ok(result.surfaceQueries>0);
});
test('fixed scheduler rejects invalid time without moving',()=>{
 const c=controller();
 const before=c.snapshot();
 assert.throws(()=>c.tickFrame({},NaN),/Invalid frame time/);
 assert.throws(()=>c.tickFrame({},-1),/Invalid frame time/);
 assert.deepEqual({...c.snapshot()},{...before});
});
