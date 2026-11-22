import test from 'node:test';
import assert from 'node:assert/strict';
import {createVehicle,stepVehicle,advanceVehicleFrame} from '../city-sandbox-vehicles.js';

// Contract-level tests: world collision queries are gameplay authority; render LOD is not.
function driveAcross(visualDetail, groundHeightAt, canOccupy) {
  let vehicle=createVehicle('truck',{x:0,y:2,z:0});
  vehicle.speed=8;
  const environment={requireCollision:true,visualDetail,maxGroundStep:0.3,groundHeightAt,canOccupy};
  for(let i=0;i<12;i++) vehicle=stepVehicle(vehicle,{},1/60,environment);
  return vehicle;
}

test('downhill chassis support is deterministic across automatic render detail',()=>{
  const ground=({z})=>2-z*0.15;
  const occupancy=({y,z})=>Math.abs(y-ground({z}))<1e-9;
  const low=driveAcross('low',ground,occupancy);
  const high=driveAcross('high',ground,occupancy);
  assert.deepEqual(low,high);
  assert.ok(low.position.z>0);
  assert.ok(low.position.y<2);
});

test('low building headroom blocks the same swept chassis in every renderer',()=>{
  const ground=()=>2;
  const occupancy=({z,y})=>z<0.5 || y+2.2<=3.5;
  const low=driveAcross('low',ground,occupancy);
  const high=driveAcross('high',ground,occupancy);
  assert.deepEqual(low,high);
  assert.ok(low.position.z<0.5);
  assert.equal(low.speed,0);
});

test('unavailable or malformed cave support never becomes a drivable floor',()=>{
  const vehicle=createVehicle('car',{x:0,y:2,z:0});
  vehicle.speed=10;
  const original=structuredClone(vehicle);
  for(const height of [undefined,NaN,Infinity,-Infinity]){
    assert.throws(()=>stepVehicle(vehicle,{},1/60,{
      requireCollision:true,canOccupy:()=>true,groundHeightAt:()=>height
    }),/finite height/);
    assert.deepEqual(vehicle,original);
  }
});

test('bounded catch-up keeps terrain and occupancy queries inside the fixed-step budget',()=>{
  let support=0,occupancy=0;
  const vehicle=createVehicle('truck',{x:0,y:2,z:0});
  const result=advanceVehicleFrame(vehicle,{throttle:1},20,{
    requireCollision:true,groundHeightAt:()=>{support++;return 2;},
    canOccupy:()=>{occupancy++;return true;}
  },{remainder:0},{step:1/60,maxSteps:3});
  assert.equal(result.steps,3);
  assert.equal(result.groundSupportQueries,support);
  assert.equal(result.collisionQueries,occupancy);
  assert.ok(result.droppedSeconds>19);
  assert.ok(support<=3*10,'each bounded tick must have a finite local support footprint');
});
