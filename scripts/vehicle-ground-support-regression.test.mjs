import test from 'node:test';
import assert from 'node:assert/strict';
import {createVehicle, stepVehicle, advanceVehicleFrame} from '../city-sandbox-vehicles.js';
import {createVoxelVehicleCollision} from '../city-voxel-vehicle-collision.js';

function slopeWorld(slope = 0.1) {
  return {
    surfaceAt: (x,z) => ({height: slope * z - 1}),
    caveRoomAt: () => null,
    gateRoad: {obstructs: () => false}
  };
}

test('vehicle climbs and descends logical slopes with the same world support at all visual details', () => {
  function drive(visualDetail) {
    const adapter = createVoxelVehicleCollision(slopeWorld(), {maxStep: 1, visualDetail});
    let vehicle = createVehicle('car');
    for (let i = 0; i < 180; i++) vehicle = stepVehicle(vehicle, {throttle: 1}, 1/60, adapter);
    assert.ok(vehicle.position.z > 1, 'must travel uphill');
    assert.ok(vehicle.position.y > 0, 'chassis must rise with terrain');
    for (let i = 0; i < 180; i++) vehicle = stepVehicle(vehicle, {throttle: -1}, 1/60, adapter);
    return vehicle;
  }
  assert.deepEqual(drive('low'), drive('high'));
});

test('unsupported and non-finite ground support cannot advance the chassis', () => {
  const vehicle = createVehicle();
  assert.throws(() => stepVehicle(vehicle, {throttle:1}, 1/60,
    {canOccupy:()=>true, groundHeightAt:()=>NaN}), /finite height/);
  assert.throws(() => advanceVehicleFrame(vehicle, {}, 0,
    {canOccupy:()=>true, groundHeightAt:null}), /groundHeightAt must be a function/);
  assert.deepEqual(vehicle.position, {x:0,y:0,z:0});
});

test('support query cannot bypass an obstructing committed edit', () => {
  const adapter = createVoxelVehicleCollision({
    ...slopeWorld(0),
    editObstructs: (x,y,z) => z > 6 && z < 7
  });
  let vehicle = createVehicle();
  for (let i = 0; i < 180; i++) vehicle = stepVehicle(vehicle, {throttle:1}, 1/60, adapter);
  assert.ok(vehicle.position.z < 7, 'committed obstacle must block forward travel');
  assert.equal(vehicle.speed, 0);
});

test('invalid cave support fails closed instead of snapping vehicle into gallery', () => {
  const adapter = createVoxelVehicleCollision({
    ...slopeWorld(0),
    caveRoomAt: () => ({floor: 2, ceiling: 2, exposed: true})
  });
  assert.ok(Number.isNaN(adapter.groundHeightAt({x:0,y:0,z:0})));
  assert.equal(adapter.canOccupy({x:0,y:0,z:0},{heading:0}),false);
});
