import test from 'node:test';
import assert from 'node:assert/strict';
import {createVehicle,stepVehicle,saveVehicle,loadVehicle,VEHICLE_PRESETS} from '../city-sandbox-vehicles.js';
test('car and truck presets initialize independently',()=>{
 for(const type of Object.keys(VEHICLE_PRESETS)){const v=createVehicle(type);assert.equal(v.type,type);assert.equal(v.fuel,VEHICLE_PRESETS[type].fuelCapacity);assert.deepEqual(v.position,{x:0,y:0,z:0});}
});
test('fixed-step drive is deterministic and steering changes trajectory',()=>{
 const drive=()=>{let v=createVehicle();for(let i=0;i<120;i++)v=stepVehicle(v,{throttle:1,steering:.2},1/60);return v;};
 assert.deepEqual(drive(),drive());assert.ok(drive().position.x>0);assert.ok(drive().position.z>0);
});
test('braking stops without unintended reverse',()=>{
 let v=createVehicle();for(let i=0;i<60;i++)v=stepVehicle(v,{throttle:1},1/60);
 const speed=v.speed;for(let i=0;i<120;i++)v=stepVehicle(v,{brake:1},1/60);
 assert.ok(v.speed<speed);assert.equal(v.speed,0);
});
test('blocked terrain rejects penetration',()=>{
 let v=createVehicle();for(let i=0;i<60;i++)v=stepVehicle(v,{throttle:1},1/60,{canOccupy:p=>p.z<=1});
 assert.ok(v.position.z<=1);assert.equal(v.speed,0);
});
test('versioned saves round-trip and reject invalid records',()=>{
 let v=stepVehicle(createVehicle('truck',{x:2,y:1,z:3}),{throttle:1},1/60);v.driverId='player-1';
 assert.deepEqual(loadVehicle(saveVehicle(v)),v);
 assert.throws(()=>loadVehicle({...v,version:999}),/Unsupported/);
 assert.throws(()=>loadVehicle({...v,position:{...v.position,x:Infinity}}),/finite/);
});
test('invalid timestep and controls rejected',()=>{
 assert.throws(()=>stepVehicle(createVehicle(),{},0),/dt/);
 assert.throws(()=>stepVehicle(createVehicle(),{},.2),/dt/);
 assert.throws(()=>stepVehicle(createVehicle(),{throttle:NaN}),/finite/);
});

test('fast vehicle cannot tunnel through a quarter-meter wall between endpoints',()=>{
 let v=createVehicle('car');
 v.speed=32;
 const checked=[];
 const wall=0.3;
 v=stepVehicle(v,{throttle:0},0.1,{canOccupy:p=>{checked.push(p.z);return p.z<wall;}});
 assert.ok(checked.length>1,'collision must sample intermediate positions');
 assert.ok(v.position.z<wall,'vehicle must stop before the wall');
 assert.equal(v.speed,0);
});
test('vehicle collision remains identical across visual-detail settings',()=>{
 const run=visualDetail=>{
  let v=createVehicle('car');
  v.speed=20;
  for(let i=0;i<5;i++)v=stepVehicle(v,{throttle:1},1/60,{
   visualDetail,canOccupy:p=>p.z<0.75
  });
  return v;
 };
 assert.deepEqual(run('low'),run('high'));
});

test('swept vehicle collision uses proposed heading and rejects blocked rotation',()=>{
 const v=createVehicle('car');
 v.speed=12;
 const before={...v.position};
 const result=stepVehicle(v,{steering:1},1/60,{
  canOccupy:(position,body)=>{
   assert.ok(Number.isFinite(body.heading));
   assert.notEqual(body.heading,0,'oriented collision must see proposed heading');
   return false;
  }
 });
 assert.deepEqual(result.position,before);
 assert.equal(result.heading,v.heading,'blocked first sweep must preserve original orientation');
 assert.equal(result.speed,0);
});
test('invalid vehicle collision callback fails closed',()=>{
 assert.throws(()=>stepVehicle(createVehicle(),{throttle:1},1/60,{canOccupy:true}),/canOccupy must be a function/);
});

test('vehicle occupancy adapter must return an explicit boolean',()=>{
 const vehicle=createVehicle('car');
 vehicle.speed=12;
 for(const invalid of [undefined,null,0,1,'yes']){
  assert.throws(()=>stepVehicle(vehicle,{},1/60,{canOccupy:()=>invalid}),/canOccupy must return a boolean/);
  assert.deepEqual(vehicle.position,{x:0,y:0,z:0},'invalid query must not mutate caller state');
 }
 assert.equal(stepVehicle(vehicle,{},1/60,{canOccupy:()=>false}).speed,0);
});
