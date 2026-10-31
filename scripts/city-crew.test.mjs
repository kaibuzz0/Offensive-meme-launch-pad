import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={};for(const f of ['city-core.js','city-arcade.js'])vm.runInNewContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),context);
const C=context.MemeCityCore;
function game(){const e=new C.Engine(),p=e.join('a','Alice','offensive');Object.assign(p,{x:C.HUB.x+1120,y:C.HUB.y+900});for(const b of e.arcade.bots){b.hp=0;b.respawn=10000;}return {e,p};}
function fort(p){Object.assign(p,{x:C.WORLD.spawn.x,y:C.WORLD.spawn.y,area:'fortress'});}
function tick(e,t){for(let n=0;n<Math.ceil(t/.05);n++)e.tick(.05);}
test('hiring enforces location, type, funds and the four-defender roster limit',()=>{
 const {e,p}=game();assert.throws(()=>e.action('a',{type:'hire',role:'sentry'}),/Walk/);fort(p);
 assert.throws(()=>e.action('a',{type:'hire',role:'fake'}),/Unknown/);p.credits=19;assert.throws(()=>e.action('a',{type:'hire',role:'sentry'}),/Not enough/);p.credits=180;
 for(let i=0;i<4;i++)e.action('a',{type:'hire',role:'sentry'});assert.equal(p.credits,100);assert.equal(p.crew.length,4);assert.equal(new Set(p.crew.map(g=>g.id)).size,4);
 assert.throws(()=>e.action('a',{type:'hire',role:'sentry'}),/full/);assert.equal(p.credits,100);assert.equal(e.snapshot('a').arcade.guards.length,4);
});
test('squad orders verify ownership and following walks through a district boundary',()=>{
 const {e,p}=game();fort(p);p.x=C.DISTRICTS[0].ox+2170;p.y=C.DISTRICTS[0].oy+1000;e.action('a',{type:'hire',role:'sentry'});const id=p.crew[0].id;e.join('b','Bob','maduro');
 assert.throws(()=>e.action('b',{type:'crewOrder',id,mode:'follow'}),/not in your squad/);assert.throws(()=>e.action('a',{type:'crewOrder',id,mode:'fake'}),/Unknown/);
 e.action('a',{type:'crewOrder',id,mode:'follow'});p.x=C.DISTRICTS.find(d=>d.id==='social').ox+180;tick(e,3);const g=e.arcade.guards[0];assert.ok(g.x>C.DISTRICTS.find(d=>d.id==='social').ox);assert.equal(C.areaAt(g.x,g.y),'social');assert.equal(g.mode,'follow');
 e.action('a',{type:'crewOrder',id,mode:'guard'});assert.equal(p.crew[0].post.x,p.x);
});
test('a hired defender actually fights hostile bots without idle cash rewards or friendly fire',()=>{
 const {e,p}=game();fort(p);e.action('a',{type:'hire',role:'ranger'});const credits=p.credits,g=e.arcade.guards[0],b=e.arcade.bots[0];
 Object.assign(b,{x:g.x+180,y:g.y,hp:70,cooldown:100});e.join('b','Bob','maduro');Object.assign(e.player('b'),{x:g.x+70,y:g.y,hp:100});
 tick(e,8);assert.ok(b.hp<=0);assert.equal(p.crewKills,1);assert.equal(p.credits,credits);assert.equal(e.player('b').hp,100);assert.equal(p.xp,0);
});
test('downed defenders recover without deleting or charging the roster',()=>{
 const {e,p}=game();fort(p);e.action('a',{type:'hire',role:'heavy'});const g=e.arcade.guards[0],credits=p.credits;g.hp=0;g.recover=15;
 tick(e,14);assert.equal(g.hp,0);tick(e,2);assert.equal(g.hp,180);assert.equal(p.credits,credits);assert.equal(p.crew.length,1);
});
test('fortress walls block raiders, defender movement and projectiles',()=>{
 const {e,p}=game();fort(p);e.action('a',{type:'build',kind:'wall',col:8,row:8});e.action('a',{type:'hire',role:'ranger'});const g=e.arcade.guards[0],b=e.arcade.bots[0];
 const wall={x:C.PLOT.x+8*64+32,y:C.PLOT.y+8*64+32};Object.assign(g,{x:wall.x-70,y:wall.y,post:{x:wall.x-70,y:wall.y}});p.crew[0].post={x:wall.x-70,y:wall.y};Object.assign(b,{x:wall.x+70,y:wall.y,hp:70,cooldown:100});
 tick(e,.5);assert.equal(b.hp,70,'Defender must not shoot through the concrete wall');assert.equal(C.blocked(wall.x,wall.y,p),true);
});
test('defense drill pays once, is bounded and cannot be duplicated',()=>{
 const {e,p}=game();fort(p);e.action('a',{type:'defenseDrill'});assert.equal(e.arcade.bots.filter(b=>b.raid).length,4);assert.throws(()=>e.action('a',{type:'defenseDrill'}),/current challenge/);
 const credits=p.credits;for(const b of e.arcade.bots.filter(b=>b.raid))b.hp=0;e.tick(.05);assert.equal(p.defense,null);assert.equal(p.credits,credits+60);assert.equal(p.xp,40);tick(e,2);assert.equal(p.credits,credits+60);assert.equal(e.arcade.bots.filter(b=>b.raid).length,0);assert.throws(()=>e.action('a',{type:'defenseDrill'}),/recharging/);
});
test('defense drill cancellation and expiry remove all temporary raiders',()=>{
 const {e,p}=game();fort(p);e.action('a',{type:'defenseDrill'});e.action('a',{type:'endDefense'});assert.equal(p.defense,null);assert.equal(e.arcade.bots.filter(b=>b.raid).length,0);
 e.action('a',{type:'defenseDrill'});p.defense.timeLeft=.01;p.defense.countdown=0;e.tick(.05);assert.equal(p.defense,null);assert.equal(e.arcade.bots.filter(b=>b.raid).length,0);
});
test('saved crew is bounded and discards forged roles, orders and invalid posts',()=>{
 const crew=C.restoreCrew([{role:'sentry',mode:'follow',post:{x:2100,y:1000}},{role:'ranger',mode:'forged',post:{x:Infinity,y:0}},{role:'fake'},{role:'heavy',mode:'patrol'},{role:'sentry'}]);
 assert.equal(crew.length,3);assert.equal(crew[0].post.x,2100);assert.equal(crew[1].mode,'guard');assert.equal(crew[1].post,undefined);assert.equal(C.restoreCrew(null).length,0);
});

test('being busted during defense cancels the raid without falsely paying a victory reward',()=>{
 const {e,p}=game();fort(p);p.hp=1;p.invulnerable=0;e.action('a',{type:'defenseDrill'});p.defense.countdown=0;
 const b=e.arcade.bots.find(b=>b.raid);Object.assign(b,{x:p.x+10,y:p.y,cooldown:0});tick(e,.8);
 assert.equal(p.defense,null);assert.equal(p.credits,155);assert.equal(p.xp,0);assert.equal(e.arcade.bots.filter(b=>b.raid).length,0);assert.equal(p.x,C.WORLD.spawn.x);
});

test('point-blank shots hit nearby enemies instead of spawning beyond the target',()=>{
 const {e,p}=game(),b=e.arcade.bots[0];Object.assign(b,{x:p.x+28,y:p.y,hp:20,cooldown:100});e.action('a',{type:'fire',x:1,y:0});tick(e,.1);assert.ok(b.hp<=0);assert.equal(p.kills,1);
});
test('a hired squad can clear a complete live raider wave and earn one defense reward',()=>{
 const {e,p}=game();fort(p);p.x=C.DISTRICTS[0].ox+1400;p.y=C.DISTRICTS[0].oy+1200;p.credits=500;p.invulnerable=1000;
 e.action('a',{type:'starterfort'});for(const role of ['sentry','ranger','heavy'])e.action('a',{type:'hire',role});
 const credits=p.credits;e.action('a',{type:'defenseDrill'});tick(e,45);
 assert.equal(p.defense,null);assert.equal(p.crewKills,4);assert.equal(p.credits,credits+60);assert.equal(p.xp,40);
});
