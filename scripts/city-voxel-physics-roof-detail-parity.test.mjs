import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';

const sandbox = {};
runInNewContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), sandbox);
const roof = {solid:true,x:1,y:1,z:-2,w:3,h:2,d:4};
function controller(detail) {
  return sandbox.CityVoxelPhysics.createController({
    PLAYER_HEIGHT:1.8, SEA_LEVEL:-100, visualDetail:detail,
    surfaceAt(){return {height:0};},
    gateRoad:{
      parts:[roof],
      obstructs(x,y,z,height,radius){
        return x+radius>roof.x && x-radius<roof.x+roof.w &&
          z+radius>roof.z && z-radius<roof.z+roof.d &&
          y<roof.y+roof.h && y+height>roof.y;
      }
    }
  }, {x:0,z:0});
}

test('fixed-step roof approach blocks a grounded player without stepping through a tall wall', () => {
  for(const detail of ['near','far']){
    const player=controller(detail);
    for(let i=0;i<120;i++)player.tickFrame({right:1,yaw:0},1/60);
    const state=player.snapshot();
    assert.ok(state.x < roof.x+0.01, `wall penetrated at ${detail}: ${state.x}`);
    assert.ok(state.y < roof.y+roof.h, 'grounded player stepped onto tall roof');
  }
});

test('roof obstruction is unchanged by rendering detail or uneven frame cadence', () => {
  const a=controller('near'), b=controller('far');
  for(let i=0;i<180;i++){
    const input={right:1,yaw:0,jump:i>=20&&i<24};
    const dt=i%3===0?1/30:1/120;
    const x=a.tickFrame(input,dt), y=b.tickFrame(input,dt);
    assert.deepEqual({...x.state},{...y.state});
    assert.equal(x.steps,y.steps);
    assert.equal(x.obstructionQueries,y.obstructionQueries);
  }
});
