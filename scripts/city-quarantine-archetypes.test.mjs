import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function start(){
 const ctx={};ctx.window=ctx;
 for(const f of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-clans.js','city-monk.js','city-visuals.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),ctx);
 const engine=new ctx.MemeCityCore.Engine(),p=engine.join('solo','Quarantine QA','offensive');
 Object.assign(p,{x:3500,y:4250,hp:100,invulnerable:0});
 for(const b of engine.arcade.bots){b.hp=0;b.respawn=10000;}
 engine.zombieRandom=()=>0;engine.arcade.zombieNext=0;engine.tick(.05);
 return {e:engine,p,C:ctx.MemeCityCore,V:ctx.CityVisuals};
}
function step(e,t){for(let i=0;i<Math.ceil(t*20);i++)e.tick(.05);}
function undead(e){return e.arcade.bots.filter(b=>b.kind==='zombie'&&b.hp>0);}
test('all four quarantined archetypes spawn in the existing world and obey base exclusions',()=>{
 const {e,p,C}=start(),initial=undead(e);
 assert.ok(initial.length,'existing dead zone generates first walkers');
 const found=new Set(initial.map(z=>z.zombieType));
 for(const roll of [.58,.82,.98]){
  e.arcade.bots=e.arcade.bots.filter(b=>b.kind!=='zombie');e.zombieRandom=()=>roll;e.arcade.zombieNext=0;
  e.tick(.05);const spawned=undead(e);
  assert.ok(spawned.length,'spawn variant '+roll);
  for(const z of spawned){
   found.add(z.zombieType);
   assert.ok(['walker','runner','tank','spitter'].includes(z.zombieType));
   assert.equal(C.areaAt(z.originalX,z.originalY),'greenbelt');
   assert.equal(C.blocked(z.originalX,z.originalY),false);
   assert.ok(Math.hypot(z.originalX-p.x,z.originalY-p.y)>=250);
  }
 }
 assert.deepEqual([...found].sort(),['runner','spitter','tank','walker']);
});
test('tank, runner, spitter and walker have different combat stats with no extra NPC slots',()=>{
 const {e}=start(),expected={
  walker:[85,79],runner:[46,148],spitter:[66,67],tank:[230,43]
 };
 for(const [variant,[hp,speed]]of Object.entries(expected)){
  e.arcade.bots=e.arcade.bots.filter(b=>b.kind!=='zombie');
  e.zombieRandom=()=>({walker:0,runner:.6,spitter:.83,tank:.97})[variant];
  e.arcade.zombieNext=0;e.tick(.05);
  const z=undead(e)[0];
  assert.ok(z,'spawned '+variant);
  assert.equal(z.zombieType,variant);
  assert.equal(z.maxHp,hp);
  assert.equal(z.speed,speed);
 }
});
test('delayed ranged spitter hazard shows client warning and resolves once with actual player damage',()=>{
 const {e,p}=start(),z=undead(e)[0];
 // Place at a known clear lane validated by the existing zombie blaster tests.
 e.arcade.bots=e.arcade.bots.filter(b=>b===z||b.kind!=='zombie');
 Object.assign(z,{x:3645,y:4250,zombieType:'spitter',hp:66,maxHp:66,speed:0,bite:100,spitCooldown:0,spitWait:0});
 Object.assign(p,{x:3500,y:4250,hp:100,invulnerable:0});
 e.arcade.zombieNext=1000;
 step(e,.2);
 assert.equal(z.state,'spit');
 step(e,.6);
 const hazards=e.snapshot('solo').arcade.zombieHazards;
 assert.equal(hazards.length,1,'authoritative hazard is present in normal world snapshot');
 assert.equal(hazards[0].damage,9);
 assert.ok(hazards[0].warning>0&&hazards[0].warning<.85,'telegraph before impact');
 step(e,1);
 assert.equal(p.hp,91,'impact hits a player exactly once');
 assert.equal(e.snapshot('solo').arcade.zombieHazards.length,0,'resolved hazard is removed');
 step(e,.6);
 assert.equal(p.hp,91,'no duplicate payout or repeated damage from one impact');
});
test('spit is dodgeable and capped, with no crypto, credits or changes to saved construction',()=>{
 const {e,p}=start(),z=undead(e)[0];
 Object.assign(z,{x:3645,y:4250,zombieType:'spitter',hp:66,maxHp:66,speed:0,bite:100,spitCooldown:0,spitWait:0});
 Object.assign(p,{x:3500,y:4250,hp:100,invulnerable:0});
 const credits=p.credits,xp=p.xp,plot=JSON.stringify(p.plot),inventory=JSON.stringify(p.inventory);
 e.arcade.zombieNext=1000;
 step(e,.78);
 assert.equal(e.arcade.zombieHazards.length,1);
 p.x=3290;p.y=4250;step(e,.95);
 assert.equal(p.hp,100,'stepping out of the marked area avoids the shot');
 assert.equal(p.credits,credits);assert.equal(p.xp,xp);
 assert.equal(JSON.stringify(p.plot),plot);assert.equal(JSON.stringify(p.inventory),inventory);
});
test('four zombie skins use the player solid 360 degree rig and distinct body geometry',()=>{
 const {V}=start(),colors={walker:'#4c5548',runner:'#6b6752',tank:'#4c505d',spitter:'#45665d'};
 for(const [type,coat]of Object.entries(colors))for(let angle=0;angle<360;angle+=30){
  const faces=V.rigSurfaces({role:'zombie',zombieType:type,armed:false,style:{skin:2,hair:1,pants:1}},angle*Math.PI/180);
  assert.ok(faces.length>50,type+' must stay on original solid rig');
  assert.ok(faces.some(f=>f.color===coat),type+' requires a distinctive material/coat');
  for(let i=1;i<faces.length;i++)assert.ok(faces[i-1].depth<=faces[i].depth,'proper 360 mesh sorting');
 }
 const script=fs.readFileSync(new URL('../city.js',import.meta.url),'utf8');
 assert.ok(script.includes('drawZombieHazards(time);drawCombat(time,dt);'));
 assert.ok(script.includes('zombieType:variant'),'same player model receives the visual skin');
});
