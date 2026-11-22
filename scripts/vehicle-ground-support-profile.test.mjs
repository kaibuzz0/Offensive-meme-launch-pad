import test from 'node:test';
import assert from 'node:assert/strict';
import {createVehicle, advanceVehicleFrame} from '../city-sandbox-vehicles.js';

test('vehicle frame reports actual occupancy and support work without changing motion', () => {
  const start = createVehicle();
  const environment = {requireCollision:true, canOccupy:()=>true, groundHeightAt:()=>0};
  const driven = advanceVehicleFrame(start,{throttle:1},1/60,environment);
  assert.equal(driven.steps,1);
  assert.ok(driven.collisionQueries > 0);
  assert.ok(driven.groundSupportQueries > 0);
  const paused = advanceVehicleFrame(start,{},0,environment);
  assert.equal(paused.steps,0);
  assert.equal(paused.collisionQueries,0);
  assert.equal(paused.groundSupportQueries,0);
  const noSupport = advanceVehicleFrame(start,{throttle:1},1/60,{requireCollision:true,canOccupy:()=>true});
  assert.equal(noSupport.groundSupportQueries,0);
  assert.ok(noSupport.collisionQueries > 0);
});

test('ground-support query counts include a rejected swept sample', () => {
  const result = advanceVehicleFrame(createVehicle(),{throttle:1},1/60,{
    requireCollision:true,
    canOccupy:()=>true,
    groundHeightAt:()=>100,
    maxGroundStep:1
  });
  assert.equal(result.steps,1);
  assert.equal(result.groundSupportQueries,1);
  assert.equal(result.vehicle.position.z,0);
  assert.equal(result.vehicle.speed,0);
});
