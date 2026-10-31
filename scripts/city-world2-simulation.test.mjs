import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx={};
for(const f of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-topology.js','city-nav.js','city-world2.js','city-world2-registry.js','city-world2-simulation.js'])
 vm.runInNewContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),ctx,{filename:f});
const C=ctx.MemeCityCore,T=ctx.CityTopology,I=ctx.CityInteriors,W=ctx.CityWorld2.create(C,I,T);
const R=ctx.CityWorld2Registry.create(C,I,ctx.CityRising,T,W),sim=()=>ctx.CityWorld2Simulation.create(C,W,R,ctx.CityNav);
test('real world2 prototype simulation spawns collision-safe defender, gangs and police',()=>{
 const s=sim();assert.equal(s.agents.filter(a=>a.kind==='defender').length,1);
 assert.equal(s.agents.filter(a=>a.kind==='gang').length,3);
 assert.equal(s.agents.filter(a=>a.kind==='police').length,1);
 for(const a of s.agents)assert.equal(W.blocked(a.x,a.y,s.player),false,a.id);
 assert.equal(T.draft.enabled,false);
});
test('movement uses projected world2 physics and never walks through fortress walls',()=>{
 const s=sim(),first=s.player.y;s.setInput(0,-1);for(let i=0;i<10;i++)s.tick(.05);
 assert.ok(s.player.y<first,'northward walking');
 s.player.x=W.fortress.x+60;s.player.y=W.fortress.y+180;s.setInput(-1,0);
 for(let i=0;i<80;i++)s.tick(.05);
 assert.ok(s.player.x>W.fortress.x+25,'west wall blocks crossing outside gate');
});
test('combat is directional, cooldown-limited and does not shoot allied defenders',()=>{
 const s=sim(),enemy=s.agents.find(a=>a.kind==='gang');
 s.player.x=enemy.x;s.player.y=enemy.y+210;
 const defender=s.agents.find(a=>a.kind==='defender'),allyHp=defender.hp;
 assert.equal(s.fire({x:0,y:-1}).status,'hit');assert.equal(enemy.hp,25);assert.equal(s.player.ammo,23);
 assert.equal(s.fire({x:0,y:-1}).status,'cooldown');
 assert.equal(defender.hp,allyHp);
 for(let i=0;i<3;i++)s.tick(.1);assert.equal(s.fire({x:0,y:-1}).status,'hit');assert.equal(enemy.alive,false);
});
test('insider police only pursue after player heat escalates, and mission awards preview credits only',()=>{
 const s=sim(),cop=s.agents.find(a=>a.kind==='police');
 const start={x:cop.x,y:cop.y};s.player.x=cop.x-190;s.player.y=cop.y;s.tick(.1);
 assert.equal(cop.x,start.x,'no unwarranted police chase');
 assert.equal(s.fire({x:1,y:0}).status,'hit');assert.ok(s.player.heat>=40);
 for(let i=0;i<8;i++)s.tick(.1);assert.ok(cop.x<start.x,'police follows player heat');
 const defense=sim(),initial=defense.player.credits;
 assert.equal(defense.startDefense().status,'active');assert.equal(defense.mission.remaining,3);
 for(const enemy of defense.agents.filter(a=>a.raid)){enemy.hp=0;enemy.alive=false;defense.mission.remaining--;}
 defense.tick(.05);assert.equal(defense.mission.status,'complete');
 assert.equal(defense.player.credits,initial+70);assert.equal(defense.player.xp,90);
 assert.equal(C.WORLD.spawn.x,3360,'legacy engine world unchanged');
});
test('world2 checkpoint rewards require canonical location, build checks access, staged state is not mutated',()=>{
 const s=sim(),p=R.resolve('checkpoint:0');
 assert.equal(s.checkpoint().status,'far');s.player.x=p.x;s.player.y=p.y;
 assert.equal(s.checkpoint().status,'claimed');assert.equal(s.player.route,1);assert.equal(s.player.credits,220);
 s.player.x=W.spawn.x;s.player.y=W.spawn.y;
 assert.equal(s.build(3,3).status,'built');assert.equal(s.build(3,3).status,'occupied');
 assert.equal(s.demolish(3,3).status,'removed');
 const original={version:6,saveVersion:6,worldVersion:2,x:W.spawn.x,y:W.spawn.y,xp:222,credits:400,
  inventory:[{uid:'gear-1',item:'jacket'}],equipped:{outfit:'gear-1'},plot:[{col:4,row:4,kind:'wall'}],crew:[],route:1};
 const raw=JSON.stringify(original);assert.equal(s.loadStage(original).status,'loaded');
 assert.equal(s.player.xp,222);assert.equal(s.player.credits,400);assert.equal(s.player.plot[0].col,4);assert.equal(JSON.stringify(original),raw);
 assert.equal(s.loadStage({...original,worldVersion:1}).status,'invalid');
});
