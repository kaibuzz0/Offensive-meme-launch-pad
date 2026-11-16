import test from 'node:test';
import assert from 'node:assert/strict';
import {createVehicle,createTerrainVehicleClearance,stepVehicle} from '../city-sandbox-vehicles.js';

// The canonical seeded surfaceAt API accepts integer terrain columns.
// Chassis occupancy still samples the full quarter-meter footprint and
// structural edits at their actual world coordinates.
test('chassis rejects a quarter-meter structural edit inside an otherwise clear terrain column',()=>{
  const world={surfaceAt:()=>({height:0})};
  const visited=[];
  const canOccupy=createTerrainVehicleClearance(world,(x,y,z,height)=>{
    visited.push({x,y,z,height});
    return x>=0.20&&x<=0.30&&z>=0.20&&z<=0.30;
  });
  const car=createVehicle('car',{x:0,y:1,z:0});
  assert.equal(canOccupy(car.position,car),false);
  assert.ok(visited.length>1);
  assert.ok(visited.some(p=>p.x>=0.20&&p.x<=0.30&&p.z>=0.20&&p.z<=0.30));
});

test('vehicle clearance notices changed terrain columns on subsequent queries',()=>{
  const edited=new Map();
  const world={surfaceAt:(x,z)=>({height:edited.get(x+','+z)??0})};
  const canOccupy=createTerrainVehicleClearance(world,()=>false);
  const car=createVehicle('car',{x:0,y:1,z:0});
  assert.equal(canOccupy(car.position,car),true);
  edited.set('0,0',2);
  assert.equal(canOccupy(car.position,car),false);
  edited.delete('0,0');
  assert.equal(canOccupy(car.position,car),true);
});

test('fixed-step vehicle cannot enter a changed terrain cell after it becomes blocked',()=>{
  const edited=new Map();
  const world={surfaceAt:(x,z)=>({height:edited.get(x+','+z)??0})};
  const canOccupy=createTerrainVehicleClearance(world,()=>false);
  const car=createVehicle('car',{x:0,y:1,z:0});
  car.speed=4;
  edited.set('0,0',2);
  const blocked=stepVehicle(car,{},1/60,{canOccupy});
  assert.deepEqual(blocked.position,car.position);
  assert.equal(blocked.speed,0);
});

test('unloaded terrain and ambiguous structural responses fail closed without changing vehicle state',()=>{
  let terrainReady=false;
  let structuralReady=false;
  const world={surfaceAt:()=>terrainReady?{height:0}:null};
  const canOccupy=createTerrainVehicleClearance(world,()=>structuralReady?false:undefined);
  const car=createVehicle('car',{x:0,y:1,z:0});
  car.speed=3;
  const original=structuredClone(car);
  const unloaded=stepVehicle(car,{},1/60,{canOccupy});
  assert.deepEqual(unloaded.position,original.position);
  assert.equal(unloaded.speed,0);
  terrainReady=true;
  const unknown=stepVehicle(car,{},1/60,{canOccupy});
  assert.deepEqual(unknown.position,original.position);
  assert.equal(unknown.speed,0);
  structuralReady=true;
  const clear=stepVehicle(car,{},1/60,{canOccupy});
  assert.ok(clear.position.z>original.position.z);
});

test('render detail changes do not affect vehicle collision outcomes',()=>{
  const world={surfaceAt:()=>({height:0}),renderDetail:'high'};
  const canOccupy=createTerrainVehicleClearance(world,(x,y,z)=>z>1.7);
  const car=createVehicle('car',{x:0,y:1,z:0});
  const high=canOccupy(car.position,car);
  world.renderDetail='low';
  const low=canOccupy(car.position,car);
  assert.equal(high,low);
  assert.equal(high,false);
});
