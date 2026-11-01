import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setup(){
 const c={};for(const file of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-clans.js','city-monk.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),c);
 const e=new c.MemeCityCore.Engine(),p=e.join('a','Player','offensive');
 Object.assign(p,{x:4200,y:900,hp:40,invulnerable:1000});
 for(const b of e.arcade.bots){b.hp=0;b.respawn=10000;}
 const enemy=e.arcade.bots[0];Object.assign(enemy,{x:4400,y:900,homeX:4400,homeY:900,hp:70,cooldown:1000});
 return {c,e,p,enemy};
}
function tick(e,seconds){for(let i=0;i<Math.ceil(seconds*20);i++)e.tick(.05);}
function spawn(e){e.monkEvent={wait:0,active:null};e.monkRandom=()=>0;e.tick(.05);assert.ok(e.monkEvent.active);}

test('monk is an actual random encounter gated on proximity and danger/need',()=>{
 const {e,p,enemy}=setup();
 e.monkRandom=()=>0;e.tick(.05);assert.equal(e.snapshot('a').monk,null,'initial 90s warm-up');
 e.monkEvent.wait=0;e.monkRandom=()=>.9;e.tick(.05);assert.equal(e.snapshot('a').monk,null,'random roll can fail');
 p.hp=100;enemy.hp=0;e.monkRandom=()=>0;e.monkEvent.wait=0;e.tick(.05);
 assert.equal(e.snapshot('a').monk,null,'no injuries and no hostiles means no encounter');
 enemy.hp=70;spawn(e);
 assert.match(e.snapshot('a').monk.prayer,/brokenhearted/);
 assert.equal(e.snapshot('a').monk.praise,'Praise Yahweh! Praise Yeshua!');
});

test('20 separate Hebrew and English scripture/song passages are carried in live snapshots',()=>{
 const {c,e}=setup(),v=c.CityMonk.VERSES;
 assert.equal(v.length,20);
 assert.equal(v.filter(q=>q.kind==='Scripture').length,16);
 assert.equal(v.filter(q=>q.kind==='Song / breath prayer').length,4);
 for(const q of v){assert.match(q.he,/[א-ת]/);assert.ok(q.en.length>=12);assert.ok(q.ref.length>=5);}
 spawn(e);const first=e.snapshot('a').monk.quote;
 assert.equal(first.ref,'Psalm 147:3');
 tick(e,6.1);const next=e.snapshot('a').monk.quote;
 assert.notEqual(next.ref,first.ref,'random selection avoids immediate repeat even when RNG is constant');
 assert.match(next.he,/[א-ת]/);
 assert.ok(!next.en.includes('<script'));
});

test('monk heals the protected player and his allied guards, but not enemies or unaligned players',()=>{
 const {e,p,enemy}=setup();p.clan='offensive';
 const outsider=e.join('other','Nonallied','congress');
 Object.assign(outsider,{x:p.x,y:p.y,hp:50,invulnerable:1000,clan:'exit'});
 const teammate=e.join('team','Teammate','offensive');
 Object.assign(teammate,{x:p.x,y:p.y,hp:40,invulnerable:1000,clan:'offensive'});
 p.crew=[{id:'crew-1',role:'sentry',mode:'follow',post:{x:p.x+35,y:p.y+30}}];
 spawn(e);
 // Crew entities are owned by players; they are not unrelated world NPCs.
 e.tick(.05);
 const g=e.arcade.guards.find(g=>g.owner===p.id);
 assert.ok(g,'the hired defender exists');
 Object.assign(g,{x:e.monkEvent.active.x,y:e.monkEvent.active.y,hp:40,invulnerable:1000});
 const original=p.hp,credits=p.credits;tick(e,4);
 assert.ok(p.hp>original);
 assert.ok(teammate.hp>40);
 assert.equal(outsider.hp,50,'unrelated enemy players do not receive the blessing');
 assert.ok(g.hp>40,'allied hired defender receives healing');
 assert.ok(enemy.hp<70,'fire vortex damages an actual hostile');
 assert.equal(p.kills,0);assert.equal(p.credits,credits,'monk creates no idle rewards');
 assert.ok(p.hp<=100);
});

test('two independent bounded fire tornadoes appear during a combat rescue',()=>{
 const {e,p,enemy}=setup();spawn(e);const before=enemy.hp;
 tick(e,8);
 const m=e.snapshot('a').monk;
 assert.equal(m.tornadoes.length,2);
 assert.ok(m.tornadoes.every(t=>Number.isFinite(t.x)&&Number.isFinite(t.y)));
 assert.ok(enemy.hp<before);
 m.tornadoes[0].x=-777;
 assert.notEqual(e.monkEvent.active.tornadoes[0].x,-777,'snapshot positions are detached');
});

test('encounter expires, respects interiors and cooldown, snapshots are detached',()=>{
 const {e,p}=setup();spawn(e);
 const s=e.snapshot('a');s.monk.tornado.x=-1;
 assert.notEqual(e.monkEvent.active.tornadoes[0].x,-1);
 tick(e,31);assert.equal(e.snapshot('a').monk,null);
 assert.ok(e.monkEvent.wait>100);
 p.hp=40;Object.assign(e.arcade.bots[0],{hp:70,x:p.x+200,y:p.y});spawn(e);
 p.room={id:'arcade',theme:'arcade',x:600,y:685};
 e.tick(.05);assert.equal(e.snapshot('a').monk,null);
});

test('friendly factions and walls are never hit by monk tornadoes',()=>{
 const {c,e,p,enemy}=setup();
 assert.equal(c.CityMonk.hostile(enemy,{clan:'exit'}),false);
 assert.equal(c.CityMonk.hostile({...enemy,kind:'cop'},{heat:0}),false);
 assert.equal(c.CityMonk.hostile({...enemy,owner:'a'},p),false);
 spawn(e);const m=e.monkEvent.active;
 Object.assign(m,{x:3100,y:1100});
 Object.assign(p,{x:3100,y:1400,hp:40});
 Object.assign(enemy,{x:3200,y:1400,cooldown:1000});
 Object.assign(m.tornadoes[0],{x:3200,y:1100});
 tick(e,1);
 assert.equal(enemy.hp,70);
 assert.equal(p.hp,40);
});
