import test from 'node:test';
import assert from 'node:assert/strict';
import {createDrone,commandDrone,stepDrone,serializeDrone,restoreDrone} from '../city-sandbox-drones.js';
const home={x:0,y:10,z:0};
test('scouting moves toward commanded target with fixed-step determinism',()=>{
  let d=commandDrone(createDrone({id:'scout-1',home}),'launch');
  d=commandDrone(d,'scout',{target:{x:16,y:10,z:0}});
  assert.deepEqual(stepDrone(d,1).position,{x:8,y:10,z:0});
  assert.deepEqual(stepDrone(d,1),stepDrone(d,1));
});
test('out of range commands fail without mutating drone',()=>{
  const d=commandDrone(createDrone({id:'scout-2',home,range:20}),'launch');
  assert.throws(()=>commandDrone(d,'scout',{target:{x:21,y:10,z:0}}),RangeError);
  assert.deepEqual(d.position,home);
});
test('low battery triggers automatic return and docking',()=>{
  let d=commandDrone(createDrone({id:'scout-3',home,capacity:4,speed:8}),'launch');
  d=commandDrone(d,'scout',{target:{x:8,y:10,z:0}});
  d=stepDrone(d,1);
  assert.equal(d.mode,'scouting');
  d=stepDrone(d,1);
  assert.equal(d.mode,'docked');
  assert.equal(d.camera,false);
  assert.deepEqual(d.position,home);
});
test('docked drones recharge within capacity',()=>{
  const d=createDrone({id:'scout-4',home});
  assert.equal(stepDrone(d,1).battery,d.capacity);
});
test('save round-trip and malformed save rejection',()=>{
  const d=commandDrone(createDrone({id:'scout-5',home}),'launch');
  assert.deepEqual(restoreDrone(serializeDrone(d)),d);
  assert.throws(()=>restoreDrone(JSON.stringify({...d,battery:Infinity})),TypeError);
  assert.throws(()=>restoreDrone('not json'),SyntaxError);
});
test('fixed step rejects unbounded elapsed time and invalid positions',()=>{
  const d=createDrone({id:'scout-6',home});
  assert.throws(()=>stepDrone(d,10),RangeError);
  assert.throws(()=>createDrone({id:'x',home:{x:NaN,y:0,z:0}}),TypeError);
});
test('return command disables camera and docks at home',()=>{
  let d=commandDrone(createDrone({id:'scout-7',home}),'launch');
  d=commandDrone(d,'return');
  assert.equal(d.camera,false);
  assert.equal(stepDrone(d,0.1).mode,'docked');
});

test('partially charged drones cannot move farther than their remaining powered time',()=>{
  let d=commandDrone(createDrone({id:'scout-8',home,capacity:4,speed:8}),'launch');
  d={...d,position:{x:16,y:10,z:0},target:{x:32,y:10,z:0},battery:0.25};
  const next=stepDrone(d,1);
  assert.equal(next.mode,'returning');
  assert.equal(next.battery,0);
  assert.deepEqual(next.position,{x:14,y:10,z:0});
  const stranded=stepDrone(next,1);
  assert.deepEqual(stranded.position,next.position);
  assert.equal(stranded.battery,0);
  assert.equal(stranded.mode,'returning');
});
test('zero-charge restored drone cannot move or recharge away from dock',()=>{
  let d=commandDrone(createDrone({id:'scout-9',home}),'launch');
  d={...d,position:{x:8,y:10,z:0},battery:0,mode:'returning',camera:false,target:home};
  d=restoreDrone(serializeDrone(d));
  assert.deepEqual(stepDrone(d,0.5).position,d.position);
  assert.equal(stepDrone(d,0.5).battery,0);
});

test('scout refuses routes that cannot return on remaining charge',()=>{
  let d=commandDrone(createDrone({id:'scout-reserve',home,capacity:5,speed:8,range:80}),'launch');
  assert.throws(()=>commandDrone(d,'scout',{target:{x:16,y:10,z:0}}),/insufficient battery/);
  assert.deepEqual(d.target,home);
  assert.equal(d.battery,5);
  const accepted=commandDrone(d,'scout',{target:{x:8,y:10,z:0}});
  assert.deepEqual(accepted.target,{x:8,y:10,z:0});
});
test('return reserve accounts for current location rather than just home distance',()=>{
  let d=commandDrone(createDrone({id:'scout-midroute',home,capacity:5,speed:8,range:80}),'launch');
  d={...d,position:{x:8,y:10,z:0},battery:3};
  // Flying back through home to the opposite side would require 3 flight
  // seconds plus the emergency reserve, not just the target's home distance.
  assert.throws(()=>commandDrone(d,'scout',{target:{x:-8,y:10,z:0}}),/insufficient battery/);
  assert.deepEqual(d.position,{x:8,y:10,z:0});
});

test('drone stops before a quarter-meter voxel obstruction without tunneling',()=>{
  let d=commandDrone(createDrone({id:'obstacle',home,capacity:30,speed:8}),'launch');
  d=commandDrone(d,'scout',{target:{x:8,y:10,z:0}});
  const next=stepDrone(d,1,{canTraverse:p=>p.x<3});
  assert.deepEqual(next.position,{x:2.75,y:10,z:0});
  assert.equal(next.battery,29);
  assert.equal(next.mode,'scouting');
});
test('unloaded chunks fail closed, and original no-adapter movement remains unchanged',()=>{
  let d=commandDrone(createDrone({id:'unloaded',home}),'launch');
  d=commandDrone(d,'scout',{target:{x:8,y:10,z:0}});
  assert.deepEqual(stepDrone(d,1,{canTraverse:()=>undefined}).position,home);
  assert.deepEqual(stepDrone(d,1).position,{x:8,y:10,z:0});
  assert.throws(()=>stepDrone(d,1,{canTraverse:true}),TypeError);
});
test('return-to-home also respects voxel obstacles and never docks through a wall',()=>{
  let d=commandDrone(createDrone({id:'return-blocked',home}),'launch');
  d={...d,position:{x:8,y:10,z:0}};
  d=commandDrone(d,'return');
  const next=stepDrone(d,1,{canTraverse:p=>p.x>=4});
  assert.deepEqual(next.position,{x:4,y:10,z:0});
  assert.equal(next.mode,'returning');
  assert.equal(next.camera,false);
});
