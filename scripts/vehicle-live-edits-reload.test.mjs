import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoxelVehicleCollision} from '../city-voxel-vehicle-collision.js';
import {createVehicle, stepVehicle, saveVehicle, loadVehicle} from '../city-sandbox-vehicles.js';

test('live committed edits block vehicles across save restore and visual detail', () => {
  const edits = new Set();
  const world = {
    surfaceAt: () => ({height:0}),
    gateRoad: {obstructs: () => false},
    editObstructs: (x,y,z,h) => edits.has(`${Math.floor(x)},${Math.floor(z)}`) && y < 2 && y+h > 1
  };
  const adapter = createVoxelVehicleCollision(world);
  const vehicle = createVehicle('car',{x:0,y:1,z:0});
  assert.equal(adapter.canOccupy(vehicle.position,vehicle),true);
  edits.add('0,0');
  assert.equal(adapter.canOccupy(vehicle.position,vehicle),false);
  const stopped = stepVehicle(vehicle,{throttle:1},1/60,adapter);
  assert.deepEqual(stopped.position,vehicle.position);
  edits.clear();
  assert.equal(adapter.canOccupy(vehicle.position,vehicle),true);
  const restored = loadVehicle(saveVehicle(vehicle));
  edits.add('0,0');
  for(const detail of ['low','normal','high']){
    world.detail=detail;
    assert.equal(adapter.canOccupy(restored.position,restored),false);
  }
});
