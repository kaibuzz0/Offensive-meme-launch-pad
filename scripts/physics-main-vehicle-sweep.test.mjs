import test from 'node:test';
import assert from 'node:assert/strict';
import {createVehicle,stepVehicle} from '../city-sandbox-vehicles.js';

test('vehicle sweep cannot tunnel through a quarter-meter obstacle between endpoints',()=>{
  const car=createVehicle('car',{x:0,y:0,z:0});
  car.speed=30;
  car.driverId='solo';
  const sampled=[];
  const next=stepVehicle(car,{throttle:0,steering:0},0.1,{
    canOccupy(position){
      sampled.push(position.z);
      return !(position.z>=1 && position.z<=1.25);
    }
  });
  assert.ok(sampled.length>2,'collision sweep must sample intermediate positions');
  assert.equal(next.position.z,0,'blocked vehicle must not pass through the wall');
  assert.equal(next.speed,0);
});

test('same swept vehicle path and collision under different visual detail',()=>{
  const initial=createVehicle('car',{x:0,y:0,z:0});
  initial.speed=30;
  const run=detail=>stepVehicle(initial,{},0.1,{
    visualDetail:detail,
    canOccupy(position){return position.z<1;}
  });
  assert.deepEqual(run('low'),run('high'));
});

test('clear path moves the vehicle with bounded collision query count',()=>{
  const initial=createVehicle('car',{x:0,y:0,z:0});
  initial.speed=30;
  let queries=0;
  const result=stepVehicle(initial,{},0.1,{
    canOccupy(){queries++;return true;}
  });
  assert.ok(result.position.z>0);
  assert.ok(queries<=13,`unexpected collision query count: ${queries}`);
});

test('steering sweep checks intermediate rotated chassis orientation',()=>{
  const car=createVehicle('car',{x:0,y:0,z:0});
  car.speed=30;
  const headings=[];
  const result=stepVehicle(car,{steering:1},0.1,{
    canOccupy(_position,vehicle){
      headings.push(vehicle.heading);
      return headings.length<3;
    }
  });
  assert.ok(headings.length>=3,'sweep must reach a later collision sample');
  assert.ok(headings.every(h=>h>0),'occupancy must receive swept orientation');
  assert.ok(headings[1]>headings[0],'orientation must advance between sweep samples');
  assert.equal(result.position.z,0);
  assert.equal(result.speed,0);
});

test('swept steering follows the shortest heading arc across the pi boundary',()=>{
  const car=createVehicle('car',{x:0,y:0,z:0});
  car.heading=Math.PI-0.01;
  car.speed=30;
  const headings=[];
  stepVehicle(car,{steering:1},0.1,{
    canOccupy(_position,vehicle){headings.push(vehicle.heading);return true;}
  });
  assert.ok(headings.length>2);
  // A wrapped destination near -pi must not rotate the collision hull through zero.
  assert.ok(headings.every(h=>Math.abs(h)>3),'intermediate heading must remain near the pi seam');
});
