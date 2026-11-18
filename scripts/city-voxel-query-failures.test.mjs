import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('../city-voxel-physics.js',import.meta.url),'utf8'),context);
const {createController}=context.CityVoxelPhysics;
const base={PLAYER_HEIGHT:7.2,SEA_LEVEL:-100,surfaceAt:()=>({height:0})};

test('throwing structural obstruction query blocks lateral movement without crashing',()=>{
 const world={...base,gateRoad:{obstructs:()=>{throw Error('chunk unavailable');}}};
 const player=createController(world,{x:0,z:0});
 const before=player.snapshot();
 const after=player.tick({right:1},.05);
 assert.equal(after.x,before.x);
 assert.equal(after.z,before.z);
 assert.equal(after.y,before.y);
});

test('structural query recovery resumes traversal on the same controller',()=>{
 let unavailable=true;
 const world={...base,gateRoad:{obstructs:()=>{if(unavailable)throw Error('loading');return false;}}};
 const player=createController(world,{x:0,z:0});
 player.tick({forward:1},.05);
 assert.equal(player.snapshot().z,0);
 unavailable=false;
 player.tick({forward:1},.05);
 assert.ok(player.snapshot().z>0);
});

test('throwing water-volume query does not crash or invent swimming',()=>{
 const world={...base,isWaterAt:()=>{throw Error('water chunk unavailable');}};
 const player=createController(world,{x:0,z:0});
 const after=player.tick({jump:true},.05);
 assert.ok(after.y>1);
 assert.ok(after.vy>5,'normal jump remains active when water occupancy is unknown');
 assert.ok(Object.values(after).filter(v=>typeof v==='number').every(Number.isFinite));
});
