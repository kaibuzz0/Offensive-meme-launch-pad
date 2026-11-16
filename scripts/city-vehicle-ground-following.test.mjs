import test from 'node:test';
import assert from 'node:assert/strict';
import {createVehicle, stepVehicle} from '../city-sandbox-vehicles.js';

test('vehicle follows gradual authoritative ground support without a new physics mode', () => {
  const car=createVehicle('car',{x:0,y:1,z:0});
  car.speed=8;
  const next=stepVehicle(car,{throttle:1},1/60,{
    groundHeightAt: p=>1+p.z*0.2,
    canOccupy: (p,body)=>p.y===body.position.y
  });
  assert.ok(next.position.z>0);
  assert.ok(next.position.y>1);
  assert.equal(car.position.y,1);
});

test('unknown support height fails closed and preserves position and heading', () => {
  const car=createVehicle('car',{x:0,y:1,z:0});
  car.speed=8; car.heading=0.4;
  for(const groundHeightAt of [()=>undefined,()=>{throw Error('unloaded');},()=>3]){
    const next=stepVehicle(car,{throttle:1,steering:1},1/60,{
      groundHeightAt,canOccupy:()=>true
    });
    assert.deepEqual(next.position,car.position);
    assert.equal(next.heading,car.heading);
    assert.equal(next.speed,0);
  }
});

test('downhill support follows the same deterministic sweep as uphill', () => {
  const start=createVehicle('car',{x:0,y:2,z:0});
  start.speed=9;
  const environment={
    groundHeightAt: p=>2-p.z*0.25,
    canOccupy: (p,body)=>p.y===body.position.y
  };
  const first=stepVehicle(start,{throttle:1},1/60,environment);
  const repeat=stepVehicle(start,{throttle:1},1/60,environment);
  assert.deepEqual(first,repeat);
  assert.ok(first.position.z>0);
  assert.ok(first.position.y<start.position.y);
  assert.equal(start.position.y,2);
});

test('intermediate unknown support blocks an otherwise clear vehicle endpoint', () => {
  const car=createVehicle('car',{x:0,y:1,z:0});
  car.speed=30;
  const next=stepVehicle(car,{throttle:1},1/60,{
    groundHeightAt: p=>p.z>0.20&&p.z<0.40?NaN:1,
    canOccupy:()=>true
  });
  assert.deepEqual(next.position,car.position);
  assert.equal(next.heading,car.heading);
  assert.equal(next.speed,0);
});
