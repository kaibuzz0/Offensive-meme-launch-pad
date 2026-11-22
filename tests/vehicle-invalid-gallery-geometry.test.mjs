import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoxelVehicleCollision} from '../city-voxel-vehicle-collision.js';

const vehicle = {heading:0};
const position = {x:0,y:2,z:0};
function world(gallery) {
  return {
    surfaceAt: () => ({height:1}),
    caveRoomAt: () => gallery,
    gateRoad: {obstructs: () => false},
    editObstructs: () => false
  };
}

test('vehicle rejects inverted and zero-height cave galleries regardless of rendering detail', () => {
  for (const detail of ['low','high']) {
    for (const gallery of [
      {floor:2,ceiling:2,exposed:true},
      {floor:3,ceiling:2,exposed:true},
      {floor:3,ceiling:2,exposed:false}
    ]) {
      const collision = createVoxelVehicleCollision({...world(gallery),renderDetail:detail});
      assert.equal(collision.canOccupy(position,vehicle),false);
    }
  }
});

test('vehicle accepts a valid exposed cave floor when other world collision is clear', () => {
  const collision=createVoxelVehicleCollision(world({floor:2,ceiling:6,exposed:true}));
  assert.equal(collision.canOccupy(position,vehicle),true);
});
