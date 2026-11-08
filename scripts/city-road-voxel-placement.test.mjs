import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { roadWorkbenchVoxel, placeRoadWorkbenchVoxel } from '../city-road-voxel-placement.js';

test('road x/z and vertical ground convert to quarter-metre voxel axes', () => {
  assert.deepEqual(roadWorkbenchVoxel({x:15,z:24},10),{x:60,y:41,z:96});
});
test('road workbench writes to existing journal and survives snapshot reload', () => {
  const journal=createVoxelEditJournal('fortress-seed');
  const placed=placeRoadWorkbenchVoxel(journal,{x:15,z:24},10,journal.revision);
  assert.equal(placed.changed,true);
  assert.equal(journal.get(60,41,96),'workbench');
  const restored=createVoxelEditJournal('fortress-seed',journal.snapshot());
  assert.equal(restored.get(60,41,96),'workbench');
  assert.equal(placeRoadWorkbenchVoxel(restored,{x:15,z:24},10,restored.revision).changed,false);
});
test('stale edits and invalid heights never mutate journal', () => {
  const journal=createVoxelEditJournal('fortress-seed');
  for (const height of [NaN, Infinity, '10', null, undefined]) {
    assert.throws(()=>placeRoadWorkbenchVoxel(journal,{x:15,z:24},height,0),RangeError);
    assert.equal(journal.size,0);
  }
  placeRoadWorkbenchVoxel(journal,{x:15,z:24},10,0);
  assert.throws(()=>placeRoadWorkbenchVoxel(journal,{x:16,z:24},10,0),/stale/);
  assert.equal(journal.size,1);
});

test('malformed road coordinates and journal bounds reject before any edit', () => {
  const journal = createVoxelEditJournal('fortress-seed');
  const invalid = [
    {x:'15',z:24}, {x:15,z:'24'}, {x:null,z:24},
    {x:NaN,z:24}, {x:15,z:Infinity}, {x:500001,z:24},
    {x:15,z:-500001}, {}, null
  ];
  for (const position of invalid) {
    assert.throws(() => placeRoadWorkbenchVoxel(journal,position,10,journal.revision));
    assert.equal(journal.size,0);
    assert.equal(journal.revision,0);
  }
});
