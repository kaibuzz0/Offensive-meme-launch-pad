import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRooms} from '../server/city-rooms.mjs';

function setup(){
 const root={};root.window=root;
 for(const file of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-clans.js','city-monk.js','city-map.js','city-nav.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),root);
 const C=root.MemeCityCore,e=new C.Engine(),p=e.join('solo','Bunker QA','offensive');
 Object.assign(p,{x:C.QUARANTINE.x,y:C.QUARANTINE.y,hp:100,invulnerable:2000});
 // The test is about a bounded challenge: remove idle patrols, not world geometry.
 for(const b of e.arcade.bots){b.hp=0;b.respawn=10000;}
 e.arcade.zombieNext=1000;
 return {root,C,e,p};
}
function tick(e,seconds){for(let i=0;i<Math.ceil(seconds/.05);i++)e.tick(.05);}
const active=e=>e.arcade.bots.filter(b=>b.quarantineOwner&&b.hp>0);
const clear=e=>{for(const b of active(e)){b.hp=0;b.respawn=0;}};
test('quarantine is one accessible landmark in the SAME live map; 47 building doors remain intact',()=>{
 const {root,C,e,p}=setup(),q=C.QUARANTINE;
 assert.equal(C.areaAt(q.x,q.y),'greenbelt');
 assert.equal(C.blocked(q.x,q.y,p),false,'bunker terminal must be walkable');
 assert.equal(C.WORLD.stations.filter(s=>s.id===q.id).length,1);
 assert.equal(root.CityMap.catalog(C,root.CityInteriors,root.CityRising)
  .filter(m=>m.id==='station:'+q.id&&m.activity==='quarantine').length,1);
 assert.equal(root.CityInteriors.BUILDINGS.length,47,'existing doors are unchanged');
 assert.ok(C.CAPABILITIES.online.actions.includes('startQuarantine'));
 assert.ok(C.CAPABILITIES.online.actions.includes('endQuarantine'));
 assert.equal(e.snapshot('solo').quarantine.phase,'idle');
});
test('walk to bunker, countdown, actual waves, 3 clears, exact-once play credit rewards and cleanup',()=>{
 const {C,e,p}=setup();
 assert.equal(e.action(p.id,{type:'startQuarantine'}).includes('Survive three waves'),true);
 assert.ok(e.quarantineEvent);
 assert.equal(e.snapshot(p.id).quarantine.mine,true);
 assert.equal(e.snapshot(p.id).quarantine.next,4);
 assert.throws(()=>e.action(p.id,{type:'startQuarantine'}),/already|challenge/);
 tick(e,4.15);
 assert.equal(e.snapshot(p.id).quarantine.wave,1);
 assert.ok(active(e).length>=2);
 for(const z of active(e)){
  assert.equal(z.kind,'zombie');
  assert.equal(C.areaAt(z.originalX,z.originalY),'greenbelt');
  assert.equal(C.blocked(z.originalX,z.originalY),false);
  assert.ok(Math.hypot(z.x-C.QUARANTINE.x,z.y-C.QUARANTINE.y)<700);
 }
 e.quarantineEvent.damage=60; // trusted simulated player contribution; real projectile tested separately
 for(let wave=1;wave<=3;wave++){
  assert.equal(e.snapshot(p.id).quarantine.wave,wave);
  clear(e);e.tick(.05);
  if(wave<3){tick(e,4.1);assert.ok(active(e).length>=2,'new wave spawns after warning');}
 }
 assert.equal(e.quarantineEvent,null);
 assert.equal(p.quarantineRun,null);
 assert.equal(p.quarantineResult.status,'won');
 assert.equal(p.quarantineResult.reward,120);
 assert.equal(p.quarantineResult.xp,100);
 assert.equal(p.credits,300);assert.equal(p.xp,100);assert.equal(p.jobs,1);
 assert.equal(e.arcade.bots.some(b=>b.quarantineOwner),false);
 assert.throws(()=>e.action(p.id,{type:'endQuarantine'}),/no active/);
 tick(e,2);assert.equal(p.credits,300,'reward cannot be replayed by extra ticks');
 assert.throws(()=>e.action(p.id,{type:'startQuarantine'}),/resetting/);
});
test('personal participation credit comes from real server-simulated blaster hits',()=>{
 const {e,p}=setup();e.action(p.id,{type:'startQuarantine'});tick(e,4.15);
 const z=active(e)[0];assert.ok(z);
 // Uses the preexisting clear lane shared by the zombie blaster regression.
 Object.assign(z,{x:p.x+145,y:p.y,hp:85,maxHp:85,speed:0,bite:100});
 e.action(p.id,{type:'fire',x:1,y:0});
 tick(e,.45);
 assert.ok(e.quarantineEvent.damage>0,'only an actual hit adds damage contribution');
 assert.equal(p.credits,180,'no currency awarded just for shooting');
});
test('abandon, retreat, timeout and busted state clean every challenge actor and deny payment',()=>{
 for(const mode of ['abandoned','left','expired','busted']){
  const {e,p}=setup();e.action(p.id,{type:'startQuarantine'});tick(e,4.2);
  if(mode==='abandoned')e.action(p.id,{type:'endQuarantine'});
  if(mode==='left'){p.x+=900;e.tick(.05);}
  if(mode==='expired'){e.quarantineEvent.remaining=.01;e.tick(.05);}
  if(mode==='busted'){p.deaths++;e.tick(.05);}
  assert.equal(e.quarantineEvent,null,mode+' clears room encounter');
  assert.equal(p.quarantineResult.status,mode);
  assert.equal(p.quarantineResult.reward,0);
  assert.equal(p.credits,180);assert.equal(p.xp,0);
  assert.equal(active(e).length,0,'no event zombie remains after '+mode);
 }
});
test('solo save payload retains the same schema; starting survival never changes equipment or building plots',()=>{
 const {root,e,p}=setup(),before={plot:JSON.stringify(p.plot),crew:JSON.stringify(p.crew),inventory:JSON.stringify(p.inventory)};
 const saved=JSON.stringify(root.CityRising.save(p));
 e.action(p.id,{type:'startQuarantine'});tick(e,4.15);
 assert.equal(JSON.stringify(p.plot),before.plot);assert.equal(JSON.stringify(p.crew),before.crew);
 assert.equal(JSON.stringify(p.inventory),before.inventory);
 assert.equal(JSON.stringify(root.CityRising.save(p)),saved,'quarantine is session-only; existing credits/XP still save normally');
 assert.equal('quarantineRun' in root.CityRising.save(p),false);
});
test('online room authority blocks off-site starts, duplicate runs and client-set rewards',()=>{
 const {C}=setup(),rooms=createRooms(C.Engine);
 const a=rooms.join({name:'One',avatar:'offensive',layoutVersion:C.LAYOUT_VERSION},'127.0.0.11');
 const b=rooms.join({name:'Two',avatar:'offensive',layoutVersion:C.LAYOUT_VERSION},'127.0.0.12');
 const sa=rooms.auth(a.session),sb=rooms.auth(b.session),p=rooms.first.engine.player(sa.id),other=rooms.first.engine.player(sb.id);
 assert.throws(()=>rooms.action(sa,{type:'startQuarantine',credits:999999}),/Walk/,'client cannot start from spawn');
 Object.assign(p,{x:C.QUARANTINE.x,y:C.QUARANTINE.y});
 Object.assign(other,{x:C.QUARANTINE.x,y:C.QUARANTINE.y});
 const result=rooms.action(sa,{type:'startQuarantine',credits:999999});
 assert.equal(result.state.quarantine.mine,true);
 assert.equal(p.credits,180);
 assert.throws(()=>rooms.action(sb,{type:'startQuarantine'}),/already active/);
 assert.equal(rooms.snapshot(sb).quarantine.mine,false);
 assert.equal(rooms.snapshot(sb).quarantine.ownerName,'One');
 rooms.action(sa,{type:'endQuarantine'});
 assert.equal(rooms.snapshot(sb).quarantine.phase,'idle');
 assert.equal(p.credits,180);
});
test('quarantine panel, map tracking, HUD and rendered arena all stay in the original game client',()=>{
 const js=fs.readFileSync(new URL('../city.js',import.meta.url),'utf8'),
  html=fs.readFileSync(new URL('../city.html',import.meta.url),'utf8'),
  roadmap=fs.readFileSync(new URL('../docs/ONE_WORLD_INTEGRATION_ROADMAP.md',import.meta.url),'utf8');
 assert.ok(js.includes('function quarantinePanel('));
 assert.ok(js.includes('function drawQuarantineSite('));
 assert.ok(js.includes("state.quarantine?.phase==='active'"));
 assert.ok(js.includes('QUARANTINE / THREE WAVES'));
 assert.ok(js.includes("'Quarantine Bunker / zombie survival →'"));
 assert.ok(html.includes('city.js?v=56-static-batch'));
 assert.ok(!html.includes('city-world2-online.js'));
 assert.match(roadmap,/ONE PLAYABLE WORLD/);
});
