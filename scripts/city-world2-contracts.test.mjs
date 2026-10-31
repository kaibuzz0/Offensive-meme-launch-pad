import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx={};
for(const path of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-topology.js','city-world2.js','city-world2-registry.js','city-world2-contracts.js'])
 vm.runInNewContext(fs.readFileSync(new URL('../'+path,import.meta.url),'utf8'),ctx,{filename:path});
const C=ctx.MemeCityCore,I=ctx.CityInteriors,T=ctx.CityTopology,W=ctx.CityWorld2.create(C,I,T);
const reg=ctx.CityWorld2Registry.create(C,I,ctx.CityRising,T,W),make=()=>ctx.CityWorld2Contracts.create(reg);
const player=(p)=>({x:p.x,y:p.y,hp:100,xp:0,credits:180,jobs:0});
test('courier requires source launch door and preserves original world1 coordinates',()=>{
 const m=make(),p=player(W.spawn);
 assert.equal(m.state.originId,'door:launch');assert.equal(m.state.targetId,'checkpoint:1');
 assert.equal(m.start(p).status,'far');p.x=m.origin.x;p.y=m.origin.y;
 assert.equal(m.start(p).status,'active');assert.equal(m.state.remaining,210);
 assert.equal(m.start(p).status,'busy');assert.equal(C.WORLD.spawn.x,3360);
});
test('delivery must reach canonical target and awards exactly once',()=>{
 const m=make(),p=player(m.origin);m.start(p);
 assert.equal(m.deliver(p).status,'far');p.x=m.target.x;p.y=m.target.y;
 assert.equal(m.deliver(p).status,'delivered');
 assert.equal(p.xp,75);assert.equal(p.credits,240);assert.equal(p.jobs,1);
 assert.equal(m.deliver(p).status,'inactive');assert.equal(m.start(p).status,'cooldown');
 for(let i=0;i<460;i++)m.tick(.1);
 assert.equal(m.state.status,'idle');assert.equal(m.state.completed,1);
});
test('timeout and abandonment never award XP, and reset clears pending state',()=>{
 const m=make(),p=player(m.origin);m.start(p);
 for(let i=0;i<2100;i++)m.tick(.1);
 assert.equal(m.state.status,'failed');assert.equal(p.credits,180);
 assert.equal(m.start(p).status,'cooldown');
 m.reset();assert.equal(m.start(p).status,'active');
 assert.equal(m.abandon().status,'abandoned');assert.equal(m.deliver(p).status,'inactive');
 m.reset();assert.equal(m.state.completed,0);assert.equal(m.state.status,'idle');
});
test('malformed player coordinates, unavailable health and long ticks cannot complete a job',()=>{
 const m=make();assert.equal(m.start({x:NaN,y:0,hp:100}).status,'far');
 const p=player(m.origin);p.hp=0;assert.equal(m.start(p).status,'down');
 p.hp=100;m.start(p);p.x=Infinity;p.y=m.target.y;
 assert.equal(m.deliver(p).status,'far');m.tick(Infinity);assert.equal(m.state.remaining,210);
});
