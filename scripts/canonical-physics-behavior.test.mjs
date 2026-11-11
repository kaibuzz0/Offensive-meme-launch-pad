import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

// Exercise the actual controller, not only source patterns. This remains a
// synthetic geometry check; seeded fortress and browser acceptance are separate.
const source=readFileSync(new URL('../city-voxel-physics.js',import.meta.url),'utf8');
function controller(world,spawn={x:0,z:0}){
 const context={};runInNewContext(source,context);
 return context.CityVoxelPhysics.createController(world,spawn);
}
function world(overrides={}){
 return {PLAYER_HEIGHT:1.8,SEA_LEVEL:-100,
  surfaceAt:(x,z)=>({height:0}),gateRoad:{obstructs:()=>false},...overrides};
}
test('diagonal input is normalized and 60Hz movement is deterministic',()=>{
 const a=controller(world()),b=controller(world());
 for(let i=0;i<60;i++){
  a.tick({right:1,forward:1,yaw:0},1/60);
  b.tick({right:1,forward:1,yaw:0},1/60);
 }
 const p=a.snapshot(),q=b.snapshot();
 assert.equal(p.x,q.x);assert.equal(p.z,q.z);
 assert.ok(Math.hypot(p.x,p.z)<=15.001);
 assert.ok(Math.hypot(p.x,p.z)>14.5);
});
test('structural obstacle blocks horizontal sweep and allows sliding',()=>{
 const c=controller(world({gateRoad:{obstructs:(x,y,z)=>x>=1}}));
 for(let i=0;i<20;i++)c.tick({right:1,forward:1},1/60);
 const p=c.snapshot();
 assert.ok(p.x<1,'cannot cross structural wall');
 assert.ok(p.z>0,'free axis can slide along wall');
});
test('unloaded world cells fail closed during movement',()=>{
 const c=controller(world({surfaceAt:(x,z)=>x>=1?null:{height:0}}));
 for(let i=0;i<20;i++)c.tick({right:1},1/60);
 assert.ok(c.snapshot().x<1);
});
test('headroom prevents lateral entry into low underground gallery',()=>{
 const c=controller(world({caveRoomAt:(x,z)=>x>=1?{floor:1,ceiling:2,exposed:false}:null}));
 for(let i=0;i<20;i++)c.tick({right:1},1/60);
 assert.ok(c.snapshot().x<1);
});
