import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';

const sandbox = {};
runInNewContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), sandbox);
const structure = {solid:true,x:-2,y:4,z:-2,w:4,h:1,d:4};
function make(detail) {
  return sandbox.CityVoxelPhysics.createController({
    PLAYER_HEIGHT:1.8,SEA_LEVEL:-100,visualDetail:detail,
    surfaceAt(){return {height:0};},
    gateRoad:{parts:[structure],obstructs(x,y,z,h,r){
      return x+r>structure.x&&x-r<structure.x+structure.w&&
        z+r>structure.z&&z-r<structure.z+structure.d&&
        y<structure.y+structure.h&&y+h>structure.y;
    }}
  },{x:0,z:0});
}

test('jumping beneath a structure never crosses its underside across detail settings',()=>{
  for(const detail of ['near','far']){
    const player=make(detail);
    let highest=-Infinity;
    for(let i=0;i<90;i++){
      const frame=player.tickFrame({jump:i<3},1/60);
      highest=Math.max(highest,frame.state.y);
      assert.ok(frame.steps<=player.MAX_SUBSTEPS);
    }
    assert.ok(highest+player.PLAYER_HEIGHT<=structure.y+0.00001,
      `head passed through ceiling with ${detail}: ${highest}`);
  }
});

test('a long background stall cannot tunnel a jumping player through a solid ceiling',()=>{
  const a=make('near'),b=make('far');
  for(let i=0;i<12;i++){
    a.tickFrame({jump:i===0},1/60);
    b.tickFrame({jump:i===0},1/60);
  }
  const x=a.tickFrame({jump:false},5),y=b.tickFrame({jump:false},5);
  assert.equal(x.steps,6);
  assert.ok(x.droppedSeconds>=4.9);
  assert.deepEqual({...x.state},{...y.state});
  assert.ok(x.state.y+ a.PLAYER_HEIGHT<=structure.y+0.00001);
});
