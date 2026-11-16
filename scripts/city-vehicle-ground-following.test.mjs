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
