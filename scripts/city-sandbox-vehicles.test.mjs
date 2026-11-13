import test from 'node:test';
import assert from 'node:assert/strict';
import {createVehicle,stepVehicle,saveVehicle,loadVehicle,VEHICLE_PRESETS} from '../city-sandbox-vehicles.js';
const clearWorld={canOccupy:()=>true};
test('car and truck presets initialize independently',()=>{
 for(const type of Object.keys(VEHICLE_PRESETS)){const v=createVehicle(type);assert.equal(v.type,type);assert.equal(v.fuel,VEHICLE_PRESETS[type].fuelCapacity);assert.deepEqual(v.position,{x:0,y:0,z:0});}
});
test('fixed-step drive is deterministic and steering changes trajectory',()=>{
 const drive=()=>{let v=createVehicle();for(let i=0;i<120;i++)v=stepVehicle(v,{throttle:1,steering:.2},1/60,clearWorld);return v;};
 assert.deepEqual(drive(),drive());assert.ok(drive().position.x>0);assert.ok(drive().position.z>0);
});
test('braking stops without unintended reverse',()=>{
 let v=createVehicle();for(let i=0;i<60;i++)v=stepVehicle(v,{throttle:1},1/60,clearWorld);
 const speed=v.speed;for(let i=0;i<120;i++)v=stepVehicle(v,{brake:1},1/60,clearWorld);
 assert.ok(v.speed<speed);assert.equal(v.speed,0);
});
test('blocked terrain rejects penetration',()=>{
 let v=createVehicle();for(let i=0;i<60;i++)v=stepVehicle(v,{throttle:1},1/60,{canOccupy:p=>p.z<=1});
 assert.ok(v.position.z<=1);assert.equal(v.speed,0);
});
test('versioned saves round-trip and reject invalid records',()=>{
 let v=stepVehicle(createVehicle('truck',{x:2,y:1,z:3}),{throttle:1},1/60,clearWorld);v.driverId='player-1';
 assert.deepEqual(loadVehicle(saveVehicle(v)),v);
 assert.throws(()=>loadVehicle({...v,version:999}),/Unsupported/);
 assert.throws(()=>loadVehicle({...v,position:{...v.position,x:Infinity}}),/finite/);
});
test('invalid timestep and controls rejected',()=>{
 assert.throws(()=>stepVehicle(createVehicle(),{},0,clearWorld),/dt/);
 assert.throws(()=>stepVehicle(createVehicle(),{},.2,clearWorld),/dt/);
 assert.throws(()=>stepVehicle(createVehicle(),{throttle:NaN},1/60,clearWorld),/finite/);
});

test('vehicle movement fails closed without a canonical collision query',()=>{
 const v=createVehicle();
 assert.throws(()=>stepVehicle(v,{throttle:1},1/60),/collision predicate required/);
 assert.throws(()=>stepVehicle(v,{throttle:1},1/60,{canOccupy:true}),/collision predicate required/);
 assert.deepEqual(v,createVehicle());
});
test('blocked steering cannot rotate vehicle through an obstacle',()=>{
 let v=createVehicle();
 v=stepVehicle(v,{throttle:1,steering:1},1/60,{canOccupy:()=>false});
 assert.deepEqual(v.position,{x:0,y:0,z:0});
 assert.equal(v.heading,0);
 assert.equal(v.speed,0);
});
