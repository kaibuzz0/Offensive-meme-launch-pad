import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function game(){const c={};for(const f of ['city-core.js','city-arcade.js','city-rise.js'])vm.runInNewContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),c);const e=new c.MemeCityCore.Engine(),p=e.join('a','Alice','offensive');for(const b of e.arcade.bots){b.hp=0;b.respawn=10000;}return {e,p,C:c.MemeCityCore,R:c.CityRising};}
function tick(e,t){for(let i=0;i<Math.ceil(t/.05);i++)e.tick(.05);}
function at(p,n){p.x=n.x;p.y=n.y;}
test('all twelve landmarks are reachable on the connected world and pay once',()=>{
 const {e,p,R,C}=game();const initial=p.credits;
 for(const n of R.LANDMARKS){assert.equal(C.blocked(n.x,n.y,p),false,n.name);at(p,n);e.tick(.05);e.tick(.05);}
 assert.equal(p.rising.found.length,12);assert.equal(p.credits,initial+240);assert.equal(p.xp,240);
});
test('chapters enforce order and cannot be double claimed',()=>{
 const {e,p,R}=game();assert.throws(()=>e.action('a',{type:'claimChapter'}),/objective/);
 for(const n of R.LANDMARKS.slice(0,3)){at(p,n);e.tick(.05);}const before=p.credits;
 e.action('a',{type:'claimChapter'});assert.equal(p.rising.claimed,1);assert.equal(p.credits,before+60);
 assert.throws(()=>e.action('a',{type:'claimChapter'}),/objective/);assert.equal(p.credits,before+60);
 p.jobs=1;e.action('a',{type:'claimChapter'});assert.equal(p.rising.claimed,2);
});
test('legacy migration initializes supplies and restore strips invalid and transient values',()=>{
 const {p,R}=game();assert.equal(p.rising.medkits,2);R.restore(p,{found:['plaza','plaza','fake'],claimed:Infinity,fortLevel:20,medkits:999,bestWave:999,arenaWins:-1,riding:true,arena:{wave:3}});
 assert.equal(p.rising.found.join(','),'plaza');assert.equal(p.rising.claimed,0);assert.equal(p.rising.fortLevel,3);assert.equal(p.rising.medkits,9);assert.equal(p.rising.arena,null);assert.equal(p.rising.riding,false);assert.equal(p.rising.arenaWins,0);
 const saved=R.save(p);R.restore(p,saved);assert.deepEqual(JSON.parse(JSON.stringify(R.save(p))),JSON.parse(JSON.stringify(saved)));
});
test('hoverboard accelerates, crosses district boundaries and stops at cover',()=>{
 const {e,p,C}=game();p.x=C.DISTRICTS[0].ox+2190;p.y=C.DISTRICTS[0].oy+850;e.action('a',{type:'ride'});e.input('a',-1,0);tick(e,1);assert.ok(p.x<C.DISTRICTS[0].ox+2190);assert.equal(C.areaAt(p.x,p.y),'fortress');
 // The east face of Launch House must not be crossed at hoverboard speed.
 const launch=C.WORLD.buildings.find(b=>b.id==='launch');p.x=launch.x+launch.w+70;p.y=launch.y+140;e.input('a',-1,0);tick(e,3);assert.ok(p.x>=launch.x+launch.w+15);assert.equal(C.blocked(p.x,p.y,p),false);
 e.input('a',0,0);tick(e,.1);assert.equal(p.rising.speed,0);
});
test('firing dismounts and active challenges cannot mount a board',()=>{
 const {e,p}=game();e.action('a',{type:'ride'});e.action('a',{type:'fire',x:1,y:0});assert.equal(p.rising.riding,false);
 e.action('a',{type:'contract',job:'bounty'});assert.throws(()=>e.action('a',{type:'ride'}),/challenge/);
});
test('medkits heal a bounded amount, consume once and require a real restock visit',()=>{
 const {e,p,R}=game();assert.throws(()=>e.action('a',{type:'medkit'}),/full/);assert.equal(p.rising.medkits,2);
 p.hp=70;e.action('a',{type:'medkit'});assert.equal(p.hp,100);assert.equal(p.rising.medkits,1);
 assert.throws(()=>e.action('a',{type:'restock'}),/Visit/);at(p,R.GUIDES.find(g=>g.id==='doc'));const before=p.credits;e.action('a',{type:'restock'});assert.equal(p.credits,before-25);assert.equal(p.rising.medkits,2);
});
test('HQ upgrades require construction and funds; healing and squad HP are functional',()=>{
 const {e,p,C}=game();at(p,{x:C.HUB.x+1120,y:C.HUB.y+900});assert.throws(()=>e.action('a',{type:'fortUpgrade'}),/Visit/);at(p,{x:C.WORLD.spawn.x,y:C.WORLD.spawn.y});e.action('a',{type:'starterfort'});
 assert.throws(()=>e.action('a',{type:'fortUpgrade'}),/credits/);p.credits=500;e.action('a',{type:'hire',role:'sentry'});e.tick(.05);const g=e.arcade.guards[0];
 e.action('a',{type:'fortUpgrade'});e.tick(.05);assert.equal(g.maxHp,130);assert.equal(g.hp,130);g.hp=0;g.recover=15;e.action('a',{type:'fortUpgrade'});e.tick(.05);assert.equal(g.hp,0,'an upgrade cannot resurrect a downed guard');
 p.x=C.PLOT.x+7*64+32;p.y=C.PLOT.y+5*64+150;p.hp=50;p.quiet=10;tick(e,2);assert.ok(p.hp>50);
});
test('survival starts only at the terminal, counts down and excludes other challenges',()=>{
 const {e,p,R}=game();assert.throws(()=>e.action('a',{type:'startSurvival'}),/Walk/);at(p,R.GUIDES.find(g=>g.id==='marshal'));e.action('a',{type:'startSurvival'});assert.equal(p.rising.arena.wave,0);tick(e,3.1);assert.equal(p.rising.arena.wave,1);assert.equal(e.arcade.bots.filter(b=>b.arena).length,3);
 assert.throws(()=>e.action('a',{type:'contract',job:'bounty'}),/arena/);assert.throws(()=>e.action('a',{type:'ride'}),/challenge/);
});
test('arena escalates through ranged waves and boss, then awards exactly one clear',()=>{
 const {e,p,R}=game();at(p,R.GUIDES.find(g=>g.id==='marshal'));e.action('a',{type:'startSurvival'});tick(e,3.1);
 for(let wave=1;wave<=3;wave++){
  const bots=e.arcade.bots.filter(b=>b.arena);assert.equal(p.rising.arena.wave,wave);assert.equal(bots.length,wave+2);
  if(wave>=2)assert.ok(bots.some(b=>b.ranged));if(wave===3){const boss=bots.find(b=>b.boss);assert.equal(boss.hp,420);}
  for(const b of bots)b.hp=0;tick(e,wave===3?.1:4.1);
 }
 assert.equal(p.rising.arena,null);assert.equal(p.rising.arenaWins,1);assert.equal(p.rising.bestWave,3);const credits=p.credits;tick(e,2);assert.equal(p.credits,credits);assert.equal(p.rising.arenaResult.reward,180);
 assert.throws(()=>e.action('a',{type:'startSurvival'}),/resetting/);
});
test('abandoning, leaving or getting busted cleans up enemies and grants no clear reward',()=>{
 for(const mode of ['abandon','leave','busted']){
  const {e,p,R}=game();at(p,R.GUIDES.find(g=>g.id==='marshal'));e.action('a',{type:'startSurvival'});tick(e,3.1);const before=p.credits;
  if(mode==='abandon')e.action('a',{type:'endSurvival'});if(mode==='leave')at(p,{x:R.GUIDES.find(g=>g.id==='keeper').x,y:R.GUIDES.find(g=>g.id==='keeper').y});if(mode==='busted')p.deaths++;e.tick(.05);
  assert.equal(p.rising.arena,null);assert.equal(e.arcade.bots.some(b=>b.arena),false);assert.equal(p.rising.arenaWins,0);assert.equal(p.credits,before);
 }
});
test('ranged arena enemies actually fire damaging projectiles instead of melee-only attacks',()=>{
 const {e,p,R}=game();at(p,R.GUIDES.find(g=>g.id==='marshal'));e.action('a',{type:'startSurvival'});tick(e,3.1);const b=e.arcade.bots.find(b=>b.arena);Object.assign(b,{x:p.x+200,y:p.y,ranged:true,cooldown:0,hp:100,maxHp:100});for(const other of e.arcade.bots)if(other!==b){other.hp=0;other.respawn=10000;}p.invulnerable=0;tick(e,2);assert.ok(p.hp<100,'the raider shot must hit a stationary exposed player');
});
test('snapshots isolate chapter data and expose hoverboards for peer rendering',()=>{
 const {e,p}=game();e.action('a',{type:'ride'});const s=e.snapshot('a');assert.equal(s.players[0].riding,true);s.self.rising.found.push('fake');assert.equal(p.rising.found.length,0);
});

test('a complete survival run can be won through real combat with starter kit and healing',()=>{
 const {e,p,R}=game();at(p,R.GUIDES.find(g=>g.id==='marshal'));e.action('a',{type:'startSurvival'});e.trigger('a',true);
 for(let i=0;i<2400&&p.rising.arena;i++){if(p.hp<=55&&p.rising.medkits)e.action('a',{type:'medkit'});e.tick(.05);}
 assert.equal(p.rising.arenaResult.status,'won');assert.equal(p.rising.arenaWins,1);assert.equal(p.kills,12);assert.ok(p.hp>0);
});
