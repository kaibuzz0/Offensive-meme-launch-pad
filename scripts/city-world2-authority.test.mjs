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

test('authenticated world2 equipment purchases enhance movement and shooting only after server verifies ownership',()=>{
 const {rooms,join,I,R,W,C}=setup(),a=join(),b=join(),sa=rooms.auth(a.session),sb=rooms.auth(b.session),
  e=rooms.first.engine,p=e.player(sa.id),normal=e.player(sb.id);
 const shop=R.resolve('door:shop');p.x=shop.x;p.y=shop.y;p.credits=500;
 rooms.action(sa,{type:'enterBuilding',building:'shop'});
 p.room.x=I.ROOM.activity.x;p.room.y=I.ROOM.activity.y;
 rooms.action(sa,{type:'buyGear',item:'boots'});
 rooms.action(sa,{type:'buyGear',item:'blaster'});
 const boots=p.inventory.find(o=>o.item==='boots'),blaster=p.inventory.find(o=>o.item==='blaster');
 assert.ok(boots&&blaster);rooms.action(sa,{type:'equipGear',uid:boots.uid});
 rooms.action(sa,{type:'equipGear',uid:blaster.uid});
 p.room.x=I.ROOM.exit.x;p.room.y=I.ROOM.exit.y;
 rooms.action(sa,{type:'exitBuilding'});
 p.x=W.commons.x;p.y=W.commons.y;normal.x=W.commons.x;normal.y=W.commons.y;
 rooms.input(sa,{x:1,y:0,seq:1});rooms.input(sb,{x:1,y:0,seq:1});
 e.tick(.1);
 assert.ok(p.x-normal.x>2.4,'server applies purchased +25 boots bonus after verifying ownership');
 rooms.input(sa,{x:0,y:0,seq:2});
 const guard=e.guards[0];p.x=guard.x;p.y=guard.y+160;p.fireCooldown=0;
 rooms.input(sa,{x:0,y:0,seq:3,fire:true,aimX:0,aimY:-1});
 e.tick(.05);
 assert.equal(guard.hp,34,'server-owned equipped blaster deals 36 damage, not client-supplied damage');
 assert.equal(C.WORLD.spawn.x,3360,'production world1 geometry remains unchanged');
});

test('private fortress placement debits credits, enforces tile range, prevents overlap, and refunds once',()=>{
 const {rooms,join,C,W}=setup(),a=join(),b=join(),sa=rooms.auth(a.session),sb=rooms.auth(b.session);
 const e=rooms.first.engine,p=e.player(sa.id),other=e.player(sb.id);
 const P={x:4536,y:4600,tile:64};
 const tile={col:2,row:2},pos={x:P.x+tile.col*P.tile+P.tile/2,y:P.y+tile.row*P.tile+P.tile/2};
 assert.throws(()=>rooms.action(sa,{type:'buildPlot',...tile,kind:'wall',x:pos.x,y:pos.y}),/245/);
 p.x=pos.x+100;p.y=pos.y;
 const initial=p.credits;const kit=C.BUILD_KIT.find(k=>k.id==='wall');
 rooms.action(sa,{type:'buildPlot',...tile,kind:'wall',credits:999999});
 assert.equal(p.credits,initial-kit.cost);assert.equal(p.plot.length,1);
 assert.equal(other.plot.length,0);
 assert.equal(rooms.snapshot(sa).self.plot[0].kind,'wall');
 assert.equal(rooms.snapshot(sb).self.plot.length,0);
 assert.equal(rooms.snapshot(sb).players.find(x=>x.id===sa.id).plot,undefined);
 assert.throws(()=>rooms.action(sa,{type:'buildPlot',...tile,kind:'wall'}),/occupied/);
 assert.equal(W.blocked(pos.x,pos.y,p),true,'owner private wall blocks movement');
 assert.equal(W.blocked(pos.x,pos.y,other),false,'other guest has separate fortress construction instance');
 rooms.action(sa,{type:'removePlot',col:2,row:2});
 assert.equal(p.credits,initial-kit.cost+Math.floor(kit.cost/2));
 assert.throws(()=>rooms.action(sa,{type:'removePlot',...tile}),/No structure/);
});
test('forge protection for structures validates coordinates, catalog, funds, trap, and room ownership',()=>{
 const {rooms,join,I,R}=setup(),a=join(),s=rooms.auth(a.session),e=rooms.first.engine,p=e.player(s.id);
 const P={x:4536,y:4600,tile:64},col=5,row=4,cell={x:P.x+col*64+32,y:P.y+row*64+32};
 p.x=cell.x+85;p.y=cell.y;
 assert.throws(()=>rooms.action(s,{type:'buildPlot',col:-1,row,kind:'wall'}),/Invalid fortress tile/);
 assert.throws(()=>rooms.action(s,{type:'buildPlot',col:0.2,row,kind:'wall'}),/Invalid fortress tile/);
 assert.throws(()=>rooms.action(s,{type:'buildPlot',col,row,kind:'fake'}),/Unknown fortress/);
 p.credits=1;assert.throws(()=>rooms.action(s,{type:'buildPlot',col,row,kind:'home'}),/Insufficient/);
 p.credits=1000;
 const trapCol=Math.floor((p.x-P.x)/64),trapRow=Math.floor((p.y-P.y)/64);
 assert.throws(()=>rooms.action(s,{type:'buildPlot',col:trapCol,row:trapRow,kind:'wall'}),/trap/);
 assert.equal(p.plot.length,0);assert.equal(p.credits,1000);
 const door=R.resolve('door:shop');p.x=door.x;p.y=door.y;
 rooms.action(s,{type:'enterBuilding',building:'shop'});
 assert.throws(()=>rooms.action(s,{type:'buildPlot',col,row,kind:'wall'}),/Return alive/);
});
test('fortress plot state remains private across rooms and disappears when ephemeral guest leaves',()=>{
 const {rooms,join}=setup(),a=join(),b=join({create:true}),sa=rooms.auth(a.session),sb=rooms.auth(b.session),e=rooms.first.engine,p=e.player(sa.id);
 const col=4,row=3;p.x=4536+col*64+32+75;p.y=4600+row*64+32;
 rooms.action(sa,{type:'buildPlot',col,row,kind:'banner'});
 assert.equal(rooms.snapshot(sa).self.plot.length,1);
 assert.equal(rooms.snapshot(sb).self.plot.length,0);
 rooms.leave(a.session);
 assert.equal(e.players.size,0);
 const c=join();assert.equal(c.state.self.plot.length,0);
});


test('private squad hiring validates owned credits, home proximity, and four-defender roster cap',()=>{
 const {rooms,join,C}=setup(),a=join(),b=join(),sa=rooms.auth(a.session),sb=rooms.auth(b.session);
 const engine=rooms.first.engine,p=engine.player(sa.id),other=engine.player(sb.id),home=engine.privateDefense.get(sa.id);
 assert.throws(()=>rooms.action(sa,{type:'hireDefender',role:'sentry',x:home.center?.x,credits:999999}),/fortress lot/);
 const h={x:4536+8*64,y:4600+5*64};p.x=h.x;p.y=h.y;p.credits=400;
 assert.throws(()=>rooms.action(sb,{type:'orderDefender',id:'defender-1',mode:'follow'}),/own/);
 assert.throws(()=>rooms.action(sa,{type:'hireDefender',role:'unknown'}),/Unknown defender/);
 const cost=C.CREW_TYPES[0].cost,credits=p.credits;
 for(let i=0;i<4;i++)rooms.action(sa,{type:'hireDefender',role:'sentry',credits:999999});
 assert.equal(p.credits,credits-cost*4);
 assert.equal(rooms.snapshot(sa).self.defense.crew.length,4);
 assert.equal(rooms.snapshot(sb).self.defense.crew.length,0);
 assert.equal(rooms.snapshot(sb).players.find(x=>x.id===sa.id).defense,undefined);
 assert.throws(()=>rooms.action(sa,{type:'hireDefender',role:'sentry'}),/roster is full/);
 assert.equal(other.credits,180);
});
test('private fortress raid is bounded, rewards server-owned credits once, and enforces cooldown',()=>{
 const {rooms,join}=setup(),a=join(),sa=rooms.auth(a.session),engine=rooms.first.engine,p=engine.player(sa.id),
  own=engine.privateDefense.get(sa.id),other=join(),otherSession=rooms.auth(other.session);
 p.x=4536+8*64;p.y=4600+5*64;
 assert.throws(()=>rooms.action(sa,{type:'startRaid',xp:999999}),/Hire at least one/);
 rooms.action(sa,{type:'hireDefender',role:'sentry'});
 const starting=p.credits;
 rooms.action(sa,{type:'startRaid',credits:999999});
 assert.equal(own.raid.status,'active');assert.ok(own.raiders.length>=2);
 assert.throws(()=>rooms.action(sa,{type:'startRaid'}),/already active/);
 assert.equal(rooms.snapshot(otherSession).self.defense.raid.status,'idle');
 assert.equal(rooms.snapshot(otherSession).players.find(q=>q.id===sa.id).defense,undefined);
 for(const enemy of [...own.raiders])for(let j=0;j<3;j++)own.hit(enemy.id,35);
 engine.tick(.05);
 assert.equal(own.raid.status,'complete');
 assert.equal(p.credits,starting+95);
 assert.equal(p.xp,125);
 const previous=p.credits;for(let i=0;i<10;i++)engine.tick(.05);assert.equal(p.credits,previous);
 assert.throws(()=>rooms.action(sa,{type:'startRaid'}),/cooldown/);
});
test('raid abandonment and session expiry revoke private units without paying rewards',()=>{
 const {rooms,join}=setup(),a=join(),sa=rooms.auth(a.session),engine=rooms.first.engine,p=engine.player(sa.id),owned=engine.privateDefense.get(sa.id);
 p.x=4536+8*64;p.y=4600+5*64;
 rooms.action(sa,{type:'hireDefender',role:'sentry'});
 rooms.action(sa,{type:'startRaid'});
 const credits=p.credits;
 p.x=500;p.y=500;engine.tick(.1);
 assert.equal(owned.raid.status,'failed');assert.equal(owned.raiders.length,0);
 assert.equal(p.credits,credits);
 rooms.leave(a.session);
 assert.equal(engine.privateDefense.has(sa.id),false);
});
test('ordered defenders are private and only server-owned combat can damage raid enemies',()=>{
 const {rooms,join}=setup(),a=join(),sa=rooms.auth(a.session),engine=rooms.first.engine,p=engine.player(sa.id),own=engine.privateDefense.get(sa.id);
 p.x=4536+8*64;p.y=4600+5*64;p.credits=200;
 rooms.action(sa,{type:'hireDefender',role:'ranger'});
 const unit=own.crew[0];assert.equal(unit.role,'ranger');
 assert.throws(()=>rooms.action(sa,{type:'orderDefender',id:unit.id,mode:'teleport'}),/guard or follow/);
 assert.equal(rooms.action(sa,{type:'orderDefender',id:unit.id,mode:'follow'}).message.includes('follow'),true);
 rooms.action(sa,{type:'startRaid'});
 const initial=own.raiders.reduce((sum,r)=>sum+r.hp,0);
 engine.tick(.1);
 const after=own.raiders.reduce((sum,r)=>sum+r.hp,0);
 assert.ok(after<=initial);
 assert.throws(()=>rooms.action(sa,{type:'damageRaider',target:own.raiders[0]?.id,damage:9999}),/unavailable/);
});
