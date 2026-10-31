import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={};
for(const file of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-nav.js'])vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),context);
const C=context.MemeCityCore,I=context.CityInteriors,nav=context.CityNav.createRouter(C);
test('short clear route is direct; invalid coordinates fail closed',()=>{
 const a={x:3200,y:900},b={x:3230,y:930};
 assert.equal(C.blocked(a.x,a.y),false);
 const p=nav.plan(a,b);assert.equal(p.status,'ok');assert.equal(p.points.length,2);assert.equal(p.expanded,0);
 assert.equal(nav.plan({x:NaN,y:0},b).status,'invalid');
});
test('bounded A* avoids solid rectangles and cannot cut corners',()=>{
 const mock={WORLD:{width:640,height:640},blocked:(x,y,p)=>x<10||y<10||x>630||y>630||(x>240&&x<400&&y>120&&y<520)||(p?.plot?.length&&x>120&&x<200&&y>180&&y<240)};
 const router=context.CityNav.createRouter(mock,{cell:40,budget:5000}),a={x:120,y:320},b={x:520,y:320},path=router.plan(a,b);
 assert.equal(path.status,'ok');assert.ok(path.points.length>=3);assert.ok(path.distance>400);
 for(let i=1;i<path.points.length;i++)assert.equal(router.clear(path.points[i-1],path.points[i]),true);
 assert.ok(router.distanceToRoute(a,path.points)<1);
});
test('unreachable routes and exhausted work budgets never invent a path',()=>{
 const mock={WORLD:{width:640,height:640},blocked:(x,y)=>x<10||y<10||x>630||y>630||(x>300&&x<340)};
 assert.equal(context.CityNav.createRouter(mock,{cell:40,budget:5000}).plan({x:140,y:160},{x:520,y:160}).status,'unreachable');
 assert.equal(context.CityNav.createRouter(mock,{cell:40,budget:1}).plan({x:140,y:160},{x:520,y:160}).status,'budget');
});
test('core service doors have valid collision-aware approaches from spawn',()=>{
 for(const b of I.BUILDINGS.filter(b=>['market','shop','supplies'].includes(b.activity)).slice(0,8)){
  const to=I.door(b),p=nav.plan(C.WORLD.spawn,to);
  assert.equal(p.status,'ok',b.roomId+': '+p.status);
  for(let i=1;i<p.points.length;i++)assert.equal(nav.clear(p.points[i-1],p.points[i]),true,b.roomId);
 }
});
