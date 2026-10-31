import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld2PrototypeRooms} from '../server/city-world2-prototype.mjs';
function setup(){
 let clock=1000;
 const {rooms,R}=createWorld2PrototypeRooms({now:()=>clock});
 const join=(name)=>rooms.join({name,avatar:'offensive'},name);
 return {rooms,R,join,step:ms=>{clock+=ms;rooms.advance();}};
}
test('journey has four distinct canonical, navigable objectives and starts without rewards',()=>{
 const {rooms,R,join}=setup(),a=join('Alice'),s=rooms.auth(a.session),e=rooms.first.engine,p=e.player(s.id),state=rooms.snapshot(s).self.journey;
 assert.equal(state.index,0);assert.equal(state.total,4);assert.equal(state.completed,false);
 assert.equal(state.target.id,'checkpoint:0');assert.equal(p.credits,180);assert.equal(p.xp,0);
 const ids=['checkpoint:0','district:arena','checkpoint:1','checkpoint:2'];
 assert.equal(new Set(ids).size,4);
 for(const id of ids){const dest=R.resolve(id);assert.ok(dest&&Number.isFinite(dest.x)&&Number.isFinite(dest.y));}
});
test('world2 orientation verifies position, requires order and awards one time only',()=>{
 const {rooms,R,join}=setup(),a=join('Alice'),s=rooms.auth(a.session),e=rooms.first.engine,p=e.player(s.id);
 assert.throws(()=>rooms.action(s,{type:'claimJourney',index:3,credits:999999}),/135 units/);
 for(const [i,id] of ['checkpoint:0','district:arena','checkpoint:1','checkpoint:2'].entries()){
  const dest=R.resolve(id);p.x=dest.x;p.y=dest.y;
  const old=p.credits;
  rooms.action(s,{type:'claimJourney',index:99,x:0,y:0,credits:999999});
  assert.equal(p.credits-old,i===3?100:35);
  const progress=rooms.snapshot(s).self.journey;
  assert.equal(progress.index,i+1);
  assert.equal(progress.completed,i===3);
  if(i<3)assert.equal(progress.target.id,['checkpoint:0','district:arena','checkpoint:1','checkpoint:2'][i+1]);
 }
 assert.equal(p.xp,270);assert.equal(p.credits,385);
 assert.throws(()=>rooms.action(s,{type:'claimJourney'}),/already complete/);
 assert.equal(rooms.snapshot(s).self.journey.target,null);
});
test('journey cannot claim from interiors, while down, with forged coordinates or invalid reward totals',()=>{
 const {rooms,R,join}=setup(),a=join('A'),s=rooms.auth(a.session),p=rooms.first.engine.player(s.id),dest=R.resolve('checkpoint:0');
 p.x=dest.x;p.y=dest.y;p.room={id:'door:launch'};
 assert.throws(()=>rooms.action(s,{type:'claimJourney'}),/Return alive/);p.room=null;p.hp=0;
 assert.throws(()=>rooms.action(s,{type:'claimJourney'}),/Return alive/);
 p.hp=100;p.credits=999999;assert.throws(()=>rooms.action(s,{type:'claimJourney'}),/safe play-credit/);
 assert.equal(rooms.snapshot(s).self.journey.index,0);
 p.credits=180;p.xp=1000000000;assert.throws(()=>rooms.action(s,{type:'claimJourney'}),/safe play-credit/);
 p.xp=0;rooms.action(s,{type:'claimJourney'});
 assert.equal(rooms.snapshot(s).self.journey.index,1);
});
test('journey ownership is isolated even for two guests in one room, and expires with guest',()=>{
 const {rooms,R,join}=setup(),a=join('Alice'),b=join('Bob'),sa=rooms.auth(a.session),sb=rooms.auth(b.session);
 const p=rooms.first.engine.player(sa.id),dest=R.resolve('checkpoint:0');p.x=dest.x;p.y=dest.y;
 rooms.action(sa,{type:'claimJourney'});
 assert.equal(rooms.snapshot(sa).self.journey.index,1);
 assert.equal(rooms.snapshot(sb).self.journey.index,0);
 assert.equal(rooms.snapshot(sb).players.find(x=>x.id===sa.id).journey,undefined);
 rooms.leave(a.session);
 assert.equal(join('Charlie').state.self.journey.index,0);
});
