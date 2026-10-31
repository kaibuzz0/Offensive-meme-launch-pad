import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx={};
for(const f of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-topology.js','city-nav.js','city-world2.js'])
 vm.runInNewContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),ctx);
const C=ctx.MemeCityCore,T=ctx.CityTopology,I=ctx.CityInteriors,N=ctx.CityNav;
const W=ctx.CityWorld2.create(C,I,T),router=N.createRouter({WORLD:W.world,blocked:W.blocked},{cell:80,budget:17000});
test('central fortress has four genuinely passable gates and solid perimeter walls',()=>{
 const {x,y}=W.spawn;assert.equal(W.world.center.x,5040);assert.equal(W.world.center.y,5040);
 assert.equal(x,5040);assert.equal(y,T.draft.areas.fortress.y+70);assert.equal(W.blocked(x,y),false);
 assert.equal(W.walls.length,8);assert.equal(W.roads.length,4);
 for(const name of ['north','south','east','west']){
  const r=W.roads.find(r=>r.id===name);assert.ok(r&&r.w>0&&r.h>0,name);
  const point=name==='north'?{x,y:250}:name==='south'?{x,y:W.world.height-250}:name==='east'?{x:W.world.width-250,y:W.world.center.y}:{x:250,y:W.world.center.y};
  assert.equal(W.blocked(point.x,point.y),false,name+' path endpoint');
  const p=router.plan(W.spawn,point);assert.equal(p.status,'ok',name+' lane: '+p.status);
 }
 assert.equal(W.blocked(T.draft.areas.fortress.x+10,T.draft.areas.fortress.y+180),true);
 assert.equal(W.blocked(x,T.draft.areas.fortress.y+10),false,'north gate');
 assert.equal(W.blocked(x,T.draft.areas.fortress.y+T.draft.areas.fortress.h-10),false,'south gate');
});
test('every current enterable building has stable world2 geometry and reachable outside door',()=>{
 assert.equal(W.doors.length,I.BUILDINGS.length);
 assert.equal(new Set(W.doors.map(d=>d.id)).size,I.BUILDINGS.length);
 for(const door of W.doors){
  assert.equal(W.blocked(door.x,door.y),false,door.id+' outside door must not be inside solid');
  const result=router.plan(W.spawn,door);
  assert.equal(result.status,'ok',door.id+' must be accessible by foot; status='+result.status);
  assert.ok(result.points.length>=2);
  for(let i=1;i<result.points.length;i++)assert.ok(router.clear(result.points[i-1],result.points[i]),door.id+' crosses solid geometry');
 }
});
test('world2 models original central services as separate visible buildings, not road blockers',()=>{
 for(const name of ['launch','arcade','club','shop','market','garage']){
  assert.ok(W.buildings.some(b=>b.id===name));assert.ok(W.doors.some(d=>d.id===name));
 }
 for(let y=150;y<=T.draft.areas.fortress.y;y+=50)assert.equal(W.blocked(W.spawn.x,y),false,'northern boulevard must not cross buildings');
 for(const id of ['shop','market'])assert.equal(W.doors.find(d=>d.id===id).area,'hub');
});
test('private construction collisions belong only to the player and never seal all public roads',()=>{
 const p={plot:[{kind:'wall',col:3,row:3}],outposts:[]},b={x:T.draft.plot.x+3*64+30,y:T.draft.plot.y+3*64+30};
 assert.equal(W.blocked(b.x,b.y),false);assert.equal(W.blocked(b.x,b.y,p),true);
 const other={x:W.spawn.x,y:100};assert.equal(W.blocked(other.x,other.y,p),false);
 const crowded={plot:[{kind:'wall',col:7,row:6},{kind:'tower',col:7,row:7}],outposts:[]};
 assert.equal(W.blocked(W.world.center.x,W.world.center.y,crowded),true,'center tile can be occupied');
 assert.equal(W.blocked(W.spawn.x,W.spawn.y,crowded),false,'spawn must remain clear with built tiles');
});
