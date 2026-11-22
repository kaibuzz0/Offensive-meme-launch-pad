import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoxelVehicleCollision} from '../city-voxel-vehicle-collision.js';

const world = {
  surfaceAt: () => ({height: -1}),
  gateRoad: {obstructs: () => false},
  caveRoomAt: () => null
};
const vehicle = {heading: 0};
const position = {x: 0, y: 0, z: 0};

test('committed edit obstacles block chassis occupancy independent of visual detail', () => {
  const edits = (x, y, z, height) => z > 1 && z < 3 && y === 0 && height === 2.2;
  const low = createVoxelVehicleCollision(world, {editObstructs: edits, visualDetail: 'low'});
  const high = createVoxelVehicleCollision(world, {editObstructs: edits, visualDetail: 'high'});
  assert.equal(low.canOccupy(position, vehicle), false);
  assert.equal(high.canOccupy(position, vehicle), false);
  assert.equal(createVoxelVehicleCollision(world).canOccupy(position, vehicle), true);
});

test('malformed edit collision adapters fail closed', () => {
  assert.throws(() => createVoxelVehicleCollision(world, {editObstructs: null}), /editObstructs must be a function/);
  for (const invalid of [undefined, null, 0, 'solid']) {
    const collision = createVoxelVehicleCollision(world, {editObstructs: () => invalid});
    assert.throws(() => collision.canOccupy(position, vehicle), /editObstructs must return a boolean/);
  }
});

test('retained vehicle adapter observes replaced committed-edit ledger after reload', () => {
  const mutableWorld = {...world, editObstructs: () => false};
  const adapter = createVoxelVehicleCollision(mutableWorld);
  assert.equal(adapter.canOccupy(position, vehicle), true);
  mutableWorld.editObstructs = (_x, _y, z) => z > 1 && z < 3;
  assert.equal(adapter.canOccupy(position, vehicle), false, 'reloaded wall blocks without rebuilding adapter');
  mutableWorld.editObstructs = () => false;
  assert.equal(adapter.canOccupy(position, vehicle), true, 'removed wall clears without rebuilding adapter');
  mutableWorld.editObstructs = null;
  assert.throws(() => adapter.canOccupy(position, vehicle), /editObstructs must be a function/);
});

test('explicit authoritative edit override stays pinned across world ledger replacement', () => {
  const mutableWorld = {...world, editObstructs: () => false};
  const adapter = createVoxelVehicleCollision(mutableWorld, {editObstructs: () => true});
  mutableWorld.editObstructs = () => false;
  assert.equal(adapter.canOccupy(position, vehicle), false);
});
