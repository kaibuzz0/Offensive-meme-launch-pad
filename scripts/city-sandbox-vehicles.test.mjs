import test from 'node:test';
import assert from 'node:assert/strict';
import {createVehicle,stepVehicle,saveVehicle,loadVehicle,VEHICLE_PRESETS,advanceVehicleFrame} from '../city-sandbox-vehicles.js';
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
   return body.heading===0; // Initial pose is clear; proposed heading is blocked.
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


test('vehicle rejects a steering footprint overlapping a wall at its origin',()=>{
 const vehicle=createVehicle('car');
 vehicle.speed=10;
 let samples=0;
 const result=stepVehicle(vehicle,{steering:1},1/60,{
  canOccupy:(position,body)=>{
   samples++;
   // The origin is clear at the original heading, but not at the proposed one.
   return !(position.x===0&&position.z===0&&body.heading!==0);
  }
 });
 assert.equal(samples,2,'initial and proposed poses are checked; translation must not run');
 assert.deepEqual(result.position,vehicle.position);
 assert.equal(result.heading,vehicle.heading);
 assert.equal(result.speed,0);
 assert.equal(vehicle.speed,10,'input state must remain unchanged');
});

test('falsy non-function vehicle occupancy adapters cannot disable collision',()=>{
 const vehicle=createVehicle('car');
 for(const invalid of [null,false,0,'']){
  assert.throws(()=>stepVehicle(vehicle,{throttle:1},1/60,{canOccupy:invalid}),/canOccupy must be a function/);
  assert.deepEqual(vehicle.position,{x:0,y:0,z:0});
 }
});

test('steering checks intermediate orientations before translating',()=>{
 const vehicle=createVehicle('car');
 vehicle.speed=32;
 const headings=[];
 const result=stepVehicle(vehicle,{steering:1},0.1,{
  canOccupy:(position,body)=>{
   if(position.x===0&&position.z===0){
    headings.push(body.heading);
    // Both endpoints are permitted; a narrow obstruction lies mid-rotation.
    return !(body.heading>0.15&&body.heading<0.35);
   }
   return true;
  }
 });
 assert.ok(headings.length>2,'intermediate steering footprints must be queried');
 assert.deepEqual(result.position,vehicle.position);
 assert.equal(result.heading,vehicle.heading);
 assert.equal(result.speed,0);
 assert.equal(vehicle.speed,32,'caller state remains unchanged');
});


test('embedded initial vehicle footprint cannot steer or translate out through solid geometry',()=>{
 const vehicle=createVehicle('truck',{x:4,y:0,z:6});
 vehicle.speed=15;
 const queried=[];
 const result=stepVehicle(vehicle,{throttle:1,steering:1},1/60,{
  requireCollision:true,
  canOccupy:(position,body)=>{
   queried.push({position:{...position},heading:body.heading});
   return body.heading!==vehicle.heading; // Only the original embedded pose is blocked.
  }
 });
 assert.equal(queried.length,1,'must reject before attempting a different heading');
 assert.deepEqual(result.position,vehicle.position);
 assert.equal(result.heading,vehicle.heading);
 assert.equal(result.speed,0);
 assert.equal(vehicle.speed,15,'caller state is not mutated');
});


test('bounded vehicle frame catch-up matches explicit fixed steps',()=>{
 const start=createVehicle('car');
 const env={requireCollision:true,canOccupy:()=>true};
 const result=advanceVehicleFrame(start,{throttle:1},0.5,env,{remainder:0},{step:1/60,maxSteps:4});
 let manual=start;
 for(let i=0;i<4;i++) manual=stepVehicle(manual,{throttle:1},1/60,env);
 assert.deepEqual(result.vehicle,manual);
 assert.equal(result.steps,4);
 assert.ok(result.droppedSeconds>0.43);
 assert.ok(result.clock.remainder>=0&&result.clock.remainder<1/60);
 assert.deepEqual(start.position,{x:0,y:0,z:0});
});

test('frame remainder accumulates small frames without changing visual-detail physics',()=>{
 const run=visualDetail=>{
  let state={vehicle:createVehicle(),clock:{remainder:0}};
  for(let i=0;i<12;i++) state=advanceVehicleFrame(state.vehicle,{throttle:1},1/120,
   {requireCollision:true,visualDetail,canOccupy:()=>true},state.clock);
  return state;
 };
 assert.deepEqual(run('low'),run('high'));
 assert.equal(run('low').steps,1);
});

test('invalid frame scheduler settings fail before simulation',()=>{
 const vehicle=createVehicle();
 for(const seconds of [-1,NaN,Infinity]) assert.throws(()=>advanceVehicleFrame(vehicle,{},seconds),/frameSeconds/);
 assert.throws(()=>advanceVehicleFrame(vehicle,{},0,{}, {remainder:-1}),/remainder/);
 assert.throws(()=>advanceVehicleFrame(vehicle,{},0,{}, {},{maxSteps:0}),/maxSteps/);
 assert.throws(()=>advanceVehicleFrame(vehicle,{},0,{}, {},{step:0}),/step/);
});
