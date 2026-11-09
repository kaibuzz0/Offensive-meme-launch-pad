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

test('successful teleport clears partial frame time; rejected teleport retains it',()=>{
 const c=create();
 assert.equal(c.tickFrame({forward:1},1/120).steps,0);
 assert.equal(c.teleport(2,2),true);
 assert.equal(c.tickFrame({forward:1},1/120).steps,0);
 assert.equal(c.snapshot().z,2);
 assert.equal(c.teleport(10000,10000),false);
 assert.equal(c.tickFrame({forward:1},1/120).steps,1);
 assert.ok(c.snapshot().z>2);
});

test('frame telemetry reports simulated steps and bounded discarded stall time',()=>{
 const c=create();
 const stalled=c.tickFrame({forward:1},10);
 assert.equal(stalled.steps,6);
 assert.ok(Math.abs(stalled.simulatedSeconds-.1)<1e-10);
 assert.ok(Math.abs(stalled.droppedSeconds-9.9)<1e-8);
 assert.ok(stalled.alpha>=0&&stalled.alpha<1);
 const paused=c.tickFrame({},0);
 assert.equal(paused.steps,0);
 assert.equal(paused.simulatedSeconds,0);
 assert.equal(paused.droppedSeconds,0);
});


test('per-frame spatial query telemetry is bounded to the simulated work',()=>{
 const c=create();
 const idle=c.tickFrame({},0);
 assert.equal(idle.surfaceQueries,0);
 assert.equal(idle.caveQueries,0);
 const moving=c.tickFrame({forward:1},1/60);
 assert.equal(moving.steps,1);
 assert.ok(moving.surfaceQueries>0);
 assert.equal(moving.caveQueries,0);
 const stalled=c.tickFrame({forward:1},10);
 assert.equal(stalled.steps,6);
 assert.ok(stalled.surfaceQueries>0);
 assert.ok(stalled.surfaceQueries<=moving.surfaceQueries*12,
  'long frame must not execute unbounded collision queries');
 const paused=c.tickFrame({},0);
 assert.equal(paused.surfaceQueries,0);
});

test('controller initializes collision telemetry before sampling spawn terrain',()=>{
 const c=create();
 assert.equal(c.snapshot().y,1);
 const idle=c.tickFrame({},0);
 assert.equal(idle.surfaceQueries,0);
 assert.equal(idle.caveQueries,0);
});


test('frame telemetry includes cave and fortress obstruction probes, not only surface sampling',()=>{
 let caveCalls=0,gateCalls=0;
 const world={...makeWorld(),
  caveRoomAt(){caveCalls++;return null;},
  gateRoad:{obstructs(){gateCalls++;return false;}}
 };
 const c=context.CityVoxelPhysics.createController(world,{x:0,z:0});
 const beforeCave=caveCalls,beforeGate=gateCalls;
 const frame=c.tickFrame({forward:1},1/60);
 assert.equal(frame.steps,1);
 assert.ok(frame.caveQueries>0);
 assert.ok(frame.obstructionQueries>0);
 assert.equal(frame.caveQueries,caveCalls-beforeCave);
 assert.equal(frame.obstructionQueries,gateCalls-beforeGate);
 const idle=c.tickFrame({},0);
 assert.equal(idle.caveQueries,0);
 assert.equal(idle.obstructionQueries,0);
});

test('public first-person loop consumes fixed-step adapter and preserves queued jump until a step',()=>{
 const source=readFileSync(new URL('../city-terrain-mode.js',import.meta.url),'utf8');
 assert.match(source,/physics\.tickFrame\(input,elapsed\)/);
 assert.match(source,/if\(framePhysics\.steps>0\)jumpQueued=false/);
 assert.match(source,/player\.x=position\.x;player\.y=position\.z/);
 assert.match(source,/physicsDroppedSeconds/);
});

test('surface-query telemetry includes direct per-step feet sampling',()=>{
 let calls=0;
 const world={...makeWorld(),surfaceAt(x,z){calls++;return {height:0};}};
 const c=context.CityVoxelPhysics.createController(world,{x:0,z:0});
 const before=calls;
 const frame=c.tickFrame({},1/60);
 assert.equal(frame.steps,1);
 assert.equal(frame.surfaceQueries,calls-before);
 const paused=c.tickFrame({},0);
 assert.equal(paused.surfaceQueries,0);
 assert.equal(calls-before,frame.surfaceQueries);
});

test('stationary and single-axis input avoid unnecessary lateral collision sweeps',()=>{
 let probes=0;
 const world={...makeWorld(),gateRoad:{obstructs(){probes++;return false;}}};
 const idle=context.CityVoxelPhysics.createController(world,{x:0,z:0});
 const start=probes;
 const stationary=idle.tickFrame({},1/60);
 assert.equal(stationary.steps,1);
 assert.equal(probes-start,0,'stationary physics should not probe lateral obstacles');
 const forward=idle.tickFrame({forward:1,yaw:0},1/60);
 assert.equal(forward.steps,1);
 assert.ok(probes-start>0,'forward movement must still sweep the active axis');
 assert.ok(idle.snapshot().z>0);
 const before=probes;
 idle.tickFrame({right:1,yaw:0},1/60);
 assert.ok(probes>before,'right movement must sweep its active axis');
 assert.ok(idle.snapshot().x>0);
});
