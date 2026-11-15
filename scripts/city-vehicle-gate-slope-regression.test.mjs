import test from 'node:test';
import assert from 'node:assert/strict';
import {createVehicle,createTerrainVehicleClearance,stepVehicle} from '../city-sandbox-vehicles.js';

test('a seeded gate obstruction blocks the chassis even when terrain and structures are clear',()=>{
  let gateClosed=true;
  const world={
    surfaceAt:()=>({height:0}),
    gateRoad:{obstructs:()=>gateClosed}
  };
  const canOccupy=createTerrainVehicleClearance(world,()=>false);
  const car=createVehicle('car',{x:0,y:1,z:0});
  assert.equal(canOccupy(car.position,car),false);
  gateClosed=false;
  assert.equal(canOccupy(car.position,car),true);
});

test('a slope discontinuity beneath the chassis blocks movement independently of render detail',()=>{
  const world={surfaceAt:(x,z)=>({height:z>=1?2:0}),renderDetail:'high'};
  const canOccupy=createTerrainVehicleClearance(world,()=>false);
  const car=createVehicle('car',{x:0,y:1,z:0});
  const high=canOccupy(car.position,car);
  world.renderDetail='low';
  assert.equal(high,false);
  assert.equal(canOccupy(car.position,car),high);
});

test('a newly closed gate stops a moving vehicle without rotating its heading',()=>{
  let closed=false;
  const world={
    surfaceAt:()=>({height:0}),
    gateRoad:{obstructs:()=>closed}
  };
  const canOccupy=createTerrainVehicleClearance(world,()=>false);
  const car=createVehicle('car',{x:0,y:1,z:0});
  car.speed=5;
  const moving=stepVehicle(car,{steering:0.6},1/60,{canOccupy});
  assert.ok(moving.position.z>car.position.z);
  closed=true;
  const stopped=stepVehicle(moving,{steering:0.6},1/60,{canOccupy});
  assert.deepEqual(stopped.position,moving.position);
  assert.equal(stopped.heading,moving.heading);
  assert.equal(stopped.speed,0);
});
