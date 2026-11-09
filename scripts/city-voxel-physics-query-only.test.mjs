import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const sandbox={};
vm.runInNewContext(readFileSync(new URL('../city-voxel-physics.js',import.meta.url),'utf8'),sandbox);
const create=sandbox.CityVoxelPhysics.createController;
const roof={x:0,y:2,z:0,w:4,h:1,d:4,solid:true};
function makeWorld(queryOnly){
 const gateRoad={obstructs:()=>false,queryParts:(minX,minZ,maxX,maxZ)=>
  roof.x<maxX&&roof.x+roof.w>minX&&roof.z<maxZ&&roof.z+roof.d>minZ?[roof]:[]};
 if(!queryOnly)gateRoad.parts=[roof];
 return {PLAYER_HEIGHT:1.8,SEA_LEVEL:-100,surfaceAt:()=>({height:0}),gateRoad};
}
test('query-only canonical spatial provider retains roof landing and head contacts',()=>{
 const indexed=create(makeWorld(true),{x:1,z:1,y:3});
 const withParts=create(makeWorld(false),{x:1,z:1,y:3});
 for(let frame=0;frame<80;frame++){
  const input=frame===0?{jump:true}:{};
  const a=indexed.tickFrame(input,1/60),b=withParts.tickFrame(input,1/60);
  assert.deepEqual({...a.state},{...b.state},'frame '+frame);
 }
 const final=indexed.snapshot();
 assert.equal(final.y,3);
 assert.equal(final.grounded,true);
});
