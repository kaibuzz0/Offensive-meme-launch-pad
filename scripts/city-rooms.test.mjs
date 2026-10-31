import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRooms} from '../server/city-rooms.mjs';
function setup(options={}){const c={};for(const f of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-clans.js','city-monk.js'])vm.runInNewContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),c);let time=1000;const r=createRooms(c.MemeCityCore.Engine,{now:()=>time,...options});return {r,C:c.MemeCityCore,I:c.CityInteriors,R:c.CityRising,step:ms=>{time+=ms;r.advance();},join:(body={},ip='test')=>r.join({name:'Player',avatar:'offensive',layoutVersion:c.MemeCityCore.Engine.LAYOUT_VERSION,...body},ip)};}
test('quick play shares authoritative players but private rooms isolate state, chat and listings',()=>{const {r,join}=setup();const a=join(),b=join(),c=join({create:true});assert.equal(b.state.players.length,2);assert.equal(c.state.players.length,1);assert.match(c.state.roomInfo.code,/^[A-F0-9]{18}$/);const d=join({code:c.state.roomInfo.code});assert.equal(d.state.players.length,2);r.action(r.auth(a.session),{type:'chat',text:'hello'});assert.equal(r.snapshot(r.auth(b.session)).chat.length,1);assert.equal(r.snapshot(r.auth(c.session)).chat.length,0);assert.equal(JSON.stringify(b.state).includes(a.session),false);assert.notEqual(a.state.self.id,a.session);});
test('room capacity, bounded room counts, invalid codes and join limits reject admissions',()=>{const {r,join}=setup({capacity:2,maxRooms:2});const a=join({create:true});join({code:a.state.roomInfo.code});assert.throws(()=>join({code:a.state.roomInfo.code}),/full/);join();join();assert.throws(()=>join(),/busy/);assert.throws(()=>join({code:'../../x'}),/Invalid/);assert.throws(()=>join({code:'AAAAAAAAAAAAAAAAAA'}),/not found/);for(let i=0;i<12;i++)try{join({},'flood');}catch{}assert.throws(()=>join({},'flood'),e=>e.status===429);assert.equal(r.rooms.size,2);});
test('server movement normalizes diagonals, rejects forged balances and stops stale inputs',()=>{const {r,join,step}=setup();const a=join(),s=r.auth(a.session),e=r.rooms.get(s.room).engine,p=e.player(s.id);for(const b of e.arcade.bots){b.hp=0;b.respawn=9999;}const {x,y}=p;r.input(s,{x:1,y:1,seq:2});step(100);assert.ok(Math.hypot(p.x-x,p.y-y)<=20.501);const before={x:p.x,y:p.y};r.input(s,{x:-1,y:0,seq:1});step(100);assert.ok(p.x>=before.x,'Old input sequence ignored');step(600);const stop={x:p.x,y:p.y};step(100);assert.equal(p.x,stop.x);assert.equal(p.y,stop.y);for(const type of ['setCredits','teleport','build','hire','crewOrder','upgradeFort','defenseDrill'])assert.throws(()=>r.action(s,{type,credits:999999}),/unavailable/);assert.equal(p.credits,180,'Moving near the fortress spawn cannot claim a remote landmark');assert.throws(()=>r.input(s,{x:NaN,y:0}),/Invalid/);assert.throws(()=>r.input(s,{x:2,y:0}),/Invalid/);});
test('reconnecting resumes the same guest and expired sessions cannot act',()=>{const {r,join,step}=setup();const a=join(),s=r.auth(a.session),id=s.id;r.action(s,{type:'avatar',avatar:'maduro'});step(10000);assert.equal(r.snapshot(r.auth(a.session)).self.id,id);assert.equal(r.snapshot(s).self.avatar,'maduro');step(120001);assert.throws(()=>r.auth(a.session),e=>e.status===401);r.reap();assert.equal(r.first.engine.players.size,0);});
test('room peers share interior positions and facing, without exposing private inventories',()=>{const {r,join,I}=setup();const a=join(),b=join(),s=r.auth(a.session),e=r.first.engine,p=e.player(s.id),d=I.door(I.BUILDINGS[0]);Object.assign(p,{x:d.x,y:d.y});r.action(s,{type:'enterBuilding',building:'launch'});r.input(s,{x:0,y:-1,seq:1});r.advance();const peer=r.snapshot(r.auth(b.session)).players.find(p=>p.id===s.id);assert.equal(peer.room.id,'launch');assert.equal(peer.facing.y,-1);assert.equal(peer.moving,true);assert.equal(peer.inventory,undefined);assert.equal(peer.credits,undefined);peer.room.x=9;assert.notEqual(p.room.x,9);});
test('forged marketplace purchase cannot spend another guest balance or buy a listing twice',()=>{const {r,join,C}=setup();const a=join(),b=join(),sa=r.auth(a.session),sb=r.auth(b.session),e=r.first.engine,pa=e.player(sa.id),pb=e.player(sb.id),shop=C.WORLD.stations.find(s=>s.id==='shop'),market=C.WORLD.stations.find(s=>s.id==='market');Object.assign(pa,{x:shop.x,y:shop.y});r.action(sa,{type:'buy',item:'jacket'});Object.assign(pa,{x:market.x,y:market.y});r.action(sa,{type:'list',uid:pa.inventory[0].uid,price:30});const lid=r.snapshot(sa).listings[0].id;assert.throws(()=>r.action(sb,{type:'purchase',listing:lid}),/Night Market|city shop/);Object.assign(pb,{x:market.x,y:market.y});r.action(sb,{type:'purchase',listing:lid});assert.equal(pb.credits,150);assert.equal(pa.credits,150);assert.throws(()=>r.action(sb,{type:'purchase',listing:lid}));assert.equal(pb.inventory.length,1);});

function enter(r,s,e,p,I,id){const b=I.BUILDINGS.find(b=>b.roomId===id);p.room=null;const d=I.door(b);Object.assign(p,{x:d.x,y:d.y});r.action(s,{type:'enterBuilding',building:id});Object.assign(p.room,I.ROOM.activity);}
test('online courier validates countdown, location and exactly-once reward',()=>{const {r,join,step,C}=setup(),a=join(),s=r.auth(a.session),e=r.first.engine,p=e.player(s.id);for(const b of e.arcade.bots){b.hp=0;b.respawn=9999;}assert.throws(()=>r.action(s,{type:'deliver'}),/No delivery/);r.action(s,{type:'contract',job:'courier'});assert.throws(()=>r.action(s,{type:'deliver'}),/starting/);for(let i=0;i<30;i++)step(100);assert.throws(()=>r.action(s,{type:'deliver'}),/closer/);Object.assign(p,C.WORLD.route[1]);const before=p.credits;r.action(s,{type:'deliver'});assert.equal(p.credits,before+85);assert.equal(p.jobs,1);assert.throws(()=>r.action(s,{type:'deliver'}),/No delivery/);assert.equal(p.credits,before+85);});
test('online interior market preserves service location checks and atomic item transfers',()=>{const {r,join,I,step}=setup(),a=join(),b=join(),sa=r.auth(a.session),sb=r.auth(b.session),e=r.first.engine,pa=e.player(sa.id),pb=e.player(sb.id);enter(r,sa,e,pa,I,'shop');r.action(sa,{type:'buy',item:'jacket'});const uid=pa.inventory[0].uid;assert.ok(Object.values(pa.equipped).includes(uid));assert.throws(()=>r.action(sa,{type:'list',uid,price:30}),/matching/);enter(r,sa,e,pa,I,'market');assert.throws(()=>r.action(sa,{type:'list',uid:'fake',price:30}),/own/);assert.throws(()=>r.action(sa,{type:'list',uid,price:-1}),/Price/);step(1100);r.action(sa,{type:'list',uid,price:30});const listing=r.snapshot(sa).listings[0].id;enter(r,sb,e,pb,I,'market');pb.room.x=100;assert.throws(()=>r.action(sb,{type:'purchase',listing}),/matching/);Object.assign(pb.room,I.ROOM.activity);pb.credits=0;assert.throws(()=>r.action(sb,{type:'purchase',listing}),/credits/);pb.credits=80;const before=pa.credits;r.action(sb,{type:'purchase',listing});assert.equal(pb.credits,50);assert.equal(pa.credits,before+30);assert.equal(pb.inventory[0].uid,uid);assert.equal(pa.inventory.length,0);assert.throws(()=>r.action(sb,{type:'purchase',listing}));assert.equal(pb.credits,50);assert.equal(pb.room.id,'market');assert.equal(pb.area,'interior');});
test('all six online medic terminals and outdoor Patch use shared supply rules',()=>{const {r,join,I,R,step}=setup(),a=join(),s=r.auth(a.session),e=r.first.engine,p=e.player(s.id),medics=I.BUILDINGS.filter(b=>b.activity==='supplies');assert.equal(medics.length,6);for(const b of medics){step(1100);enter(r,s,e,p,I,b.roomId);p.rising.medkits=0;p.credits=100;p.room.x=100;assert.throws(()=>r.action(s,{type:'restock'}),/matching/);Object.assign(p.room,I.ROOM.activity);r.action(s,{type:'restock'});assert.equal(p.rising.medkits,1);assert.equal(p.credits,75);assert.equal(p.room.id,b.roomId);}step(1100);enter(r,s,e,p,I,'launch');assert.throws(()=>r.action(s,{type:'restock'}),/matching/);p.room=null;const doc=R.GUIDES.find(g=>g.id==='doc');Object.assign(p,{x:doc.x,y:doc.y});r.action(s,{type:'restock'});assert.equal(p.rising.medkits,2);});
test('online journey avoids solo requirements and shared rooms reject construction',()=>{const {r,join,R,step}=setup(),a=join(),s=r.auth(a.session),e=r.first.engine,p=e.player(s.id);assert.equal(p.mode,'online');assert.throws(()=>r.action(s,{type:'claimChapter'}),/objective/);p.rising.found=R.LANDMARKS.map(n=>n.id);p.jobs=1;p.clan='offensive';p.reputation.offensive=1;p.inventory=[{uid:'gear-999',item:'jacket'}];p.equipped={body:'gear-999'};p.places.visited=['launch','market','shop'];assert.equal(p.plot.length,0);assert.equal(p.crew.length,0);for(let i=0;i<8;i++){step(1100);r.action(s,{type:'claimChapter'});}assert.equal(p.rising.claimed,8);assert.throws(()=>r.action(s,{type:'claimChapter'}),/complete/);for(const type of ['outpostBuild','outpostRemove','outpostStyle','startSurvival'])assert.throws(()=>r.action(s,{type}),/unavailable/);assert.equal(R.CHAPTERS[2].ready(p),false);});
test('shared room conflict enrollment is authoritative and stale movement/fire stop',()=>{const {r,join,step,C}=setup(),a=join(),s=r.auth(a.session),e=r.first.engine,p=e.player(s.id);e.conflict={id:1,phase:'announced',remaining:15,winner:null,participants:new Map(),reinforced:false,summary:'Test announcement'};r.action(s,{type:'joinClan',clan:'congress'});Object.assign(p,{x:C.HUB.x+770,y:C.HUB.y+1000});r.action(s,{type:'joinConflict'});assert.equal(r.snapshot(s).conflict.entry.side,'congress');assert.throws(()=>r.action(s,{type:'joinConflict'}),/Already/);r.input(s,{x:1,y:0,fire:true,aimX:1,aimY:0,seq:1});step(600);assert.equal(p.fireHeld,false);assert.equal(p.input.x,0);const b=join();assert.equal(r.snapshot(r.auth(b.session)).conflict.entry,null);});

test('room handshake rejects stale and missing layouts before admitting a player',()=>{
 const {r,join,C}=setup();
 assert.throws(()=>r.join({name:'Old client',avatar:'offensive'},'old-client'),/map version mismatch/);
 assert.throws(()=>join({layoutVersion:1},'stale-client'),/map version mismatch/);
 const connected=join();
 assert.equal(connected.state.roomInfo.layoutVersion,C.LAYOUT_VERSION);
 assert.equal(r.health().layoutVersion,C.LAYOUT_VERSION);
});

test('server grants the OFFENDER skin identity only for an unexpired verified OFFENDED balance',()=>{
 const {r,join}=setup(),a=join(),b=join(),sa=r.auth(a.session),sb=r.auth(b.session);
 const p=r.rooms.get(sa.room).engine.player(sa.id);
 const read=()=>({self:r.snapshot(sa).self,peer:r.snapshot(sb).players.find(x=>x.id===sa.id)});
 let state=read();
 assert.equal(state.self.holderTier,0);assert.equal(state.self.holderClan,null);
 p.holder={clan:'offensive',tier:1,expires:Date.now()+120000};
 state=read();
 assert.equal(state.self.holderTier,1);assert.equal(state.self.holderClan,'offensive');
 assert.equal(state.peer.holderTier,1);assert.equal(state.peer.holderClan,'offensive');
 p.holder={clan:'maduro',tier:3,expires:Date.now()+120000};
 state=read();assert.equal(state.peer.holderClan,'maduro','other meme holders must not get OFFENDER skin');
 p.holder={clan:'offensive',tier:3,expires:Date.now()-1};
 state=read();assert.equal(state.self.holderTier,0);assert.equal(state.peer.holderClan,null,'expired proof must not keep the skin');
 p.holder=null;state=read();assert.equal(state.self.holderClan,null);
});

test('six clan cosmetics are server-authorized, visible to peers and distinct from holder status',()=>{
 const {r,join,step}=setup(),a=join(),b=join(),s=r.auth(a.session),other=r.auth(b.session);
 const skinIds=['redacted','congress','exit','you-missed','maduro','rug'];
 for(const id of skinIds){
  step(1100);const res=r.action(s,{type:'clanSkin',skin:id});
  assert.match(res.message,/skin equipped/);
  assert.equal(r.snapshot(s).self.clanSkin,id);
  assert.equal(r.snapshot(other).players.find(p=>p.id===s.id).clanSkin,id,'peer can see cosmetic '+id);
  assert.equal(r.snapshot(s).self.holderClan,null,'no token holdings implied by changing cosmetics');
 }
 assert.throws(()=>r.action(s,{type:'clanSkin',skin:'offensive'}),/Unknown clan avatar skin/);
 assert.throws(()=>r.action(s,{type:'clanSkin',skin:{a:1}}),/Unknown clan avatar skin/);
 r.action(s,{type:'clanSkin',skin:null});
 assert.equal(r.snapshot(s).self.clanSkin,null);
 assert.equal(r.snapshot(other).players.find(p=>p.id===s.id).clanSkin,null);
});

test('empty corner expansion parcels require signed-token entitlement; regular map remains free',()=>{
 const {r,join,C}=setup(),a=join(),session=r.auth(a.session),p=r.first.engine.player(session.id);
 assert.equal(C.TOKEN_PLOTS.length,6,'six visible reserved plots');
 assert.equal(new Set(C.TOKEN_PLOTS.map(x=>x.id)).size,6,'unique token entry rules');
 for(const lot of C.TOKEN_PLOTS){
  const at={x:lot.x+lot.w/2,y:lot.y+lot.h/2};
  p.holder=null;assert.equal(C.blocked(at.x,at.y,p),true,'not owned: '+lot.id);
  p.holder={clan:lot.id,tier:1,expires:Date.now()+100000};
  assert.equal(C.blocked(at.x,at.y,p),false,'matching signed holder: '+lot.id);
  p.holder={clan:'wrong',tier:3,expires:Date.now()+100000};
  assert.equal(C.blocked(at.x,at.y,p),true,'a different token cannot open '+lot.id);
  p.holder={clan:lot.id,tier:1,expires:Date.now()-100};
  assert.equal(C.blocked(at.x,at.y,p),true,'expired proof revokes '+lot.id);
 }
 p.holder=null;
 const plot=C.TOKEN_PLOTS[0],y=plot.y+plot.h/2;
 p.x=plot.x-4;p.y=y;p.input={x:1,y:0};r.first.engine.tick(.1);
 assert.ok(p.x<plot.x,'unverified player cannot cross reserved plot boundary');
 p.holder={clan:plot.id,tier:1,expires:Date.now()+100000};
 r.first.engine.tick(.1);assert.ok(p.x>plot.x,'verified holder can physically enter the same plot');
 assert.equal(C.blocked(C.WORLD.spawn.x,C.WORLD.spawn.y,{holder:null}),false,'free main city spawn is not gated');
});
