import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRooms} from '../server/city-rooms.mjs';

function game(){
 const root={};root.window=root;
 for(const file of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-clans.js','city-territory.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),root);
 const C=root.MemeCityCore,e=new C.Engine(),p=e.join('solo','Territory QA','offensive');
 for(const b of e.arcade.bots){b.hp=0;b.respawn=10000;}
 e.arcade.zombieNext=1000;e.snapshot(p.id);e.conflict.remaining=9999;
 return {root,C,e,p};
}
function tick(e,n){for(let i=0;i<Math.ceil(n/.05);i++)e.tick(.05);}
function arrive(g,id='offensive'){
 const n=g.C.NEIGHBORHOODS.find(n=>n.id===id);
 g.e.action(g.p.id,{type:'joinClan',clan:id});
 Object.assign(g.p,{x:n.x,y:n.y,invulnerable:1000});
 return n;
}
function invaders(e){return e.arcade.bots.filter(b=>b.territoryRole==='invader'&&b.hp>0);}
function responders(e){return e.arcade.bots.filter(b=>b.territoryRole==='defender'&&b.hp>0);}
function kill(e){for(const b of invaders(e))b.hp=0;}
test('six established clan terminals host one bounded defense in the SAME 11200px world',()=>{
 for(const n of game().C.NEIGHBORHOODS){
  const g=game(),{C,e,p}=g;arrive(g,n.id);
  assert.equal(C.areaAt(p.x,p.y),n.id,n.id+' must be in its original district');
  assert.match(e.action(p.id,{type:'startTerritoryDefense'}),/two raiding waves/);
  assert.equal(e.territoryEvent.clan,n.id);
  assert.equal(e.territoryEvent.enemy,C.FACTIONS[n.id].enemies[0]);
  assert.equal(e.snapshot(p.id).territory.phase,'warning');
  tick(e,4.2);
  assert.equal(e.snapshot(p.id).territory.phase,'active',n.id+' wave 1');
  assert.equal(invaders(e).length,3);
  assert.equal(responders(e).length,1);
  for(const b of [...invaders(e),...responders(e)]){
   assert.equal(C.areaAt(b.x,b.y),n.id,'event stays in this clan block');
   assert.equal(C.blocked(b.x,b.y,p),false,'NPC uses original walkable geometry');
   assert.ok(Math.hypot(b.x-n.x,b.y-n.y)<460);
   assert.ok(e.arcade.bots.length<=64,'standard bot budget remains bounded');
  }
 }
});
test('one real shot contributes, while allied kills never farm credits, XP or wanted heat',()=>{
 const g=game(),{C,e,p}=g;const n=arrive(g);
 e.action(p.id,{type:'startTerritoryDefense'});tick(e,4.2);
 const q=e.territoryEvent,b=invaders(e)[0];
 const original=p.credits;
 const directions=[[1,0],[-1,0],[0,1],[0,-1]];
 let line=null;
 for(let r=40;r<260&&!line;r+=35)for(const [dx,dy]of directions){
  const from={x:n.x+dx*r,y:n.y+dy*r},to={x:from.x+dx*155,y:from.y+dy*155};
  if(C.areaAt(from.x,from.y)!==n.id||C.areaAt(to.x,to.y)!==n.id)continue;
  if(Array.from({length:24},(_,i)=>({x:from.x+(to.x-from.x)*i/23,y:from.y+(to.y-from.y)*i/23})).some(o=>C.blocked(o.x,o.y,p)))continue;
  line={from,to,dx,dy};break;
 }
 assert.ok(line,'the original map must have an unobstructed clan street');
 Object.assign(p,line.from);Object.assign(b,{...line.to,hp:95,maxHp:95,cooldown:100});
 e.action(p.id,{type:'fire',x:line.dx,y:line.dy,manual:true});
 tick(e,.42);
 assert.ok(q.damage>0,'only the original direct weapon simulation adds participation');
 assert.equal(p.credits,original,'a nonlethal raider hit is not a mission payment');
 assert.equal(p.heat,0,'sanctioned defense causes no artificial wanted level');
 for(const other of invaders(e))other.hp=0;
 tick(e,.1);
 assert.equal(p.credits,original,'NPC finishes do not auto-pay');
});
test('exactly two waves, victory/assisted tiers, original clan reputation and one-time claim',()=>{
 for(const qualified of [true,false]){
  const g=game(),{e,p}=g;arrive(g);
  const initial={credits:p.credits,xp:p.xp,rep:p.reputation.offensive,save:JSON.stringify(p.outposts)};
  e.action(p.id,{type:'startTerritoryDefense'});tick(e,4.2);
  if(qualified){e.territoryEvent.damage=70;e.territoryEvent.active=9;}
  kill(e);e.tick(.05);
  assert.equal(e.territoryEvent.phase,'warning');
  tick(e,4.2);
  assert.equal(e.territoryEvent.wave,2);
  assert.equal(invaders(e).length,4);
  kill(e);e.tick(.05);
  assert.equal(e.territoryEvent,null,'finished event always releases the room');
  assert.equal(p.territoryResult.status,qualified?'won':'assisted');
  assert.equal(p.credits,initial.credits+(qualified?55:0));
  assert.equal(p.xp,initial.xp+(qualified?50:0));
  assert.equal(p.reputation.offensive,initial.rep+(qualified?1:0));
  assert.equal(JSON.stringify(p.outposts),initial.save,'private plot/save layout untouched');
  tick(e,1);
  assert.equal(p.credits,initial.credits+(qualified?55:0),'no duplicate payouts');
  assert.equal(e.arcade.bots.some(b=>b.territoryRole),false,'event actors despawn');
  assert.throws(()=>e.action(p.id,{type:'startTerritoryDefense'}),/recharging/);
 }
});
test('retreat, leaving the district, bust and timeout all deny reward and clear actors',()=>{
 for(const status of ['abandoned','left','busted','expired']){
  const g=game(),{e,p}=g;arrive(g);
  const start=p.credits;
  e.action(p.id,{type:'startTerritoryDefense'});tick(e,4.2);
  if(status==='abandoned')e.action(p.id,{type:'endTerritoryDefense'});
  if(status==='left'){p.x+=800;e.tick(.05);}
  if(status==='busted'){p.deaths++;e.tick(.05);}
  if(status==='expired'){e.territoryEvent.remaining=.01;e.tick(.05);}
  assert.equal(e.territoryEvent,null,status);
  assert.equal(p.territoryResult.status,status);
  assert.equal(p.territoryResult.reward,0);
  assert.equal(p.credits,start);
  assert.equal(e.arcade.bots.some(b=>b.territoryRole),false);
  assert.equal(e.arcade.bullets.some(b=>String(b.sourceId).includes('district-')),false);
 }
});
test('only an eligible clan owner at the physical terminal can start; shared room has one defense',()=>{
 const g=game(),{e,p,C}=g;
 assert.throws(()=>e.action(p.id,{type:'startTerritoryDefense'}),/Join a clan/);
 e.action(p.id,{type:'joinClan',clan:'offensive'});
 assert.throws(()=>e.action(p.id,{type:'startTerritoryDefense'}),/Walk to your own clan/);
 arriveAt(p,C.NEIGHBORHOODS.find(n=>n.id==='offensive'));
 p.contract={type:'bounty'};assert.throws(()=>e.action(p.id,{type:'startTerritoryDefense'}),/active challenge/);
 p.contract=null;p.heat=25;assert.throws(()=>e.action(p.id,{type:'startTerritoryDefense'}),/wanted pursuit/);
 p.heat=0;
 e.action(p.id,{type:'startTerritoryDefense'});
 assert.throws(()=>e.action(p.id,{type:'joinClan',clan:'exit'}),/district defense/);
 assert.throws(()=>e.action(p.id,{type:'blockJob',job:'hold'}),/district defense/);
 const q=e.join('other','Other','offensive');
 e.action(q.id,{type:'joinClan',clan:'congress'});
 arriveAt(q,C.NEIGHBORHOODS.find(n=>n.id==='congress'));
 assert.throws(()=>e.action(q.id,{type:'startTerritoryDefense'}),/already active/);
});
function arriveAt(p,n){p.x=n.x;p.y=n.y;}
test('server-owned Together actions do not accept forged health, money or remote participation',()=>{
 const {C}=game();let clock=10000,rooms=createRooms(C.Engine,{now:()=>clock});
 const join=(name,ip)=>rooms.join({name,avatar:'offensive',layoutVersion:C.LAYOUT_VERSION},ip);
 const a=join('Owner','127.0.0.41'),b=join('Visitor','127.0.0.42');
 const sa=rooms.auth(a.session),sb=rooms.auth(b.session),e=rooms.first.engine;
 const act=(session,payload)=>{clock+=200;return rooms.action(session,payload);};
 const p=e.player(sa.id),other=e.player(sb.id);
 act(sa,{type:'joinClan',clan:'offensive'});
 assert.throws(()=>act(sa,{type:'startTerritoryDefense',credits:999999}),/Walk to your own clan/);
 const n=C.NEIGHBORHOODS.find(n=>n.id==='offensive');arriveAt(p,n);
 act(sa,{type:'startTerritoryDefense',credits:999999,damage:999999});
 assert.equal(p.credits,180);
 assert.equal(rooms.snapshot(sa).territory.mine,true);
 assert.equal(rooms.snapshot(sb).territory.mine,false);
 assert.equal(rooms.snapshot(sb).territory.damage,0);
 assert.throws(()=>act(sb,{type:'endTerritoryDefense'}),/no active district defense/);
 act(sb,{type:'joinClan',clan:'congress'});
 const n2=C.NEIGHBORHOODS.find(n=>n.id==='congress');arriveAt(other,n2);
 assert.throws(()=>act(sb,{type:'startTerritoryDefense'}),/already active/);
 act(sa,{type:'endTerritoryDefense'});
 assert.equal(rooms.snapshot(sb).territory.phase,'idle');
 assert.equal(p.credits,180);
});
test('the one world route, alert HUD and shared player NPC rigs render territory feedback',()=>{
 const html=fs.readFileSync(new URL('../city.html',import.meta.url),'utf8'),
  js=fs.readFileSync(new URL('../city.js',import.meta.url),'utf8');
 assert.ok(html.includes('city-territory.js?v=40-district-defense'));
 assert.ok(js.includes('DISTRICT DEFENSE /'));
 assert.ok(js.includes('BLOCK INVADER'));
 assert.ok(js.includes('DISTRICT RESPONDING'));
 assert.ok(js.includes("type:'startTerritoryDefense'"));
 assert.ok(js.includes("type:'endTerritoryDefense'"));
 assert.ok(js.includes('state.territory?.phase'));
 assert.ok(!html.includes('city-world2-online.js'));
});
