import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoxelEditJournal} from '../city-sandbox-mining.js';
import {buildWorkbenchState} from '../city-road-build-transaction.js';
const seed='fortress-seed';
const original=()=>({version:1,seed,revision:0,inventory:{supplies:8},journal:createVoxelEditJournal(seed).snapshot()});
const action={kind:'place-workbench',expectedRevision:0,player:{x:15,z:24},position:{x:15,z:24},groundHeight:10,isOccupied:()=>false};
test('one transition debits supplies and writes persistent voxel',()=>{
 const before=original(),after=buildWorkbenchState(before,action);
 assert.equal(before.inventory.supplies,8);
 assert.equal(after.inventory.supplies,0);
 assert.equal(createVoxelEditJournal(seed,after.journal).get(60,41,96),'workbench');
 assert.equal(createVoxelEditJournal(seed,JSON.parse(JSON.stringify(after)).journal).get(60,41,96),'workbench');
 assert.throws(()=>buildWorkbenchState(after,action),/stale/);
});
test('invalid reach, insufficient resources and occupied voxels leave input untouched',()=>{
 const before=original(),snapshot=JSON.stringify(before);
 assert.throws(()=>buildWorkbenchState(before,{...action,player:{x:100,z:100}}),/reach/);
 assert.throws(()=>buildWorkbenchState({...before,inventory:{supplies:7}},action),/insufficient/);
 const occupied=createVoxelEditJournal(seed);occupied.apply({x:60,y:41,z:96,block:'stone'});
 assert.throws(()=>buildWorkbenchState({...before,revision:1,journal:occupied.snapshot()},{...action,expectedRevision:1}),/occupied/);
 assert.equal(JSON.stringify(before),snapshot);
});

test('generated terrain occupancy must be queried and empty before spending',()=>{
 const before=original(), snapshot=JSON.stringify(before);
 assert.throws(()=>buildWorkbenchState(before,{...action,isOccupied:undefined}),/occupancy query required/);
 assert.throws(()=>buildWorkbenchState(before,{...action,isOccupied:()=>true}),/occupied voxel/);
 assert.throws(()=>buildWorkbenchState(before,{...action,isOccupied:()=>undefined}),/occupied voxel/);
 assert.equal(JSON.stringify(before),snapshot);
});

test('divergent inventory and journal revisions cannot spend resources',()=>{
 const before=original();
 const changed=createVoxelEditJournal(seed);
 changed.apply({x:1,y:1,z:1,block:'stone'});
 const mismatched={...before,journal:changed.snapshot()};
 const snapshot=JSON.stringify(mismatched);
 assert.throws(()=>buildWorkbenchState(mismatched,action),/revision mismatch/);
 assert.equal(JSON.stringify(mismatched),snapshot);
 const inverse={...before,revision:1};
 assert.throws(()=>buildWorkbenchState(inverse,{...action,expectedRevision:1}),/revision mismatch/);
});

test('rejects mismatched world seed and malformed journal without spending',()=>{
 const before=original(), snapshot=JSON.stringify(before);
 const other=createVoxelEditJournal('different-seed').snapshot();
 assert.throws(()=>buildWorkbenchState({...before,journal:other},action),/incompatible voxel edit snapshot/);
 const corrupted={...before,journal:{...before.journal,edits:[{x:0,y:0,z:0,block:'__proto__'}]}};
 assert.throws(()=>buildWorkbenchState(corrupted,action),/material/);
 assert.equal(JSON.stringify(before),snapshot);
});

test('failed occupancy query cannot debit supplies or commit an edit',()=>{
 const before=original(), snapshot=JSON.stringify(before);
 assert.throws(()=>buildWorkbenchState(before,{...action,isOccupied:()=>{throw new Error('terrain chunk unavailable');}}),/terrain chunk unavailable/);
 assert.throws(()=>buildWorkbenchState(before,{...action,isOccupied:()=>Promise.resolve(false)}),/occupied voxel/);
 assert.equal(JSON.stringify(before),snapshot);
});
