import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={};vm.runInNewContext(fs.readFileSync(new URL('../city-core.js',import.meta.url),'utf8'),context);
const {Engine,WORLD,ITEMS,blocked,validIds}=context.MemeCityCore;
function setup(){const e=new Engine();e.join('a','Alice','offensive');e.join('b','Bob','maduro');return e;}
function at(e,id,station){const s=WORLD.stations.find(s=>s.id===station);Object.assign(e.player(id),{x:s.x,y:s.y});}
test('six beta avatar themes match existing configured mint identities',()=>{
 const c={window:{}};for(const f of ['tokens.js','launchpad-config.js'])vm.runInNewContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),c);
 const tokens=[c.window.LAUNCHPAD_CONFIG.platformToken,...c.window.MEME_TOKENS.filter(t=>t.mint)];
 assert.deepEqual([...validIds].sort(),tokens.map(t=>t.id).sort());
 assert.throws(()=>new Engine().join('x','X','unminted'),/Unknown beta avatar/);
 assert.equal(new Engine().join('x','<script>','offensive').xp,0);
});
test('movement normalizes diagonal input, caps steps, and blocks buildings',()=>{
 const e=setup(),p=e.player('a');const start={x:p.x,y:p.y};e.input('a',1000,1000);e.tick(1);
 assert.ok(Math.hypot(p.x-start.x,p.y-start.y)<=20.501);
 Object.assign(p,{x:WORLD.buildings[0].x-16,y:WORLD.buildings[0].y+100});e.input('a',1,0);e.tick(.1);assert.equal(p.x,WORLD.buildings[0].x-16);
 assert.throws(()=>e.input('a',NaN,0),/Invalid/);assert.ok(blocked(-1,0));
});
test('missions require proximity and cannot be claimed twice',()=>{
 const e=setup();assert.throws(()=>e.action('a',{type:'checkpoint'}),/closer/);
 for(const stop of WORLD.route){Object.assign(e.player('a'),stop);e.action('a',{type:'checkpoint'});}
 assert.equal(e.player('a').xp,250);assert.equal(e.player('a').credits,360);
 assert.throws(()=>e.action('a',{type:'checkpoint'}),/already completed/);
 assert.equal(e.player('b').xp,0);
});
test('shop and equipment ownership are enforced by the simulation',()=>{
 const e=setup();assert.throws(()=>e.action('a',{type:'buy',item:'jacket'}),/Visit/);at(e,'a','shop');
 e.action('a',{type:'buy',item:'jacket'});assert.equal(e.player('a').credits,120);
 const item=e.player('a').inventory[0];assert.equal(e.player('a').equipped.outfit,item.uid);
 assert.throws(()=>e.action('b',{type:'equip',uid:item.uid}),/not in your inventory/);
 assert.throws(()=>e.action('a',{type:'buy',item:'boots'}),/Not enough/);
 assert.throws(()=>e.action('a',{type:'setCredits',credits:9999}),/Unknown action/);
});
test('market escrows ownership and transfers one item once with conserved credits',()=>{
 const e=setup();at(e,'a','shop');e.action('a',{type:'buy',item:'jacket'});const uid=e.player('a').inventory[0].uid;at(e,'a','market');at(e,'b','market');
 e.action('a',{type:'list',uid,price:70});assert.equal(e.player('a').inventory.length,0);assert.equal(e.player('a').equipped.outfit,undefined);
 const listing=[...e.listings.keys()][0];assert.throws(()=>e.action('a',{type:'list',uid,price:1}),/do not own/);
 e.action('b',{type:'purchase',listing});assert.equal(e.player('a').credits,190);assert.equal(e.player('b').credits,110);assert.equal(e.player('b').inventory[0].uid,uid);
 assert.throws(()=>e.action('b',{type:'purchase',listing}),/unavailable/);assert.equal(e.player('a').credits+e.player('b').credits,300);
});
test('market rejects invalid prices, insufficient funds and non-owner cancellation',()=>{
 const e=setup();at(e,'a','shop');e.action('a',{type:'buy',item:ITEMS[0].id});at(e,'a','market');const uid=e.player('a').inventory[0].uid;
 for(const price of [-1,0,NaN,1.1,Infinity,10001])assert.throws(()=>e.action('a',{type:'list',uid,price}),/Price/);
 e.action('a',{type:'list',uid,price:9999});const listing=[...e.listings.keys()][0];at(e,'b','market');
 assert.throws(()=>e.action('b',{type:'purchase',listing}),/Not enough/);assert.throws(()=>e.action('b',{type:'cancel',listing}),/unavailable/);
 e.action('a',{type:'cancel',listing});assert.equal(e.player('a').inventory[0].uid,uid);assert.equal(e.listings.size,0);
});
test('chat is bounded and rate-limited; snapshots expose no other player inventory',()=>{
 const e=setup();e.action('a',{type:'chat',text:'hello'});assert.throws(()=>e.action('a',{type:'chat',text:'spam'}),/Wait/);
 const s=e.snapshot('b');assert.equal(s.chat[0].text,'hello');assert.equal(s.players.find(p=>p.id==='a').inventory,undefined);assert.equal(s.self.id,'b');
 e.leave('a');assert.equal(e.snapshot('b').players.length,1);
});
test('streetwear styles are bounded, saved on the player, and included in public appearance',()=>{
 const e=setup();e.action('a',{type:'style',style:{skin:4,hair:2,pants:3,print:1}});
 const appearance=e.snapshot('b').players.find(p=>p.id==='a').style;
 assert.deepEqual(JSON.parse(JSON.stringify(appearance)),{skin:4,hair:2,pants:3,print:1});
 assert.equal(e.player('b').style.skin,0);
 for(const style of [null,[],{skin:-1,hair:0,pants:0},{skin:0,hair:9,pants:0},{skin:0,hair:0,pants:Infinity},{skin:0,hair:0,pants:0,print:5}])assert.throws(()=>e.action('a',{type:'style',style}),/Invalid/);
 assert.equal(e.player('a').style.print,1);
});
