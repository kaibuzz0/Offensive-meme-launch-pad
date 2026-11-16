import test from 'node:test';
import assert from 'node:assert/strict';
import {createVehicle,createTerrainVehicleClearance,stepVehicle} from '../city-sandbox-vehicles.js';

// Terrain columns use mathematical floor, not truncation toward zero: negative
// world coordinates must resolve the same seeded/edit columns as positive ones.
test('negative-coordinate vehicle footprint resolves negative terrain columns',()=>{
  const queried=new Set();
  const world={surfaceAt:(x,z)=>{
    queried.add(x+','+z);
    return {height:(x===-1&&z===-1)?3:0};
  }};
  const canOccupy=createTerrainVehicleClearance(world,()=>false);
  const car=createVehicle('car',{x:-0.25,y:1,z:-0.25});
  assert.equal(canOccupy(car.position,car),false);
  assert.ok(queried.has('-1,-1'));
});

test('negative-coordinate edited terrain blocks a moving chassis without heading drift',()=>{
  const edits=new Map();
  const world={surfaceAt:(x,z)=>({height:edits.get(x+','+z)??0})};
  const canOccupy=createTerrainVehicleClearance(world,()=>false);
  const car=createVehicle('car',{x:-0.25,y:1,z:-0.25});
  car.speed=5;
  assert.equal(canOccupy(car.position,car),true);
  edits.set('-1,-1',2);
  const next=stepVehicle(car,{steering:1},1/60,{canOccupy});
  assert.deepEqual(next.position,car.position);
  assert.equal(next.heading,car.heading);
  assert.equal(next.speed,0);
  edits.delete('-1,-1');
  assert.equal(canOccupy(car.position,car),true);
});
