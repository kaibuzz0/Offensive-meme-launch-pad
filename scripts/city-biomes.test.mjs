import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx={};
for(const path of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-biomes.js','city-map.js','city-nav.js'])
 vm.runInNewContext(fs.readFileSync(new URL('../'+path,import.meta.url),'utf8'),ctx,{filename:path});
const C=ctx.MemeCityCore,T=ctx.CityBiomes,I=ctx.CityInteriors,R=ctx.CityRising,M=ctx.CityMap;

test('three nonblocking terrain biomes occupy safe greenbelt, avoiding roads, buildings and reserved locations',()=>{
 assert.deepEqual([C.WORLD.width,C.WORLD.height],[11200,11200]);
 assert.equal(T.regions.length,3);
 assert.equal(new Set(T.regions.map(r=>r.id)).size,3);
 for(const r of T.regions){
  assert.equal(C.areaAt(r.entry.x,r.entry.y),'greenbelt');
  assert.equal(C.blocked(r.entry.x,r.entry.y),false,'reachable entry: '+r.id);
  assert.equal(T.terrainAt(r.entry.x,r.entry.y).id,r.id);
  assert.equal(T.terrainAt(r.entry.x,r.entry.y).walkable,true);
  assert.equal(T.terrainAt(r.entry.x,r.entry.y).buildable,false,'new construction remains forbidden');
  assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=11200&&r.y+r.h<=11200);
  for(const d of [...C.NEIGHBORHOODS,...C.DISTRICTS])
   assert.ok(r.x+r.w<=d.ox||r.x>=d.ox+2240||r.y+r.h<=d.oy||r.y>=d.oy+1660,'settlement protected: '+r.id);
  for(const lot of C.TOKEN_PLOTS)
   assert.ok(r.x+r.w<=lot.x||r.x>=lot.x+lot.w||r.y+r.h<=lot.y||r.y>=lot.y+lot.h,'optional lot protected: '+r.id);
  for(const b of C.WORLD.buildings)
   assert.ok(r.x+r.w<=b.x||r.x>=b.x+b.w||r.y+r.h<=b.y||r.y>=b.y+b.h,'business protected: '+r.id);
  for(const dx of [80,640])for(const dy of [80,640])
   assert.equal(C.blocked(r.x+dx,r.y+dy),false,'biome remains walkable');
 }
 assert.equal(T.terrainAt(C.PLOT.x,C.PLOT.y).id,'urban');
 assert.equal(T.terrainAt(Infinity,0),null);
 assert.equal(T.noise(13.5,41.3,234),T.noise(13.5,41.3,234));
});

test('legacy spawn, fortress save grid, quest stations and all physical doors remain unchanged',()=>{
 assert.deepEqual([C.WORLD.spawn.x,C.WORLD.spawn.y],[5600,5940]);
 assert.deepEqual([C.PLOT.x,C.PLOT.y,C.PLOT.cols,C.PLOT.rows],[5080,4930,16,10]);
 assert.equal(C.restorePlot([{col:1,row:1,kind:'wall'}]).length,1);
 assert.equal(I.BUILDINGS.length,47);
 for(const b of I.BUILDINGS){
  const d=I.door(b);
  assert.ok(Number.isFinite(d.x)&&Number.isFinite(d.y));
  assert.notEqual(T.regionAt(d.x,d.y)?.id,'forest');
  assert.notEqual(T.regionAt(d.x,d.y)?.id,'wasteland');
  assert.notEqual(T.regionAt(d.x,d.y)?.id,'highlands');
 }
 for(const s of C.WORLD.stations)assert.equal(T.regionAt(s.x,s.y),null,'quest station protected: '+s.id);
 assert.ok(fs.readFileSync(new URL('../city.js',import.meta.url),'utf8').includes("saveKey='offensive-meme-city-v1-center'"));
});

test('every biome is accessible on an unchanged, collision-safe walking route from the player fortress',()=>{
 const router=ctx.CityNav.createRouter(C);
 for(const region of T.regions){
  const route=router.plan(C.WORLD.spawn,region.entry);
  assert.equal(route.status,'ok',region.name+' must be reachable using original street navigation');
  assert.ok(route.points.length>=2);
  for(let i=1;i<route.points.length;i++)
   assert.equal(router.clear(route.points[i-1],route.points[i]),true,region.name+' routes cannot cross existing structures');
 }
});

test('original map retains all real destinations and adds clickable biome waypoints',()=>{
 const original=M.catalog(C,I,R),extended=M.catalog(C,I,R,T);
 assert.equal(original.filter(p=>p.kind==='door').length,I.BUILDINGS.length);
 assert.equal(extended.filter(p=>p.kind==='door').length,I.BUILDINGS.length);
 assert.equal(extended.length,original.length+3);
 for(const r of T.regions){
  const p=extended.find(p=>p.id==='biome:'+r.id);
  assert.ok(p,r.id);assert.equal(p.x,r.entry.x);assert.equal(p.y,r.entry.y);
  assert.equal(M.closest(extended,{x:p.x,y:p.y},190).id,p.id);
 }
});

test('only visible terrain is drawn; decorative props have a fixed hard limit',()=>{
 const c={save(){},restore(){},beginPath(){},roundRect(){},clip(){},stroke(){},fillRect(){},
  set fillStyle(v){this.paint=v;},set strokeStyle(v){this.edge=v;},set lineWidth(v){this.thickness=v;}};
 assert.equal(T.drawGround(c,()=>false),0);
 assert.equal(T.scenery(c,()=>false).length,0);
 const r=T.regions[0];
 assert.equal(T.drawGround(c,(x,y)=>x===r.x&&y===r.y),1);
 const layers=T.scenery(c,(x,y,w,h)=>x<r.x+r.w&&x+w>r.x&&y<r.y+r.h&&y+h>r.y);
 assert.ok(layers.length>10&&layers.length<=32);
 assert.ok(T.props.length<=96);
 assert.ok(T.props.every(p=>!Object.hasOwn(p,'solid')),'no collision geometry added');
});
