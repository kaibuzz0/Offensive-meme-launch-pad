import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const sandbox={};
vm.runInNewContext(readFileSync(new URL('../city-voxel-physics.js',import.meta.url),'utf8'),sandbox);
const create=sandbox.CityVoxelPhysics.createController;
const roof={x:0,y:3,z:0,w:4,h:1,d:4,solid:true};
const distant=Array.from({length:240},(_,i)=>({x:100+i*4,y:3,z:100,w:2,h:1,d:2,solid:true}));
function makeWorld(indexed){
 const parts=[roof,...distant];
 const gateRoad={parts,obstructs:()=>false};
 if(indexed)gateRoad.queryParts=(minX,minZ,maxX,maxZ)=>parts.filter(p=>p.x<maxX&&p.x+p.w>minX&&p.z<maxZ&&p.z+p.d>minZ);
 return {PLAYER_HEIGHT:1.8,SEA_LEVEL:-100,surfaceAt:()=>({height:0}),gateRoad};
}
test('local broadphase preserves elevated roof spawn and teleport support',()=>{
 const full=create(makeWorld(false),{x:1,z:1,y:4});
 const indexed=create(makeWorld(true),{x:1,z:1,y:4});
 assert.deepEqual({...indexed.snapshot()},{...full.snapshot()});
 assert.equal(indexed.snapshot().y,4);
 for(const controller of [full,indexed]){
  assert.equal(controller.teleport(2,2,4),true);
  assert.equal(controller.snapshot().y,4);
 }
 for(const input of [{forward:1},{right:1},{jump:true},{}]){
  const a=full.tickFrame(input,1/30),b=indexed.tickFrame(input,1/30);
  assert.deepEqual({...a.state},{...b.state});
  assert.ok(b.structureCandidates<a.structureCandidates,
   'local roof queries should inspect fewer structural parts');
 }
});
test('local broadphase never promotes ordinary ground spawn to an overhead roof',()=>{
 const full=create(makeWorld(false),{x:1,z:1});
 const indexed=create(makeWorld(true),{x:1,z:1});
 assert.deepEqual({...indexed.snapshot()},{...full.snapshot()});
 assert.equal(indexed.snapshot().y,1);
 assert.equal(indexed.teleport(2,2),true);
 assert.equal(indexed.snapshot().y,1);
});
