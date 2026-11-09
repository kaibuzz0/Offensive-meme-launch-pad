import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../city-voxel-physics.js',import.meta.url),'utf8');
const sandbox={};vm.runInNewContext(source,sandbox);
const make=sandbox.CityVoxelPhysics.createController;
const near={x:0,y:2,z:0,w:2,h:1,d:2,solid:true};
const far=Array.from({length:200},(_,i)=>({x:100+i*3,y:2,z:100,w:2,h:1,d:2,solid:true}));
function world(indexed){
 const parts=[near,...far];
 const gateRoad={parts,obstructs:()=>false};
 if(indexed)gateRoad.queryParts=(minX,minZ,maxX,maxZ)=>parts.filter(p=>p.x<maxX&&p.x+p.w>minX&&p.z<maxZ&&p.z+p.d>minZ);
 return {PLAYER_HEIGHT:1.8,SEA_LEVEL:-100,surfaceAt:()=>({height:0}),gateRoad};
}
test('local structure broadphase preserves movement and reduces candidate scans',()=>{
 const full=make(world(false),{x:0.5,z:0.5,y:3});
 const local=make(world(true),{x:0.5,z:0.5,y:3});
 const inputs=[{forward:1,yaw:0},{right:1,yaw:0},{jump:true},{forward:1,yaw:1}];
 let fullCandidates=0,localCandidates=0;
 for(const input of inputs){
  const a=full.tickFrame(input,1/30),b=local.tickFrame(input,1/30);
  assert.deepEqual({...a.state},{...b.state});
  fullCandidates+=a.structureCandidates;
  localCandidates+=b.structureCandidates;
 }
 assert.ok(localCandidates<fullCandidates,{localCandidates,fullCandidates});
});
test('invalid optional query result falls back to complete geometry',()=>{
 const w=world(false);
 w.gateRoad.queryParts=()=>null;
 const fallback=make(w,{x:0.5,z:0.5,y:3});
 const full=make(world(false),{x:0.5,z:0.5,y:3});
 assert.deepEqual({...fallback.tickFrame({forward:1},1/30).state},{...full.tickFrame({forward:1},1/30).state});
});
