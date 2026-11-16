import test from 'node:test';
import assert from 'node:assert/strict';
import {createVehicle,stepVehicle,createTerrainVehicleEnvironment} from '../city-sandbox-vehicles.js';

test('shared terrain environment supplies both support and structural clearance',()=>{
  const world={surfaceAt:()=>({height:0})};
  let blocked=false;
  const env=createTerrainVehicleEnvironment(world,()=>blocked);
  const car=createVehicle('car',{x:0,y:1,z:0});car.speed=5;
  const moved=stepVehicle(car,{throttle:1},1/60,env);
  assert.ok(moved.position.z>0);
  blocked=true;
  const stopped=stepVehicle(car,{throttle:1},1/60,env);
  assert.deepEqual(stopped.position,car.position);
  assert.equal(stopped.heading,car.heading);
});

test('missing or throwing support fails closed in the shared environment',()=>{
  for(const surfaceAt of [()=>undefined,()=>{throw Error('unloaded');}]){
    const env=createTerrainVehicleEnvironment({surfaceAt},()=>false);
    const car=createVehicle('car',{x:0,y:1,z:0});car.speed=5;
    const stopped=stepVehicle(car,{throttle:1},1/60,env);
    assert.deepEqual(stopped.position,car.position);
    assert.equal(stopped.speed,0);
  }
});
