import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setup(){
 const context={};
 for(const file of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-clans.js','city-monk.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),context);
 const e=new context.MemeCityCore.Engine(),p=e.join('solo','Undead Tester','offensive');
 Object.assign(p,{x:3500,y:4250,hp:100,invulnerable:1000});
 for(const b of e.arcade.bots){b.hp=0;b.respawn=10000;}
 e.zombieRandom=()=>0;
 e.arcade.zombieNext=0;
 e.tick(.05);
 return {e,p,C:context.MemeCityCore,zombies:()=>e.arcade.bots.filter(b=>b.kind==='zombie')};
}
function tick(e,t){for(let i=0;i<Math.ceil(t*20);i++)e.tick(.05);}

test('walkers materialize exclusively in dead zones outside cities and clan bases',()=>{
 const {e,p,C,zombies}=setup();
 assert.ok(zombies().length>=1,'zombies rise near the greenbelt explorer');
 for(const z of zombies()){
  assert.equal(C.areaAt(z.originalX,z.originalY),'greenbelt');
  assert.equal(C.blocked(z.originalX,z.originalY),false);
  assert.ok(Math.hypot(z.originalX-p.x,z.originalY-p.y)>=250);
  for(const r of [{ox:C.HUB.x,oy:C.HUB.y},...C.DISTRICTS,...C.NEIGHBORHOODS]){
   const d=Math.hypot(Math.max(r.ox-z.originalX,0,z.originalX-r.ox-2240),Math.max(r.oy-z.originalY,0,z.originalY-r.oy-1660));
   assert.ok(d>=100,'not inside the settlement perimeter');
  }
 }
 assert.equal(e.snapshot('solo').arcade.bots.filter(b=>b.kind==='zombie').length,zombies().length);
});

test('zombies ignore clan affiliation and bite even neutral human players',()=>{
 const {e,p,C,zombies}=setup(),z=zombies()[0];
 for(const clan of ['offensive','congress','exit','redacted']){
  assert.equal(C.npcHostile(z,{id:'different',clan,heat:0}),true);
 }
 Object.assign(p,{x:z.x+20,y:z.y,hp:85,invulnerable:0,heat:0});
 tick(e,1.7);
 assert.ok(p.hp<85,'zombie bites human player even when unprovoked');
 assert.equal(p.heat,0,'undead combat is not criminal heat');
});

test('zombies bite hostile and friendly NPCs and hired guards instead of sharing factions',()=>{
 const {e,p,zombies}=setup(),z=zombies()[0];
 Object.assign(p,{x:1200,y:900,invulnerable:1000});
 const cop=e.arcade.bots.find(b=>b.kind==='cop');
 Object.assign(cop,{x:z.x+22,y:z.y,hp:100,maxHp:100,cooldown:100});
 tick(e,1.6);
 assert.ok(cop.hp<100,'zombie attacks even police NPCs');
 cop.hp=0;cop.respawn=1000;
 p.crew=[{id:'crew-1',role:'sentry',mode:'guard',post:{x:z.x+25,y:z.y}}];
 e.tick(.05);
 const g=e.arcade.guards.find(g=>g.owner===p.id);
 assert.ok(g,'hired defender was created');
 Object.assign(g,{x:z.x+20,y:z.y,hp:80,cooldown:1000});
 z.bite=0;
 e.tick(.05);
 assert.ok(g.hp<80,'zombies damage player-owned guards');
});

test('player fire and armed NPCs can kill walkers without generating credits or wanted heat',()=>{
 const {e,p,zombies}=setup(),z=zombies()[0];
 Object.assign(p,{x:3500,y:4250,invulnerable:1000,heat:0,credits:180,xp:0});
 Object.assign(z,{x:3645,y:4250,hp:20,maxHp:85,speed:0,bite:100});
 e.action(p.id,{type:'fire',x:1,y:0});
 tick(e,.4);
 assert.ok(z.hp<=0,'the existing player blaster can damage zombies');
 assert.equal(p.credits,180,'no idle money farm from dead-zone horde');
 assert.equal(p.xp,0,'no extra passive rewards');
 assert.equal(p.heat,0,'defending against walkers generates no wanted status');
 const other=setup(),walker=other.zombies()[0],cop=other.e.arcade.bots.find(b=>b.kind==='cop');
 Object.assign(walker,{x:3645,y:4250,speed:0,bite:100});
 Object.assign(cop,{x:walker.x-145,y:walker.y,hp:100,cooldown:0,windup:0});
 Object.assign(other.p,{x:walker.x+110,y:walker.y,invulnerable:1000});
 other.e.arcade.zombieNext=1000;
 const initial=walker.hp;tick(other.e,1.3);
 assert.ok(walker.hp<initial,'other armed NPCs shoot the undead as street rivals. Cop: '+cop.state+', Zombie '+walker.hp+'/'+initial+', shots '+other.e.arcade.bullets.length);
});

test('horde cap, expiration, and no save mutations',()=>{
 const {e,p,zombies}=setup();
 const initial=p.credits,inventory=JSON.stringify(p.inventory),plot=JSON.stringify(p.plot);
 for(let i=0;i<20;i++){e.arcade.zombieNext=0;e.tick(.05);}
 assert.ok(zombies().filter(z=>z.hp>0).length<=12);
 assert.equal(p.credits,initial);assert.equal(JSON.stringify(p.inventory),inventory);
 assert.equal(JSON.stringify(p.plot),plot);
 for(const z of zombies())z.age=165;
 e.tick(.05);
 assert.equal(zombies().filter(z=>z.hp>0).length,0,'old zombies retire instead of respawning in protected areas');
});

test('Canvas zombie is a separate visual NPC, not a recolored faction avatar',()=>{
 const city=fs.readFileSync(new URL('../city.js',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../city.html',import.meta.url),'utf8');
 assert.ok(city.includes('function drawZombie('));
 assert.ok(city.includes("if(b.kind==='zombie'){drawZombie("));
 assert.ok(html.includes('city-arcade.js?v=33-zombies'));
 assert.ok(html.includes('city.js?v=33-zombies'));
});
