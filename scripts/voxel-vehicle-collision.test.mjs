import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelVehicleCollision } from '../city-voxel-vehicle-collision.js';
import { createVehicle, stepVehicle } from '../city-sandbox-vehicles.js';

function world({height=0, obstacle=()=>false, cave=()=>null}={}) {
  return {surfaceAt:(x,z)=>({height:typeof height==='function'?height(x,z):height}),
    gateRoad:{obstructs:obstacle},caveRoomAt:cave};
}
test('vehicle occupancy uses canonical terrain and structure independent of visual LOD',()=>{
  const adapter=createVoxelVehicleCollision(world({obstacle:(x,y,z)=>z>3}));
  const v=createVehicle('car',{x:0,y:1,z:0});
  assert.equal(adapter.canOccupy(v.position,v),true);
  assert.equal(adapter.canOccupy({x:0,y:1,z:3},v),false);
  assert.equal(adapter.requireCollision,true);
  assert.ok(Number.isFinite(stepVehicle(v,{throttle:1},1/60,adapter).position.z));
});
test('rejects slopes, headroom and missing canonical structure query',()=>{
  assert.throws(()=>createVoxelVehicleCollision({surfaceAt:()=>({height:0})}),/structure/);
  const v=createVehicle('car',{x:0,y:1,z:0});
  assert.equal(createVoxelVehicleCollision(world({height:(x)=>x>0?4:0})).canOccupy(v.position,v),false);
  assert.equal(createVoxelVehicleCollision(world({cave:()=>({exposed:false,ceiling:2})})).canOccupy(v.position,v),false);
});
test('turning the chassis detects side obstacles and malformed coordinates',()=>{
  const adapter=createVoxelVehicleCollision(world({obstacle:(x)=>x>2}));
  const v=createVehicle('car',{x:0,y:1,z:0});
  assert.equal(adapter.canOccupy(v.position,v),true);
  assert.equal(adapter.canOccupy(v.position,{...v,heading:Math.PI/2}),false);
  assert.equal(adapter.canOccupy({x:NaN,y:1,z:0},v),false);
});

test('malformed structure occupancy cannot silently permit vehicle movement',()=>{
  const vehicle=createVehicle('car',{x:0,y:1,z:0});
  for (const invalid of [undefined,null,0,1,'false',{},NaN]) {
    const adapter=createVoxelVehicleCollision(world({obstacle:()=>invalid}));
    assert.throws(()=>adapter.canOccupy(vehicle.position,vehicle),/gateRoad\.obstructs must return a boolean/);
    assert.throws(()=>stepVehicle(vehicle,{throttle:1},1/60,adapter),/gateRoad\.obstructs must return a boolean/);
  }
  assert.equal(createVoxelVehicleCollision(world({obstacle:()=>false})).canOccupy(vehicle.position,vehicle),true);
  assert.equal(createVoxelVehicleCollision(world({obstacle:()=>true})).canOccupy(vehicle.position,vehicle),false);
});
