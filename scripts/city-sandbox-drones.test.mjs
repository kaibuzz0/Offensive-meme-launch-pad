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
