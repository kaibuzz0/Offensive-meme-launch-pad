import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoxelEditJournal} from '../city-sandbox-mining.js';
import {buildWorkbenchState} from '../city-road-build-transaction.js';
const seed='fortress-seed';
const original=()=>({version:1,seed,revision:0,inventory:{supplies:8},journal:createVoxelEditJournal(seed).snapshot()});
const action={kind:'place-workbench',expectedRevision:0,player:{x:15,z:24},position:{x:15,z:24},groundHeight:10};
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
 assert.throws(()=>buildWorkbenchState({...before,journal:occupied.snapshot()},action),/occupied/);
 assert.equal(JSON.stringify(before),snapshot);
});
