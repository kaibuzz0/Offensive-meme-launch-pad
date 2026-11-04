import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRooms} from '../server/city-rooms.mjs';

function setup(){
 const root={};root.window=root;
 for(const file of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js',
  'city-clans.js','city-territory.js','city-civilians.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),root);
 const C=root.MemeCityCore,e=new C.Engine(),p=e.join('solo','Street QA','offensive');
 e.arcade.zombieNext=1000;
 e.snapshot(p.id);e.conflict.remaining=9999;
 return {root,C,e,p};
}
function tick(e,seconds){for(let i=0;i<Math.ceil(seconds/.05);i++)e.tick(.05);}
function quiet(e){
 for(const b of e.arcade.bots){b.hp=0;b.respawn=10000;}
 e.arcade.zombieNext=1000;
}
test('bounded civilians inhabit the ORIGINAL hub, clan blocks and social boardwalk, not alternate world or saved NPC state',()=>{
 const {root,C,e,p}=setup(),cs=e.snapshot(p.id).civilians;
 assert.ok(cs.length>=12&&cs.length<=root.CityCivilians.MAX,'bounded actors');
 assert.equal(new Set(cs.map(c=>c.id)).size,cs.length);
 assert.ok(cs.some(c=>c.zone==='hub'));
 assert.ok(cs.some(c=>c.zone==='social'));
 for(const n of C.NEIGHBORHOODS)assert.ok(cs.some(c=>c.zone===n.id),'missing civilian in '+n.id);
 for(const c of cs){
  assert.ok(!C.blocked(c.x,c.y),'civilian must start on existing public walkable world');
  assert.equal(C.areaAt(c.x,c.y),c.zone,'civilian remains in their original district');
  assert.equal(c.state,'stroll');
  assert.equal(typeof c.facing.x,'number');
 }
 assert.equal('civilians' in p,false,'not written into saved player data');
 assert.equal(e.arcade.bots.filter(b=>b.kind==='civilian').length,0,'not combat-farmable bots');
 assert.equal(C.WORLD.width,11200);assert.equal(C.WORLD.height,11200);
});
test('nearby street pedestrians stroll safely while distant NPCs sleep for performance',()=>{
 const {C,e,p}=setup();quiet(e);
 const civ=e.civilians.find(c=>c.zone==='hub');
 Object.assign(p,{x:civ.x+80,y:civ.y+95,invulnerable:1000});
 const distant=e.civilians.find(c=>c.zone==='social');
 const original={x:civ.x,y:civ.y,dx:distant.x,dy:distant.y};
 tick(e,4);
 assert.ok(Math.hypot(civ.x-original.x,civ.y-original.y)>4,'nearby civilian walks own route');
 assert.equal(civ.state==='stroll'||civ.state==='waiting',true);
 assert.equal(distant.x,original.dx,'distant civilians are not simulated');
 assert.equal(distant.y,original.dy);
 assert.equal(C.blocked(civ.x,civ.y),false);
});
test('nearby calm players receive bounded civilian waves without economy or save changes',()=>{
 const {e,p,C}=setup();quiet(e);
 const c=e.civilians.find(c=>c.zone==='hub');
 Object.assign(p,{x:c.x+75,y:c.y+70,hp:100,invulnerable:1000,fireHeld:false});
 const before={credits:p.credits,xp:p.xp,plot:JSON.stringify(p.plot),area:C.areaAt(c.x,c.y)};
 c.nextWave=0;
 tick(e,.4);
 assert.equal(c.gesture,true,'pedestrian raises a hand when a calm player approaches');
 assert.equal(c.moving,false,'greeting pauses wandering instead of sliding');
 assert.equal(c.state,'waiting','uses existing noncombat waiting state');
 const near=e.snapshot(p.id).civilians.find(o=>o.id===c.id);
 assert.equal(near.gesture,true,'solo snapshot exposes only a visible boolean gesture');
 assert.equal('waveUntil' in near,false,'cooldown is private server/session state');
 assert.equal('nextWave' in near,false,'no client-supplied emote authority');
 assert.ok(c.facing.x>0&&c.facing.y>0,'civilian faces approaching player');
 tick(e,2.6);
 assert.equal(c.gesture,false,'friendly wave finishes after a bounded moment');
 assert.ok(c.nextWave>e.arcade.time,'wave has a cooldown, not per-frame spam');
 tick(e,3);
 assert.equal(c.gesture,false,'cooldown prevents repeated waves while player idles');
 assert.equal(p.credits,before.credits);assert.equal(p.xp,before.xp);
 assert.equal(JSON.stringify(p.plot),before.plot);
 assert.equal(C.areaAt(c.x,c.y),before.area,'social activity does not teleport citizens');
});

test('real nearby danger cancels civilian waves and blocks immediate re-greeting',()=>{
 const {e,p}=setup();quiet(e);
 const c=e.civilians.find(c=>c.zone==='hub');
 Object.assign(p,{x:c.x+80,y:c.y+50,hp:100,invulnerable:1000,fireHeld:false});
 c.nextWave=0;
 tick(e,.4);
 assert.equal(c.gesture,true);
 const enemy=e.arcade.bots.find(b=>b.kind==='gang');
 Object.assign(enemy,{x:c.x+30,y:c.y+25,homeX:c.x+30,homeY:c.y+25,
  faction:'exit',hp:100,maxHp:100,territoryRole:'invader',cooldown:100});
 tick(e,.4);
 assert.ok(['fleeing','sheltering'].includes(c.state));
 assert.equal(c.gesture,false,'combat dominates greetings');
 const cooldown=c.nextWave;
 enemy.hp=0;
 tick(e,4.5);
 assert.ok(e.arcade.time<cooldown,'post-raid cooldown survives panic recovery');
 assert.equal(c.gesture,false,'civilian never greets while fleeing or immediately after');
});

test('real faction threat makes civilians flee/shelter, generates alerts and then restores normal activity',()=>{
 const {C,e,p}=setup();quiet(e);
 const c=e.civilians.find(c=>c.zone==='hub');
 Object.assign(p,{x:c.x+170,y:c.y+110,invulnerable:1000});
 const threat=e.arcade.bots.find(b=>b.kind==='gang'),cop=e.arcade.bots.find(b=>b.kind==='cop');
 Object.assign(threat,{x:c.x+55,y:c.y+45,homeX:c.x+55,homeY:c.y+45,
  faction:'exit',hp:100,maxHp:100,territoryRole:'invader',cooldown:100});
 Object.assign(cop,{x:c.x+85,y:c.y+110,homeX:c.x+85,homeY:c.y+110,
  hp:100,maxHp:100,cooldown:100});
 tick(e,.55);
 assert.ok(['fleeing','sheltering'].includes(c.state),'civilians visibly react to district attackers');
 assert.ok(c.panic>0);
 assert.ok(cop.civilianAlert&&Number.isFinite(cop.civilianAlert.expires),'friendly patrols receive witness report');
 assert.ok(Math.hypot(c.x-c.homeX,c.y-c.homeY)>8,'civilian physically escapes, not only changes label');
 const before=e.snapshot(p.id).civilians.find(x=>x.id===c.id);
 assert.equal(before.state,c.state);
 threat.hp=0;cop.hp=0;
 tick(e,5.5);
 assert.ok(['stroll','waiting'].includes(c.state),'calms down after real threat clears');
 assert.ok(c.panic<=.01);
});
test('an alert redirects local patrols along walkable roads; normal beat has bounded waypoint movement',()=>{
 const {e,p}=setup();quiet(e);
 const c=e.civilians.find(x=>x.zone==='hub');
 Object.assign(p,{x:c.x+55,y:c.y+45,invulnerable:1000});
 const cop=e.arcade.bots.find(b=>b.kind==='cop');
 Object.assign(cop,{x:c.x+60,y:c.y+70,homeX:c.x+60,homeY:c.y+70,hp:100,maxHp:100,cooldown:100});
 const original={x:cop.x,y:cop.y};
 tick(e,3);
 assert.equal(cop.state,'patrolling','ordinary police use four-point street beats');
 assert.ok(Number.isInteger(cop.patrolIndex));
 assert.ok(Math.hypot(cop.x-original.x,cop.y-original.y)>10,'patrol moves around neighborhood');
 cop.civilianAlert={x:cop.x+180,y:cop.y+20,expires:e.arcade.time+5};
 e.tick(.05);
 assert.equal(cop.state,'responding','witness alert overrides idle patrol');
 assert.ok(cop.aim);
 tick(e,7);
 assert.ok(!cop.civilianAlert||cop.civilianAlert.expires<e.arcade.time,'patrol alert expires');
});
test('civilian world actors are not targetable or reward-bearing, and old saved progress is unchanged',()=>{
 const {root,e,p}=setup();const x=e.snapshot(p.id);
 const people=x.civilians.map(c=>c.id);
 assert.ok(people.every(id=>!e.arcade.bots.some(b=>b.id===id)));
 const save=root.CityRising.save(p),clan=root.CityClans.save(p),places=root.CityInteriors.save(p);
 const before={credits:p.credits,xp:p.xp,reputation:JSON.stringify(p.reputation),
  plot:JSON.stringify(p.plot),save:JSON.stringify(save),
  clan:JSON.stringify(clan),places:JSON.stringify(places)};
 quiet(e);
 tick(e,9);
 assert.equal(p.credits,before.credits);assert.equal(p.xp,before.xp);
 assert.equal(JSON.stringify(p.reputation),before.reputation);
 assert.equal(JSON.stringify(p.plot),before.plot);
 assert.equal(JSON.stringify(root.CityRising.save(p)),before.save);
 assert.equal(JSON.stringify(root.CityClans.save(p)),before.clan);
 assert.equal(JSON.stringify(root.CityInteriors.save(p)),before.places);
});
test('shared rooms expose the same read-only civilian snapshots without cross-player contamination',()=>{
 const {C}=setup(),rooms=createRooms(C.Engine);
 const a=rooms.join({name:'One',avatar:'offensive',layoutVersion:C.LAYOUT_VERSION},'127.0.0.61');
 const b=rooms.join({name:'Two',avatar:'offensive',layoutVersion:C.LAYOUT_VERSION},'127.0.0.62');
 const sa=rooms.auth(a.session),sb=rooms.auth(b.session);
 const c1=rooms.snapshot(sa).civilians,c2=rooms.snapshot(sb).civilians;
 assert.equal(c1.length,c2.length);
 assert.ok(c1.length>=12);
 c1[0].x=-1000;c1[0].style.skin=999;
 const c3=rooms.snapshot(sb).civilians;
 assert.ok(c3[0].x>0);
 assert.ok(c3[0].style.skin<6);
 assert.equal(rooms.first.engine.arcade.bots.filter(b=>b.kind==='civilian').length,0);
});
test('the original renderer shows animated panic using the SAME rotating NPC avatar rig',()=>{
 const html=fs.readFileSync(new URL('../city.html',import.meta.url),'utf8'),
  client=fs.readFileSync(new URL('../city.js',import.meta.url),'utf8'),
  districts=fs.readFileSync(new URL('../city-districts.js',import.meta.url),'utf8'),
  server=fs.readFileSync(new URL('../server/city-server.mjs',import.meta.url),'utf8');
 assert.match(html,/city-civilians\.js\?v=44-friendly-civilians/);
 assert.match(html,/city\.js\?v=44-friendly-civilians/);
 assert.ok(server.includes("'city-civilians.js'"));
 assert.ok(client.includes('for(const c of state.civilians||[])'));
 assert.ok(client.includes("role:'civilian'"));
 assert.ok(client.includes("c.state==='fleeing'"));
 assert.ok(client.includes('TAKING COVER'));
 assert.ok(!client.includes("id:'pedestrian-'+i"));
 assert.ok(!districts.includes("id:'boardwalk-'+i"));
 assert.ok(!html.includes('city-world2-online.js'));
});
