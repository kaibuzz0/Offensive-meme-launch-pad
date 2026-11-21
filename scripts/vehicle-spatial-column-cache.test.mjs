import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoxelVehicleCollision} from '../city-voxel-vehicle-collision.js';

test('vehicle occupancy reuses static voxel columns but rechecks committed edits', () => {
  let surfaceQueries = 0, caveQueries = 0, editQueries = 0;
  const world = {
    surfaceAt(x,z) { surfaceQueries++; return {height:0}; },
    caveRoomAt(x,z) { caveQueries++; return null; },
    gateRoad: {obstructs(){return false;}},
    editObstructs(){editQueries++; return false;}
  };
  const adapter = createVoxelVehicleCollision(world,{radius:0.1,halfLength:0.1,maxStep:1});
  const pose = {x:3.5,y:1,z:4.5};
  assert.equal(adapter.canOccupy(pose,{heading:0}),true);
  assert.equal(surfaceQueries,1);
  assert.equal(caveQueries,1);
  assert.equal(editQueries,15);
  assert.equal(adapter.canOccupy(pose,{heading:0}),true);
  assert.equal(surfaceQueries,2,'cache must not persist between occupancy queries');
  assert.equal(editQueries,30,'dynamic committed edits must never be cached');
});

test('vehicle occupancy observes an edit committed between calls', () => {
  let blocked=false;
  const world={surfaceAt(){return {height:0};},gateRoad:{obstructs(){return false;}},editObstructs(){return blocked;}};
  const adapter=createVoxelVehicleCollision(world,{radius:0.1,halfLength:0.1});
  const position={x:2.5,y:1,z:2.5},vehicle={heading:0};
  assert.equal(adapter.canOccupy(position,vehicle),true);
  blocked=true;
  assert.equal(adapter.canOccupy(position,vehicle),false);
});
