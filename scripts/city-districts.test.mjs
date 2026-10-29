import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={};for(const f of ['city-core.js','city-arcade.js'])vm.runInNewContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),context);
const C=context.MemeCityCore;
function setup(){const e=new C.Engine();e.join('a','Builder','offensive');e.join('b','Visitor','maduro');return e;}
function atFortress(e){Object.assign(e.player('a'),{x:1120,y:1280,area:'fortress'});}
function walk(e,p,x,y){
 for(const [axis,to]of [['x',x],['y',y]])for(let i=0;Math.abs(p[axis]-to)>.1&&i<2000;i++){const before=p[axis],d=to-before;e.input(p.id,axis==='x'?Math.sign(d):0,axis==='y'?Math.sign(d):0);e.tick(Math.min(.05,Math.abs(d)/205));assert.notEqual(p[axis],before,'Walking route must remain passable');}
 e.input(p.id,0,0);assert.ok(Math.hypot(p.x-x,p.y-y)<1);
}
test('one expanded map allows walking across every district boundary without teleporting',()=>{
 const e=setup(),p=e.player('a');for(const b of e.arcade.bots){b.hp=0;b.respawn=10000;}p.invulnerable=10000;
 assert.equal(C.WORLD.width,6720);assert.equal(C.WORLD.height,6720);
 walk(e,p,2320,900);walk(e,p,1120,1280);assert.equal(p.area,'fortress');
 walk(e,p,2120,1280);walk(e,p,2120,2560);walk(e,p,1120,2560);assert.equal(p.area,'arena');
 walk(e,p,2120,2560);walk(e,p,2120,950);walk(e,p,5600,950);walk(e,p,5600,1080);assert.equal(p.area,'creator');
 walk(e,p,4660,1080);walk(e,p,4660,2780);walk(e,p,5600,2780);assert.equal(p.area,'social');
 const before={x:p.x,y:p.y};assert.throws(()=>e.action('a',{type:'travel',area:'hub'}),/Walk/);assert.equal(p.x,before.x);assert.equal(p.y,before.y);
});
test('construction charges once, validates tiles and kinds, and refunds the exact price',()=>{
 const e=setup(),p=e.player('a');assert.throws(()=>e.action('a',{type:'build',col:0,row:0,kind:'wall'}),/fortress/);
 atFortress(e);
 for(const bad of [{col:-1,row:0},{col:16,row:0},{col:0,row:10},{col:0.5,row:0}])assert.throws(()=>e.action('a',{type:'build',...bad,kind:'wall'}),/tile/);
 assert.throws(()=>e.action('a',{type:'build',col:0,row:0,kind:'fake'}),/Unknown/);
 e.action('a',{type:'build',col:0,row:0,kind:'wall',rotation:5});assert.equal(p.credits,172);assert.equal(p.plot[0].rotation,1);
 assert.throws(()=>e.action('a',{type:'build',col:0,row:0,kind:'tower'}),/Remove/);assert.equal(p.credits,172);
 e.action('a',{type:'demolish',col:0,row:0});assert.equal(p.credits,180);assert.equal(p.plot.length,0);
 assert.throws(()=>e.action('a',{type:'demolish',col:0,row:0}),/empty/);assert.equal(p.credits,180);
 p.credits=0;assert.throws(()=>e.action('a',{type:'build',col:0,row:0,kind:'wall'}),/Not enough/);assert.equal(p.plot.length,0);
});
test('solid construction blocks walking and cannot be placed under the builder',()=>{
 const e=setup(),p=e.player('a');atFortress(e);e.action('a',{type:'build',col:0,row:0,kind:'wall'});
 assert.ok(C.blocked(625,475,p));assert.equal(C.blocked(700,475,p),false);
 p.x=625;p.y=545;assert.throws(()=>e.action('a',{type:'build',col:0,row:1,kind:'tower'}),/Move off/);
 p.x=585;p.y=475;e.input('a',1,0);e.tick(.1);assert.ok(p.x<600);
});
test('starter fortress is atomic, affordable from a fresh game, and refundable',()=>{
 const e=setup(),p=e.player('a');atFortress(e);p.credits=156;
 assert.throws(()=>e.action('a',{type:'starterfort'}),/157/);assert.equal(p.plot.length,0);assert.equal(p.credits,156);
 p.credits=180;e.action('a',{type:'starterfort'});assert.equal(p.plot.length,15);assert.equal(p.credits,23);
 assert.throws(()=>e.action('a',{type:'starterfort'}),/empty/);assert.equal(p.credits,23);
 for(const o of [...p.plot])e.action('a',{type:'demolish',col:o.col,row:o.row});assert.equal(p.credits,180);
});
test('peaceful districts stay safe and cannot claim main-city checkpoint rewards',()=>{
 const e=setup(),p=e.player('a'),d=C.DISTRICTS.find(d=>d.id==='creator');Object.assign(p,{x:d.x,y:d.y,invulnerable:0});
 const b=e.arcade.bots.find(b=>b.kind==='gang');Object.assign(b,{x:p.x+10,y:p.y,cooldown:0});
 const credits=p.credits;for(let i=0;i<50;i++)e.tick(.1);assert.equal(p.hp,100);assert.equal(p.credits,credits);assert.equal(p.area,'creator');
 assert.throws(()=>e.action('a',{type:'fire',x:1,y:0}),/peaceful/);
 assert.throws(()=>e.action('a',{type:'contract',job:'bounty'}),/peaceful/);
 assert.throws(()=>e.action('a',{type:'checkpoint'}),/main city/);
});
test('saved plots drop malformed, duplicate and out-of-bounds pieces, and bound size',()=>{
 const plot=C.restorePlot([{col:0,row:0,kind:'wall',rotation:-1},{col:0,row:0,kind:'home'},{col:100,row:0,kind:'wall'},{col:1,row:1,kind:'fake'},null,{col:2,row:1,kind:'banner',extra:'discard'}]);
 assert.equal(plot.length,2);assert.equal(plot[0].rotation,3);assert.equal(plot[1].extra,undefined);assert.equal(C.restorePlot({}).length,0);
 assert.ok(C.restorePlot(Array.from({length:1000},()=>({col:0,row:0,kind:'wall'}))).length<=160);
});
test('private plot snapshots copy construction and never publish it in peer profiles',()=>{
 const e=setup();atFortress(e);e.action('a',{type:'build',col:0,row:0,kind:'wall'});
 const snapshot=e.snapshot('a');snapshot.self.plot[0].kind='home';assert.equal(e.player('a').plot[0].kind,'wall');
 assert.equal(e.player('b').plot.length,0);assert.equal(e.snapshot('b').players.find(p=>p.id==='a').plot,undefined);
});

test('old solo position migration moves each saved character into the matching world district',()=>{
 const hub=C.oldPosition('hub',1120,900);assert.equal(hub.x,C.WORLD.spawn.x);assert.equal(hub.y,C.WORLD.spawn.y);
 for(const d of C.DISTRICTS){const pos=C.oldPosition(d.id,1120,900);assert.equal(C.areaAt(pos.x,pos.y),d.id);}
});
