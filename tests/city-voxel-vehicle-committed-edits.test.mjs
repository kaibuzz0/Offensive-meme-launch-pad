import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoxelVehicleCollision} from '../city-voxel-vehicle-collision.js';

const makeWorld = () => ({
  surfaceAt: () => ({height: 0}),
  gateRoad: {obstructs: () => false},
  editObstructs: () => true,
});
const position = {x: 0, y: 1, z: 0};
const vehicle = {heading: 0};

test('vehicle occupancy uses canonical committed edits by default', () => {
  const world = makeWorld();
  const adapter = createVoxelVehicleCollision(world);
  assert.equal(adapter.requireCollision, true);
  assert.equal(adapter.canOccupy(position, vehicle), false);
  world.editObstructs = () => false;
  assert.equal(adapter.canOccupy(position, vehicle), false,
    'adapter must retain its validated collision source');
});

test('explicit authoritative edit callback overrides world callback', () => {
  const adapter = createVoxelVehicleCollision(makeWorld(), {editObstructs: () => false});
  assert.equal(adapter.canOccupy(position, vehicle), true);
});

test('invalid canonical edit callback is rejected', () => {
  assert.throws(() => createVoxelVehicleCollision({...makeWorld(), editObstructs: 1}), TypeError);
  const adapter = createVoxelVehicleCollision({...makeWorld(), editObstructs: () => undefined});
  assert.throws(() => adapter.canOccupy(position, vehicle), TypeError);
});

test('render detail cannot change committed-edit occupancy', () => {
  for (const detail of ['low', 'normal', 'high']) {
    const world = {...makeWorld(), detail};
    assert.equal(createVoxelVehicleCollision(world).canOccupy(position, vehicle), false);
  }
});
