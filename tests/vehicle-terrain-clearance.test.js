import test from 'node:test';
import assert from 'node:assert/strict';
import {createVehicle,createTerrainVehicleClearance,stepVehicle} from '../city-sandbox-vehicles.js';

const flat={surfaceAt:()=>({height:0}),gateRoad:{obstructs:()=>false}};
test('vehicle clearance requires canonical structural query',()=>{
  assert.throws(()=>createTerrainVehicleClearance(flat),/structural/);
});
test('flat seeded ground clears a stationary chassis',()=>{
  const clear=createTerrainVehicleClearance(flat,()=>false);
  const car=createVehicle('car',{x:0,y:1,z:0});
  assert.equal(clear(car.position,car),true);
  assert.doesNotThrow(()=>stepVehicle(car,{throttle:1},1/60,{canOccupy:clear}));
});
test('center pillar blocks full chassis even when corners are clear',()=>{
  const clear=createTerrainVehicleClearance(flat,(x,y,z)=>Math.abs(x)<0.08&&Math.abs(z)<0.08);
  const car=createVehicle('car',{x:0,y:1,z:0});
  assert.equal(clear(car.position,car),false);
});
test('terrain height changes and missing chunks fail closed',()=>{
  const raised={surfaceAt:(x)=>x>0?{height:3}:{height:0}};
  const car=createVehicle('car',{x:0,y:1,z:0});
  assert.equal(createTerrainVehicleClearance(raised,()=>false)(car.position,car),false);
  assert.equal(createTerrainVehicleClearance({surfaceAt:()=>null},()=>false)(car.position,car),false);
});
test('LOD-independent world predicate blocks gate structure',()=>{
  const world={surfaceAt:()=>({height:0}),gateRoad:{obstructs:(x,y,z)=>Math.abs(z)<0.08}};
  const car=createVehicle('car',{x:0,y:1,z:0});
  assert.equal(createTerrainVehicleClearance(world,()=>false)(car.position,car),false);
});
