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

test('vehicle sweep cannot tunnel through a quarter-meter obstacle at speed',()=>{
 let v=createVehicle();
 v.speed=32;
 const wall={canOccupy:p=>p.z<0.12||p.z>0.38};
 const next=stepVehicle(v,{throttle:1},0.1,wall);
 assert.deepEqual(next.position,v.position);
 assert.equal(next.heading,v.heading);
 assert.equal(next.speed,0);
});
test('vehicle sweep uses bounded local probes and preserves clear-road travel',()=>{
 let v=createVehicle();
 v.speed=32;
 const samples=[];
 const next=stepVehicle(v,{},0.1,{canOccupy:p=>{samples.push(p);return true;}});
 assert.ok(samples.length>1 && samples.length<=16);
 assert.ok(samples.every(p=>p.z>=v.position.z&&p.z<=next.position.z));
 assert.ok(next.position.z>v.position.z);
});

test('steering sweep exposes interpolated chassis heading and position to collision adapter',()=>{
 const v=createVehicle();v.speed=32;
 const seen=[];
 const next=stepVehicle(v,{steering:1},0.1,{canOccupy:(point,chassis)=>{
   seen.push({point,heading:chassis.heading,position:chassis.position});
   return true;
 }});
 assert.ok(seen.length>1);
 assert.ok(seen[0].heading>v.heading);
 assert.ok(seen[0].heading<next.heading);
 assert.equal(seen.at(-1).heading,next.heading);
 assert.deepEqual(seen.at(-1).position,next.position);
 assert.ok(seen.every(s=>s.point===s.position));
});
test('steering sweep rejects an intermediate oriented chassis obstruction',()=>{
 const v=createVehicle();v.speed=32;
 const next=stepVehicle(v,{steering:1},0.1,{canOccupy:(_point,chassis)=>chassis.heading<0.1});
 assert.deepEqual(next.position,v.position);
 assert.equal(next.heading,v.heading);
 assert.equal(next.speed,0);
});
test('vehicle collision adapter must explicitly accept each probe',()=>{
 const v=createVehicle();v.speed=4;
 const next=stepVehicle(v,{},1/60,{canOccupy:()=>({clear:true})});
 assert.deepEqual(next.position,v.position);
 assert.equal(next.speed,0);
});

test('tight steering samples the swept chassis arc, not only center travel',()=>{
 const v=createVehicle('truck');v.speed=24;
 const headings=[];
 const next=stepVehicle(v,{steering:1},0.1,{canOccupy:(_p,chassis)=>{
   headings.push(chassis.heading);return true;
 }});
 const translation=Math.hypot(next.position.x-v.position.x,next.position.z-v.position.z);
 assert.ok(headings.length>Math.ceil(translation/0.25));
 assert.equal(headings.at(-1),next.heading);
});

test('steering chassis arc detects obstruction between center-only probes',()=>{
 const v=createVehicle('truck');v.speed=24;
 const next=stepVehicle(v,{steering:1},0.1,{canOccupy:(_p,chassis)=>
   !(chassis.heading>0.015&&chassis.heading<0.025)
 });
 assert.deepEqual(next.position,v.position);
 assert.equal(next.heading,v.heading);
 assert.equal(next.speed,0);
});
