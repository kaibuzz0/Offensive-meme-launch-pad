import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../city-voxel-physics.js',import.meta.url),'utf8');
function controller(obstructs){
  const context={};vm.runInNewContext(source,context);
  const world={surfaceAt:()=>({height:0}),PLAYER_HEIGHT:1.8,SEA_LEVEL:-100,
    gateRoad:obstructs===null?{}:{obstructs}};
  return context.CityVoxelPhysics.createController(world,{x:0,z:0});
}
test('player movement rejects unknown gate clearance without advancing',()=>{
  for(const answer of [undefined,null,0,1,{},true]){
    const p=controller(()=>answer),before=p.snapshot();
    p.tick({forward:1,yaw:0},1/60);
    assert.equal(p.snapshot().z,before.z);
    assert.equal(p.teleport(2,2),false);
    assert.equal(p.snapshot().x,before.x);
  }
});
test('missing gate query blocks movement and teleport, explicit clear allows both',()=>{
  const blocked=controller(null);
  blocked.tick({forward:1},1/60);
  assert.equal(blocked.snapshot().z,0);
  assert.equal(blocked.teleport(2,2),false);
  const clear=controller(()=>false);
  clear.tick({forward:1},1/60);
  assert.ok(clear.snapshot().z>0);
  assert.equal(clear.teleport(2,2),true);
});

test('player-built structure edits affect walking and teleport immediately',()=>{
  const context={};vm.runInNewContext(source,context);
  let blocked=true;
  const world={surfaceAt:()=>({height:0}),PLAYER_HEIGHT:1.8,SEA_LEVEL:-100,
    gateRoad:{obstructs:()=>false},
    structuralObstructs:(x,y,z)=>blocked&&z>0};
  const player=context.CityVoxelPhysics.createController(world,{x:0,z:0});
  player.tick({forward:1},1/60);
  assert.equal(player.snapshot().z,0,'edit must block movement');
  const before=player.snapshot();
  assert.equal(player.teleport(0,2),false);
  assert.deepEqual(player.snapshot(),before,'failed teleport must preserve state');
  blocked=false;
  player.tick({forward:1},1/60);
  assert.ok(player.snapshot().z>0,'removal must be observed without stale cache');
  assert.equal(player.teleport(0,2),true);
});

test('unknown structural collision results fail closed when adapter is configured',()=>{
  const context={};vm.runInNewContext(source,context);
  const world={surfaceAt:()=>({height:0}),PLAYER_HEIGHT:1.8,SEA_LEVEL:-100,
    gateRoad:{obstructs:()=>false},structuralObstructs:()=>undefined};
  const player=context.CityVoxelPhysics.createController(world,{x:0,z:0});
  player.tick({forward:1},1/60);
  assert.equal(player.snapshot().z,0);
  assert.equal(player.teleport(0,2),false);
});
