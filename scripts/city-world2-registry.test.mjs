import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx={};
for(const f of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-topology.js','city-nav.js','city-world2.js','city-world2-registry.js','city-migration.js'])
 vm.runInNewContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),ctx);
const C=ctx.MemeCityCore,T=ctx.CityTopology,I=ctx.CityInteriors,R=ctx.CityRising,W=ctx.CityWorld2.create(C,I,T);
const registry=ctx.CityWorld2Registry.create(C,I,R,T,W);
const nav=ctx.CityNav.createRouter({WORLD:W.world,blocked:W.blocked},{budget:17000});
test('canonical world2 POIs preserve unique stable IDs across all 47 entrances and destination classes',()=>{
 assert.equal(new Set(registry.all.map(p=>p.id)).size,registry.all.length);
 assert.equal(registry.doors.length,I.BUILDINGS.length);
 for(const b of I.BUILDINGS){const w=W.doors.find(d=>d.id===b.roomId),r=registry.resolve('door:'+b.roomId);
  assert.ok(r,b.roomId);assert.equal(r.x,w.x);assert.equal(r.y,w.y);assert.equal(r.activity,b.activity);
  assert.equal(W.blocked(r.x,r.y),false);assert.equal(nav.plan(W.spawn,r).status,'ok',b.roomId);
 }
 assert.equal(registry.all.filter(p=>p.kind==='landmark').length,R.LANDMARKS.length);
 assert.equal(registry.all.filter(p=>p.kind==='guide').length,R.GUIDES.length);
 assert.equal(registry.all.filter(p=>p.kind==='station').length,C.WORLD.stations.length);
 assert.equal(registry.checkpoints.length,C.WORLD.route.length);
});
test('authored hub buildings and old matching station targets agree exactly',()=>{
 for(const id of ['launch','arcade','club','shop','market','garage']){
  const door=registry.resolve('door:'+id),station=registry.resolve('station:'+id);
  assert.ok(door&&station);assert.equal(station.x,door.x,id);assert.equal(station.y,door.y,id);
  const old=I.door(I.BUILDINGS.find(b=>b.roomId===id)),generic=T.point(C,old);
  assert.ok(generic);if(id==='market')assert.notEqual(generic.x,door.x,'generic interpolation must not override the authored slot');
 }
});
test('waypoints with stable IDs use canonical v2 coordinates, not generic interpolation',()=>{
 const old={version:5,saveVersion:5,worldVersion:1,x:C.WORLD.spawn.x,y:C.WORLD.spawn.y,area:'hub',
  waypoint:{id:'door:market',x:oldMarketX(),y:1070,name:'Night Market'},route:2,
  inventory:[{uid:'gear-1',item:'jacket'}],credits:330};
 function oldMarketX(){return C.WORLD.stations.find(s=>s.id==='market').x;}
 const plan=ctx.CityMigration.plan(C,T,old,registry);
 assert.equal(plan.status,'preview');assert.equal(plan.save.waypoint.x,registry.resolve('door:market').x);
 assert.equal(plan.save.waypoint.y,registry.resolve('door:market').y);
 assert.equal(plan.routeTarget.x,registry.resolve('checkpoint:2').x);
 assert.equal(plan.save.credits,330);
 assert.equal(plan.save.inventory[0].uid,'gear-1');
 assert.equal(old.waypoint.x,oldMarketX(),'source data is not mutated');
});
test('all authored POI coordinates are collision-safe, and malformed IDs fail closed',()=>{
 for(const p of registry.all){assert.equal(W.blocked(p.x,p.y),false,p.id);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y),p.id);}
 assert.equal(registry.resolve('door:nonexistent'),null);
 assert.equal(registry.migrationTarget({id:'door:nonexistent',x:-500,y:-300}),null);
});
