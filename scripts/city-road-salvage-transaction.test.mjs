import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { salvageRoadSupplies } from '../city-road-salvage-transaction.js';
import { buildWorkbenchState } from '../city-road-build-transaction.js';

function fresh() {
  return {version:1,seed:'salvage-regression',revision:0,
    inventory:{supplies:0},journal:createVoxelEditJournal('salvage-regression').snapshot()};
}
const crate={x:20,y:4,z:20};
const player={x:5.125,y:1.125,z:5.125};

test('salvage grants exactly eight supplies and a persistent pickup marker',()=>{
  const initial=fresh();
  const next=salvageRoadSupplies(initial,{player,crate,expectedRevision:0});
  assert.equal(initial.inventory.supplies,0);
  assert.equal(next.inventory.supplies,8);
  assert.equal(next.revision,1);
  assert.equal(next.journal.revision,1);
  assert.deepEqual(next.journal.edits,[{...crate,block:'salvaged-crate'}]);
  assert.throws(()=>salvageRoadSupplies(next,{player,crate,expectedRevision:1}),/already collected/);
  assert.throws(()=>salvageRoadSupplies(next,{player,crate,expectedRevision:0}),/stale/);
});

test('failed distant pickup does not change the record',()=>{
  const initial=fresh();
  assert.throws(()=>salvageRoadSupplies(initial,{
    player:{x:100,y:100,z:100},crate,expectedRevision:0
  }),/out of reach/);
  assert.equal(initial.revision,0);
  assert.equal(initial.journal.edits.length,0);
});

test('salvaged supplies can be consumed by the existing atomic workbench reducer',()=>{
  const salvaged=salvageRoadSupplies(fresh(),{player,crate,expectedRevision:0});
  const built=buildWorkbenchState(salvaged,{
    kind:'place-workbench',expectedRevision:1,player,
    position:{x:5.5,z:5.5},groundHeight:1,
    isOccupied:()=>false
  });
  assert.equal(built.inventory.supplies,0);
  assert.equal(built.revision,2);
  assert.equal(built.journal.edits.length,2);
});
