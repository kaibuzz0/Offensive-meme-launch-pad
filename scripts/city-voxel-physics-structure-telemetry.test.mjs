import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';

const sandbox={};
runInNewContext(readFileSync(new URL('../city-voxel-physics.js',import.meta.url),'utf8'),sandbox);
function controller(detail,parts){
 return sandbox.CityVoxelPhysics.createController({
  PLAYER_HEIGHT:1.8,SEA_LEVEL:-100,visualDetail:detail,
  surfaceAt(){return {height:0};},
  gateRoad:{parts,obstructs(x,y,z,h,r){
   return parts.some(p=>p.solid&&x+r>p.x&&x-r<p.x+p.w&&
    z+r>p.z&&z-r<p.z+p.d&&y<p.y+p.h&&y+h>p.y);
  }}
 },{x:0,z:0});
}
test('structure candidate telemetry is per frame and independent of visual detail',()=>{
 const parts=[{solid:true,x:20,y:0,z:20,w:2,h:3,d:2}];
 const near=controller('near',parts),far=controller('far',parts);
 for(const elapsed of [1/120,1/60,.08,5,1/60]){
  const a=near.tickFrame({forward:1,yaw:0},elapsed);
  const b=far.tickFrame({forward:1,yaw:0},elapsed);
  assert.deepEqual({...a.state},{...b.state});
  assert.equal(a.steps,b.steps);
  assert.equal(a.structureCandidates,b.structureCandidates);
  assert.ok(a.structureCandidates>=0);
  assert.ok(Number.isInteger(a.structureCandidates));
 }
});
test('no structure geometry incurs no structure candidate scans',()=>{
 const player=controller('near',[]);
 for(let i=0;i<10;i++){
  const frame=player.tickFrame({forward:1},1/60);
  assert.equal(frame.structureCandidates,0);
  assert.ok(frame.steps<=player.MAX_SUBSTEPS);
 }
});
