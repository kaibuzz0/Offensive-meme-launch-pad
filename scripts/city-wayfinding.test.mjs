import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root={};root.window=root;
for(const name of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-nav.js','city-map.js'])
 vm.runInNewContext(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'),root);
const C=root.MemeCityCore,I=root.CityInteriors,N=root.CityNav.createRouter(C),M=root.CityMap;
const vec=x=>JSON.parse(JSON.stringify(x));
test('guidance reports remaining route length, actual compass, next legal turn and manual only movement',()=>{
 const router=root.CityNav.createRouter({WORLD:{width:640,height:640},blocked:(x,y)=>x<10||y<10||x>630||y>630},{cell:40});
 const route=[{x:100,y:100},{x:400,y:100},{x:400,y:400}];
 const one=router.guidance({x:150,y:100},route);
 assert.equal(one.status,'follow');
 assert.equal(one.remaining,550);
 assert.equal(one.heading,'EAST');
 assert.equal(one.turn,'right','world Y increases toward the south, so east to south is right');
 assert.equal(one.distanceToTurn,250);
 const two=router.guidance({x:400,y:175},route);
 assert.equal(two.status,'follow');assert.equal(two.heading,'SOUTH');
 assert.equal(two.turn,'continue');
 assert.equal(two.remaining,225);
 assert.equal(router.guidance({x:400,y:385},route).status,'arrived');
 assert.equal(router.guidance({x:90,y:400},route,{offRoute:100}).status,'off-route');
 assert.equal(router.guidance({x:NaN,y:0},route).status,'invalid');
 assert.equal(router.guidance({x:100,y:100},[]).status,'invalid');
 assert.deepEqual(vec(route),[{x:100,y:100},{x:400,y:100},{x:400,y:400}],'route points are not mutated by guidance');
});
test('all original 47 doors preserve stable identity and a collision-safe approach',()=>{
 assert.equal(I.BUILDINGS.length,47,'original interior count must not change');
 const all=M.catalog(C,I,root.CityRising),doors=all.filter(x=>x.kind==='door');
 assert.equal(doors.length,47);
 for(const b of I.BUILDINGS){
  const door=I.door(b);
  assert.ok(!C.blocked(door.x,door.y),b.roomId+' entrance is physically walkable');
  const entry=doors.find(d=>d.id==='door:'+b.roomId);
  assert.ok(entry,'original map ID missing: '+b.roomId);
  assert.deepEqual({x:entry.x,y:entry.y},{x:door.x,y:door.y},'map does not silently move doors');
  const route=N.plan(C.WORLD.spawn,door);
  assert.equal(route.status,'ok',b.roomId+': cannot reach entrance from real spawn ('+route.status+')');
  assert.ok(route.points.length>=2&&route.points.length<=350,b.roomId+' route bounds');
  for(let i=1;i<route.points.length;i++)assert.ok(N.clear(route.points[i-1],route.points[i]),b.roomId+' collision-safe segment '+i);
  const guide=N.guidance(C.WORLD.spawn,route.points);
  assert.ok(['follow','arrived'].includes(guide.status),b.roomId+' guidance valid');
  assert.ok(guide.remaining>=0);
 }
});
test('rerouting respects dynamic player-built obstacles and never invents a path across collision',()=>{
 const mock={WORLD:{width:640,height:640},blocked:(x,y,p)=>
  x<10||y<10||x>630||y>630||
  (x>240&&x<400&&y>100&&y<520)||
  (p?.plot?.length&&x>120&&x<200&&y>160&&y<240)};
 const nav=root.CityNav.createRouter(mock,{cell:40,budget:6000});
 const a={x:110,y:300},b={x:510,y:300},p={plot:[{col:1}]};
 const route=nav.plan(a,b,p);
 assert.equal(route.status,'ok');
 for(let i=1;i<route.points.length;i++)assert.equal(nav.clear(route.points[i-1],route.points[i],p),true);
 const bad={x:300,y:300};
 assert.equal(nav.plan(a,bad,p).status,'invalid');
 assert.equal(nav.guidance(b,route.points).status,'arrived');
});
test('real game route overlay is informational and cannot change player position, saves or wallet',()=>{
 const city=fs.readFileSync(new URL('../city.js',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../city.html',import.meta.url),'utf8');
 assert.ok(city.includes('routePlanner.guidance(me,routePath)'));
 assert.ok(city.includes('function updateRouteGuide()'));
 assert.ok(city.includes('routeInstruction(guide)'));
 assert.ok(city.includes('routePlanner.plan(me,tracked'));
 assert.ok(!city.includes('engine.teleport('));
 assert.ok(html.includes('id="route-guide"'));
 assert.ok(html.includes('role="status"'));
 assert.ok(html.includes('city-nav.js?v=20-center')||html.includes('city-nav.js?v=42-wayfinding'));
 assert.ok(html.includes('offensive-meme-city-v1-center'));
});
