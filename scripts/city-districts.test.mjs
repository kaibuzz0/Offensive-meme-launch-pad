import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={};for(const f of ['city-core.js','city-arcade.js'])vm.runInNewContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),context);
const C=context.MemeCityCore;
function setup(){const e=new C.Engine();e.join('a','Builder','offensive');e.join('b','Visitor','maduro');return e;}
test('district transit validates destinations and cannot escape contracts or wanted heat',()=>{
 const e=setup(),p=e.player('a');assert.throws(()=>e.action('a',{type:'travel',area:'fake'}),/Unknown district/);
 p.heat=1;assert.throws(()=>e.action('a',{type:'travel',area:'fortress'}),/heat/);p.heat=0;
 e.action('a',{type:'contract',job:'courier'});assert.throws(()=>e.action('a',{type:'travel',area:'fortress'}),/contract/);
 e.action('a',{type:'abandon'});e.action('a',{type:'travel',area:'fortress'});
 assert.equal(p.area,'fortress');assert.equal(p.x,1120);assert.equal(p.y,1280);assert.equal(p.hp,100);
 e.action('a',{type:'travel',area:'hub'});assert.equal(p.y,C.WORLD.spawn.y);
});
test('construction charges once, validates tiles and kinds, and refunds the exact price',()=>{
 const e=setup(),p=e.player('a');assert.throws(()=>e.action('a',{type:'build',col:0,row:0,kind:'wall'}),/fortress/);
 e.action('a',{type:'travel',area:'fortress'});
 for(const bad of [{col:-1,row:0},{col:16,row:0},{col:0,row:10},{col:0.5,row:0}])assert.throws(()=>e.action('a',{type:'build',...bad,kind:'wall'}),/tile/);
 assert.throws(()=>e.action('a',{type:'build',col:0,row:0,kind:'fake'}),/Unknown/);
 e.action('a',{type:'build',col:0,row:0,kind:'wall',rotation:5});assert.equal(p.credits,172);assert.equal(p.plot[0].rotation,1);
 assert.throws(()=>e.action('a',{type:'build',col:0,row:0,kind:'tower'}),/Remove/);assert.equal(p.credits,172);
 e.action('a',{type:'demolish',col:0,row:0});assert.equal(p.credits,180);assert.equal(p.plot.length,0);
 assert.throws(()=>e.action('a',{type:'demolish',col:0,row:0}),/empty/);assert.equal(p.credits,180);
 p.credits=0;assert.throws(()=>e.action('a',{type:'build',col:0,row:0,kind:'wall'}),/Not enough/);assert.equal(p.plot.length,0);
});
test('solid construction blocks walking and cannot be placed under the builder',()=>{
 const e=setup(),p=e.player('a');e.action('a',{type:'travel',area:'fortress'});e.action('a',{type:'build',col:0,row:0,kind:'wall'});
 assert.ok(C.blocked(625,475,p));assert.equal(C.blocked(700,475,p),false);
 p.x=625;p.y=545;assert.throws(()=>e.action('a',{type:'build',col:0,row:1,kind:'tower'}),/Move off/);
 p.x=585;p.y=475;e.input('a',1,0);e.tick(.1);assert.ok(p.x<600);
});
test('starter fortress is atomic, affordable from a fresh game, and refundable',()=>{
 const e=setup(),p=e.player('a');e.action('a',{type:'travel',area:'fortress'});p.credits=156;
 assert.throws(()=>e.action('a',{type:'starterfort'}),/157/);assert.equal(p.plot.length,0);assert.equal(p.credits,156);
 p.credits=180;e.action('a',{type:'starterfort'});assert.equal(p.plot.length,15);assert.equal(p.credits,23);
 assert.throws(()=>e.action('a',{type:'starterfort'}),/empty/);assert.equal(p.credits,23);
 for(const o of [...p.plot])e.action('a',{type:'demolish',col:o.col,row:o.row});assert.equal(p.credits,180);
});
test('districts do not grant hub checkpoints, pickups, combat rewards or damage',()=>{
 const e=setup(),p=e.player('a');e.action('a',{type:'travel',area:'fortress'});
 const b=e.arcade.bots.find(b=>b.kind==='gang');p.x=b.x;p.y=b.y;p.invulnerable=0;
 const credits=p.credits;for(let i=0;i<50;i++)e.tick(.1);assert.equal(p.hp,100);assert.equal(p.credits,credits);
 assert.throws(()=>e.action('a',{type:'fire',x:1,y:0}),/main city/);
 assert.throws(()=>e.action('a',{type:'contract',job:'bounty'}),/main city/);
 assert.throws(()=>e.action('a',{type:'checkpoint'}),/main city/);
 p.x=e.arcade.pickups[0].x;p.y=e.arcade.pickups[0].y;e.tick(.1);assert.equal(p.credits,credits);
});
test('saved plots drop malformed, duplicate and out-of-bounds pieces, and bound size',()=>{
 const plot=C.restorePlot([{col:0,row:0,kind:'wall',rotation:-1},{col:0,row:0,kind:'home'},{col:100,row:0,kind:'wall'},{col:1,row:1,kind:'fake'},null,{col:2,row:1,kind:'banner',extra:'discard'}]);
 assert.equal(plot.length,2);assert.equal(plot[0].rotation,3);assert.equal(plot[1].extra,undefined);assert.equal(C.restorePlot({}).length,0);
 assert.ok(C.restorePlot(Array.from({length:1000},()=>({col:0,row:0,kind:'wall'}))).length<=160);
});
test('private plot snapshots copy construction and never publish it in peer profiles',()=>{
 const e=setup();e.action('a',{type:'travel',area:'fortress'});e.action('a',{type:'build',col:0,row:0,kind:'wall'});
 const snapshot=e.snapshot('a');snapshot.self.plot[0].kind='home';assert.equal(e.player('a').plot[0].kind,'wall');
 assert.equal(e.player('b').plot.length,0);assert.equal(e.snapshot('b').players.find(p=>p.id==='a').plot,undefined);
});

test('district transit clears in-flight projectiles owned by the travelling player',()=>{
 const e=setup(),p=e.player('a');e.action('a',{type:'fire',x:1,y:0});
 assert.ok(e.arcade.bullets.some(q=>q.owner==='a'));p.heat=0;e.action('a',{type:'travel',area:'fortress'});
 assert.equal(e.arcade.bullets.some(q=>q.owner==='a'),false);assert.equal(p.fireHeld,false);assert.equal(p.lockTarget,null);
});
