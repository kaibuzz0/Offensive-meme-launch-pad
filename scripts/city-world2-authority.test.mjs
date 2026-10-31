import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld2PrototypeRooms} from '../server/city-world2-prototype.mjs';
function setup(){
 let now=1000;const {rooms,Engine,W,R,C,I}=createWorld2PrototypeRooms({now:()=>now,capacity:3,maxRooms:3});
 const join=(body={},ip='guest')=>rooms.join({name:'Tester',avatar:'offensive',...body},ip);
 const advance=ms=>{now+=ms;rooms.advance();};
 return {rooms,Engine,W,R,C,I,join,advance};
}
test('world2 prototype shares two authenticated guests and isolates private room guests',()=>{
 const {rooms,join}=setup();const a=join(),b=join(),c=join({create:true});
 assert.equal(a.state.worldVersion,2);assert.equal(b.state.players.length,2);
 assert.equal(c.state.players.length,1);
 assert.equal(b.state.self.credits,180);assert.equal(b.state.players[0].credits,undefined);
 assert.equal(JSON.stringify(rooms.snapshot(rooms.auth(b.session))).includes(a.session),false);
 assert.equal(rooms.health().mode,'temporary-play-credit-rooms');
});
test('server moves guests through world2 geometry, rejects forged balance and stale input',()=>{
 const {rooms,join,advance,W}=setup(),a=join(),s=rooms.auth(a.session),p=rooms.first.engine.player(s.id);
 assert.equal(p.x,W.commons.x);assert.equal(p.y,W.commons.y);
 const before=p.x;rooms.input(s,{x:1,y:0,seq:4,fire:false});advance(50);
 assert.ok(p.x>before&&p.x-before<11);
 const last=p.x;rooms.input(s,{x:-1,y:0,seq:3});advance(50);assert.ok(p.x>=last);
 assert.throws(()=>rooms.action(s,{type:'setCredits',credits:999999}),/unavailable/);
 assert.throws(()=>rooms.action(s,{type:'buyGear',item:'jacket',credits:999999}),/counter/);
 assert.equal(p.credits,180);
 p.x=W.fortress.x+65;p.y=W.fortress.y+175;rooms.input(s,{x:-1,y:0,seq:10});
 for(let i=0;i<50;i++)advance(50);
 assert.ok(p.x>W.fortress.x+20,'fortress wall must block crossing away from gates');
});
test('server enforces actual world2 door and indoor credits without trusting client coordinates',()=>{
 const {rooms,join,R,I,advance,C}=setup(),a=join(),s=rooms.auth(a.session),e=rooms.first.engine,p=e.player(s.id);
 const door=R.resolve('door:shop');
 assert.throws(()=>rooms.action(s,{type:'enterBuilding',building:'shop',x:door.x,y:door.y}),/doorway/);
 p.x=door.x;p.y=door.y;
 rooms.action(s,{type:'enterBuilding',building:'shop'});
 assert.throws(()=>rooms.action(s,{type:'buyGear',item:C.ITEMS[0].id,room:{id:'door:shop',...I.ROOM.activity}}),/counter/);
 p.room.x=I.ROOM.activity.x;p.room.y=I.ROOM.activity.y;
 const price=C.ITEMS[0].price;
 rooms.action(s,{type:'buyGear',item:C.ITEMS[0].id,credits:100000});
 assert.equal(p.credits,180-price);assert.equal(p.inventory.length,1);
 advance(1100);rooms.action(s,{type:'equipGear',uid:p.inventory[0].uid});
 assert.equal(p.equipped[C.ITEMS[0].slot],p.inventory[0].uid);
 assert.equal(rooms.snapshot(s).self.inventory.length,1);
 const b=join({create:true},'other');
 assert.equal(b.state.self.inventory.length,0);
 assert.equal(b.state.players.find(x=>x.id===s.id),undefined);
});
test('courier rewards are credited only by server after reaching canonical target once',()=>{
 const {rooms,join,R,advance}=setup(),a=join(),s=rooms.auth(a.session),e=rooms.first.engine,p=e.player(s.id);
 assert.throws(()=>rooms.action(s,{type:'startCourier'}),/Launch House/);
 const origin=R.resolve('door:launch');p.x=origin.x;p.y=origin.y;
 rooms.action(s,{type:'startCourier',target:'market',credits:999});
 assert.throws(()=>rooms.action(s,{type:'deliverCourier'}),/Follow/);
 const dest=R.resolve('checkpoint:1');p.x=dest.x;p.y=dest.y;
 const original=p.credits;rooms.action(s,{type:'deliverCourier'});
 assert.equal(p.credits,original+60);assert.equal(p.xp,75);
 assert.throws(()=>rooms.action(s,{type:'deliverCourier'}),/No active courier/);
 advance(50);assert.equal(rooms.snapshot(s).self.courier.status,'complete');
});
test('faction control is shared server state and cannot be captured by client forgery',()=>{
 const {rooms,join,C}=setup(),a=join(),b=join(),sa=rooms.auth(a.session),sb=rooms.auth(b.session);
 const engine=rooms.first.engine,zone=engine.territory.zones[0];
 const rival=C.NEIGHBORHOODS.find(x=>x.id!==zone.owner).id;
 rooms.action(sa,{type:'joinFaction',clan:rival});
 assert.throws(()=>rooms.action(sa,{type:'startCapture',zone:zone.id,x:zone.x,y:zone.y}),/155/);
 const p=engine.player(sa.id);p.x=zone.x;p.y=zone.y;
 rooms.action(sa,{type:'startCapture',zone:zone.id});
 assert.throws(()=>rooms.action(sb,{type:'joinFaction',clan:rival}),/Another guest/);
 for(const g of engine.guards)if(g.clan===zone.homeClan){g.alive=false;g.hp=0;g.respawn=50;}
 engine.player(sb.id).x=100;engine.player(sb.id).y=100;
 for(let i=0;i<170;i++)engine.tick(.05);
 assert.equal(zone.owner,rival);assert.equal(p.credits,230);
 assert.equal(rooms.snapshot(sb).territory.find(z=>z.id===zone.id).owner,rival);
 assert.throws(()=>rooms.action(sa,{type:'startCapture',zone:zone.id}),/already controls/);
});
test('session departure and transient room lifecycle revoke capture ownership',()=>{
 const {rooms,join,C}=setup(),a=join(),s=rooms.auth(a.session),e=rooms.first.engine,p=e.player(s.id),zone=e.territory.zones[0];
 rooms.action(s,{type:'joinFaction',clan:C.NEIGHBORHOODS.find(x=>x.id!==zone.owner).id});
 p.x=zone.x;p.y=zone.y;rooms.action(s,{type:'startCapture',zone:zone.id});
 assert.equal(e.captureOwner,s.id);
 rooms.leave(a.session);assert.equal(e.captureOwner,null);assert.equal(e.territory.active(),null);
 assert.equal(rooms.sessions.size,0);
});
