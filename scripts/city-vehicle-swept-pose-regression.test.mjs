import test from 'node:test';
import assert from 'node:assert/strict';
import {createVehicle,stepVehicle} from '../city-sandbox-vehicles.js';

// The swept chassis must pass interpolated poses to the shared-world adapter,
// rather than checking the destination with the starting orientation.
test('steering sweep checks intermediate chassis headings',()=>{
  const car=createVehicle('car',{x:0,y:1,z:0});
  car.speed=20;
  const headings=[];
  const next=stepVehicle(car,{steering:1},0.1,{
    canOccupy:(_position,body)=>{headings.push(body.heading);return true;}
  });
  assert.ok(headings.length>1,'sweep must probe multiple poses');
  assert.ok(headings.some(h=>h>car.heading&&h<next.heading),
    'intermediate orientation must be tested');
  assert.ok(next.position.z>car.position.z);
});

test('an ambiguous intermediate collision response stops movement and turning',()=>{
  const car=createVehicle('car',{x:0,y:1,z:0});
  car.speed=20;
  let probes=0;
  const next=stepVehicle(car,{steering:1},0.1,{
    canOccupy:()=>++probes===1?true:undefined
  });
  assert.ok(probes>=2);
  assert.deepEqual(next.position,car.position);
  assert.equal(next.heading,car.heading);
  assert.equal(next.speed,0);
});

test('collision-query exceptions stop the vehicle without mutating the input',()=>{
  const car=createVehicle('truck',{x:3,y:1,z:4});
  car.speed=12;
  const original=structuredClone(car);
  const next=stepVehicle(car,{steering:-1},1/60,{
    canOccupy:()=>{throw new Error('chunk unavailable');}
  });
  assert.deepEqual(car,original);
  assert.deepEqual(next.position,original.position);
  assert.equal(next.heading,original.heading);
  assert.equal(next.speed,0);
});
