import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function game(){const c={};for(const f of ['city-core.js','city-arcade.js'])vm.runInNewContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),c);const e=new c.MemeCityCore.Engine();e.join('a','Alice','offensive');return{e,p:e.player('a'),C:c.MemeCityCore};}
function tick(e,seconds){for(let i=0;i<Math.ceil(seconds/.05);i++)e.tick(.05);}
function isolate(e){for(const b of e.arcade.bots){b.hp=0;b.respawn=1000;}}
test('arcade snapshots include active gangs, police and pickups without granting a purchase perk',()=>{const {e,p,C}=game();const s=e.snapshot('a');assert.equal(s.arcade.bots.filter(b=>b.kind==='gang').length,14);assert.equal(s.arcade.bots.filter(b=>b.kind==='cop').length,10);assert.equal(p.hp,100);assert.equal(p.credits,180);assert.equal(p.inventory.length,0);assert.throws(()=>e.action('a',{type:'grantTokenReward'}),/Unknown action/);});
test('starter blaster hits enemy bots, pays one KO reward and respects cooldown',()=>{const {e,p,C}=game();isolate(e);const b=e.arcade.bots[0];Object.assign(b,{x:p.x+115,y:p.y,hp:70,respawn:0});p.invulnerable=0;let count=0;for(let i=0;i<3;i++){e.action('a',{type:'fire',x:C.HUB.x+1,y:0});assert.throws(()=>e.action('a',{type:'fire',x:C.HUB.x+1,y:0}),/cooling down/);tick(e,.3);count++;}assert.equal(b.hp<=0,true);assert.equal(p.kills,1);assert.equal(p.xp,20);assert.equal(p.credits,198);assert.equal(count,3);});
test('enemy attacks cause a recoverable bust without negative credits or lost equipment',()=>{const {e,p,C}=game();isolate(e);const b=e.arcade.bots[0];Object.assign(p,{x:C.HUB.x+1600,y:800,hp:5,invulnerable:0,credits:10,contract:{type:'bounty',progress:0,remaining:80,started:0}});Object.assign(b,{x:C.HUB.x+1610,y:800,hp:70,cooldown:0});tick(e,.65);assert.equal(p.hp,100);assert.equal(p.x,C.WORLD.spawn.x);assert.equal(p.y,900);assert.equal(p.credits,0);assert.equal(p.heat,0);assert.equal(p.contract,null);assert.equal(p.deaths,1);assert.match(p.notice,/Busted/);});
test('contracts validate destinations, expire, and cannot double-pay',()=>{const {e,p,C}=game();isolate(e);e.action('a',{type:'contract',job:'courier'});tick(e,3);assert.throws(()=>e.action('a',{type:'contract',job:'bounty'}),/current contract/);assert.throws(()=>e.action('a',{type:'deliver'}),/closer/);Object.assign(p,C.WORLD.route[1]);e.action('a',{type:'deliver'});assert.equal(p.credits,265);assert.equal(p.xp,100);assert.equal(p.jobs,1);assert.throws(()=>e.action('a',{type:'deliver'}),/No delivery/);tick(e,6);e.action('a',{type:'contract',job:'courier'});tick(e,69);assert.equal(p.contract,null);assert.equal(p.credits,265);assert.match(p.notice,/expired/);});
test('dash cooldown and swept collision prevent passing through building walls',()=>{const {e,p,C}=game();isolate(e);Object.assign(p,{x:C.HUB.x+100,y:250});e.input('a',1,0);e.action('a',{type:'dash'});assert.throws(()=>e.action('a',{type:'dash'}),/recharging/);tick(e,.25);assert.ok(p.x<C.HUB.x+120);assert.equal(C.blocked(p.x,p.y),false);tick(e,3);assert.doesNotThrow(()=>e.action('a',{type:'dash'}));});
test('wanted heat cools and escape contract rewards surviving the pursuit',()=>{const {e,p,C}=game();isolate(e);e.action('a',{type:'contract',job:'escape'});assert.equal(p.heat,80);tick(e,26);assert.equal(p.contract,null);assert.equal(p.jobs,1);assert.equal(p.credits,300);assert.equal(p.xp,100);assert.ok(p.heat<8);});
test('bots cannot damage other human players through player projectiles',()=>{const {e,p,C}=game();isolate(e);const b=e.join('b','Bob','maduro');Object.assign(b,{x:p.x+90,y:p.y,invulnerable:0});e.action('a',{type:'fire',x:C.HUB.x+1,y:0});tick(e,.3);assert.equal(b.hp,100);});
test('token purchase UI uses only catalog mints and clearly separates assets from gameplay',()=>{const js=fs.readFileSync(new URL('../city.js',import.meta.url),'utf8');assert.ok(js.includes('beta.html?buy=${encodeURIComponent(t.mint)}#wallet-buy'));assert.ok(js.includes('All six basic outfits and clans are free'));assert.ok(js.includes("window.MEME_TOKENS.filter(t=>t.mint)"));assert.ok(!js.includes('sendTransaction'));});
test('completed, abandoned and expired contracts release their temporary enemy waves',()=>{
 const {e,p,C}=game();isolate(e);
 for(let run=0;run<5;run++){
  e.action('a',{type:'contract',job:'bounty'});assert.equal(e.arcade.bots.filter(b=>b.owner==='a').length,4);
  e.action('a',{type:'abandon'});assert.equal(e.arcade.bots.filter(b=>b.owner==='a').length,0);tick(e,6);
 }
 e.action('a',{type:'contract',job:'bounty'});tick(e,3);p.invulnerable=100;
 for(let i=0;i<4;i++){
  const b=e.arcade.bots.find(b=>b.owner==='a'&&b.hp>0);Object.assign(b,{x:p.x+85,y:p.y,hp:1});
  e.action('a',{type:'fire',x:C.HUB.x+1,y:0});tick(e,.3);
 }
 assert.equal(p.contract,null);assert.equal(p.jobs,1);assert.equal(e.arcade.bots.filter(b=>b.owner==='a').length,0);
 assert.equal(p.lastResult.status,'complete');assert.equal(p.lastResult.reward,100);assert.equal(p.lastResult.kills,4);
});
test('stationary dash uses the last facing direction and never requires a held movement key',()=>{
 const {e,p,C}=game();isolate(e);e.input('a',0,-1);e.input('a',0,0);const y=p.y;
 e.action('a',{type:'dash'});tick(e,.15);assert.ok(p.y<y-40);assert.equal(p.x,C.WORLD.spawn.x);
});
test('visible police hold wanted heat; cover allows it to cool',()=>{
 const {e,p,C}=game();isolate(e);const cop=e.arcade.bots.find(b=>b.kind==='cop');
 Object.assign(cop,{hp:100,x:p.x+250,y:p.y,cooldown:100});Object.assign(p,{heat:80,quiet:10,invulnerable:2});
 tick(e,.2);assert.equal(p.policeSeen,true);assert.equal(p.heat,80);
 Object.assign(p,{x:C.HUB.x+330,y:450});Object.assign(cop,{x:C.HUB.x+330,y:100,homeX:C.HUB.x+330,homeY:100});
 tick(e,.2);assert.equal(p.policeSeen,false);assert.ok(p.heat<80);
});
test('melee attacks warn before damage and moving away avoids the hit',()=>{
 const {e,p,C}=game();isolate(e);const b=e.arcade.bots[0];Object.assign(p,{x:C.HUB.x+1700,y:800,invulnerable:0});Object.assign(b,{x:C.HUB.x+1730,y:800,hp:70,cooldown:0});
 tick(e,.1);assert.equal(b.state,'attack');assert.ok(b.windup>0);assert.equal(p.hp,100);
 e.input('a',-1,0);tick(e,.6);assert.equal(p.hp,100);
});
test('fountain and benches are solid, and enemies navigate around the fountain',()=>{
 const {e,p,C}=game();isolate(e);assert.equal(C.blocked(C.HUB.x+1045,730),true);assert.equal(C.blocked(C.HUB.x+840,830),true);
 Object.assign(p,{x:C.HUB.x+1180,y:730,invulnerable:0});const b=e.arcade.bots[0];Object.assign(b,{x:C.HUB.x+940,y:730,hp:70,cooldown:100,targetId:'a',lastSeen:{x:p.x,y:p.y},seenAt:0});
 tick(e,6);assert.ok(Math.hypot(b.x-p.x,b.y-p.y)<100);assert.equal(C.blocked(b.x,b.y),false);
});
test('starting signal prevents immediate damage and premature delivery claims',()=>{
 const {e,p,C}=game();isolate(e);e.action('a',{type:'contract',job:'courier'});Object.assign(p,C.WORLD.route[1]);
 assert.throws(()=>e.action('a',{type:'deliver'}),/starting signal/);assert.throws(()=>e.action('a',{type:'fire',x:C.HUB.x+1,y:0}),/starting/);
 tick(e,3);e.action('a',{type:'deliver'});assert.equal(p.lastResult.status,'complete');assert.equal(p.credits,265);
});
test('leaving a room removes its mission actors and base enemies do not overlap completely',()=>{
 const {e,C}=game();e.action('a',{type:'contract',job:'bounty'});e.leave('a');assert.equal(e.arcade.bots.filter(b=>b.owner==='a').length,0);
 const [a,b]=e.arcade.bots;Object.assign(a,{x:C.HUB.x+1500,y:800});Object.assign(b,{x:C.HUB.x+1500,y:800});tick(e,.5);
 assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>15);
});
test('held fire runs at the simulation rate and stops when the control is released',()=>{
 const {e,p,C}=game();isolate(e);e.trigger('a',true,1,0);tick(e,1.5);
 assert.ok(p.shots>=5&&p.shots<=7);const count=p.shots;
 e.trigger('a',false);tick(e,1);assert.equal(p.shots,count);
 assert.throws(()=>e.trigger('a',true,'bad',0),/Invalid fire control/);
});
