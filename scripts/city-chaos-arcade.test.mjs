import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRooms} from '../server/city-rooms.mjs';

function game(){
 const root={};root.window=root;
 for(const file of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-clans.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),root);
 const C=root.MemeCityCore,I=root.CityInteriors,e=new C.Engine(),p=e.join('solo','Cabinet QA','offensive');
 for(const b of e.arcade.bots){b.hp=0;b.respawn=10000;}
 e.arcade.zombieNext=1000;
 return {root,C,I,e,p};
}
function enter({I,e,p},id='arcade'){
 const b=I.BUILDINGS.find(b=>b.roomId===id),d=I.door(b);
 Object.assign(p,{x:d.x,y:d.y});
 e.action(p.id,{type:'enterBuilding',building:id});
 return b;
}
function atTerminal({I,p}){Object.assign(p.room,I.ROOM.activity);}
function attempt(e,p,chooseBonus=true){
 let gates=0;
 while(p.cabinetRun?.phase==='playing'){
  const cab=e.snapshot(p.id).self.cabinet,g=cab.gate,lane=cab.lane;
  const options=[lane,...[-1,1].map(dx=>lane+dx).filter(n=>n>=0&&n<=2)];
  const safe=options.filter(x=>x!==g.danger);
  const next=chooseBonus&&safe.includes(g.bonus)?g.bonus:safe[0]??lane;
  if(next!==lane)e.action(p.id,{type:'arcadeShift',delta:next-lane});
  e.action(p.id,{type:'arcadeStep'});
  assert.ok(++gates<=12,'a cabinet can resolve only twelve gates');
 }
 return p.cabinetResult;
}

test('only the existing Chaos Arcade room activity is connected to playable Rug Runner',()=>{
 const g=game(),arc=g.I.BUILDINGS.find(b=>b.roomId==='arcade');
 assert.equal(g.I.BUILDINGS.length,47,'no extra buildings or replacement world');
 assert.equal(arc.activity,'arcadeCabinet');
 assert.equal(g.C.WORLD.width,11200);
 assert.equal(g.I.ROOM.activity.x,600);
 assert.throws(()=>g.e.action(g.p.id,{type:'arcadeStart'}),/Enter the actual Chaos Arcade/);
 enter(g,'launch');atTerminal(g);
 assert.throws(()=>g.e.action(g.p.id,{type:'arcadeStart'}),/actual Chaos Arcade/);
 Object.assign(g.p.room,g.I.ROOM.exit);g.e.action(g.p.id,{type:'exitBuilding'});
 enter(g);
 assert.equal(g.I.activity(g.p),null,'entrance is not the playable cabinet');
 assert.throws(()=>g.e.action(g.p.id,{type:'arcadeStart'}),/Walk to/);
 atTerminal(g);
 assert.equal(g.I.activity(g.p).panel,'arcadeCabinet');
 assert.match(g.e.action(g.p.id,{type:'arcadeStart'}),/Rug Runner started/);
 assert.equal(g.e.snapshot(g.p.id).self.cabinet.turn,0);
});

test('gate geometry, move limits, pause/resume and score are validated by the game engine',()=>{
 const g=game();enter(g);atTerminal(g);
 g.e.action(g.p.id,{type:'arcadeStart'});
 const before=g.e.snapshot(g.p.id).self.cabinet;
 assert.equal(before.hp,3);assert.equal(before.lane,1);assert.equal(before.turn,0);
 assert.ok([0,1,2].includes(before.gate.danger));
 assert.notEqual(before.gate.danger,before.gate.bonus,'every turn has a safe bonus lane');
 assert.throws(()=>g.e.action(g.p.id,{type:'arcadeShift',delta:3}),/one lane/);
 assert.throws(()=>g.e.action(g.p.id,{type:'arcadeShift',delta:-3}),/one lane/);
 g.e.action(g.p.id,{type:'arcadePause'});
 assert.throws(()=>g.e.action(g.p.id,{type:'arcadeStep',score:99999}),/Resume/);
 assert.throws(()=>g.e.action(g.p.id,{type:'arcadeShift',delta:1}),/Resume/);
 assert.equal(g.e.snapshot(g.p.id).self.cabinet.turn,0);
 g.e.action(g.p.id,{type:'arcadeResume'});
 g.e.action(g.p.id,{type:'arcadeShift',delta:-1});
 assert.throws(()=>g.e.action(g.p.id,{type:'arcadeShift',delta:1}),/Only one/);
 g.e.action(g.p.id,{type:'arcadeStep',score:99999,reward:99999,win:true});
 const advanced=g.e.snapshot(g.p.id).self.cabinet;
 assert.equal(advanced.turn,1);
 assert.ok(advanced.score<40,'client cannot choose the score or award a bonus');
 assert.equal(advanced.shifted,false,'next gate gets fresh movement');
 assert.equal(g.p.credits,190,'entry gives only existing one-time discovery reward, not a cabinet prize');
});

test('twelve actual decisions produce one first-clear payout; replay only improves best score',()=>{
 const g=game();enter(g);atTerminal(g);
 const starting={credits:g.p.credits,xp:g.p.xp};
 g.e.action(g.p.id,{type:'arcadeStart'});
 const first=attempt(g.e,g.p);
 assert.equal(first.status,'won',JSON.stringify(first));
 assert.ok(first.score>=g.I.CABINET_MIN_SCORE);
 assert.equal(first.reward,35);assert.equal(first.xp,30);
 assert.equal(g.p.credits,starting.credits+35);
 assert.equal(g.p.xp,starting.xp+30);
 assert.equal(g.p.places.arcadeBest,first.score);
 assert.equal(g.p.places.arcadeClaimed,true);
 assert.throws(()=>g.e.action(g.p.id,{type:'arcadeStep'}),/Start a Rug Runner/);
 g.e.action(g.p.id,{type:'arcadeStart'});
 const second=attempt(g.e,g.p);
 assert.equal(second.status,'won');
 assert.equal(second.reward,0);assert.equal(second.xp,0);
 assert.equal(g.p.credits,starting.credits+35,'replays never duplicate the prize');
 assert.equal(g.p.xp,starting.xp+30);
});

test('historical saved characters load without new required fields; prize is durable in existing places save',()=>{
 const g=game(),original={visited:['arcade'],souvenirs:['arcade']};
 g.I.restore(g.p,original);
 assert.equal(g.p.places.arcadeClaimed,false);
 assert.equal(g.p.places.arcadeBest,0);
 enter(g);atTerminal(g);g.e.action(g.p.id,{type:'arcadeStart'});
 const result=attempt(g.e,g.p);
 assert.equal(result.status,'won');
 const saved=g.I.save(g.p);
 assert.equal(saved.arcadeBest,result.score);
 assert.equal(saved.arcadeClaimed,true);
 assert.deepEqual(saved.visited,['arcade']);
 assert.deepEqual(saved.souvenirs,['arcade']);
 const reloaded=game();
 reloaded.I.restore(reloaded.p,saved);
 assert.equal(reloaded.p.places.arcadeBest,result.score);
 assert.equal(reloaded.p.places.arcadeClaimed,true);
 enter(reloaded);atTerminal(reloaded);
 reloaded.e.action(reloaded.p.id,{type:'arcadeStart'});
 assert.equal(attempt(reloaded.e,reloaded.p).reward,0,'reload cannot reclaim first clear');
 const tampered=game();
 tampered.I.restore(tampered.p,{visited:['arcade','forged'],souvenirs:['forged'],arcadeBest:Infinity,arcadeClaimed:'true'});
 assert.equal(tampered.p.places.arcadeBest,0);
 assert.equal(tampered.p.places.arcadeClaimed,false);
 assert.deepEqual(tampered.p.places.visited,['arcade']);
});

test('quitting and exiting reset only the cabinet session, preserve character/world and pay no bonus',()=>{
 const g=game();enter(g);atTerminal(g);const credits=g.p.credits;
 g.e.action(g.p.id,{type:'arcadeStart'});
 g.e.action(g.p.id,{type:'arcadeQuit'});
 assert.equal(g.p.cabinetRun,null);
 assert.equal(g.p.cabinetResult.status,'abandoned');
 assert.equal(g.p.cabinetResult.reward,0);
 assert.equal(g.p.credits,credits);
 g.e.action(g.p.id,{type:'arcadeStart'});
 Object.assign(g.p.room,g.I.ROOM.exit);
 g.e.action(g.p.id,{type:'exitBuilding'});
 assert.equal(g.p.cabinetRun,null);
 assert.equal(g.p.room,null);
 assert.equal(g.p.places.arcadeClaimed,false);
 assert.equal(g.I.BUILDINGS.length,47);
});

test('snapshots hide random seeds and do not leak editable private session state to peers',()=>{
 const g=game();enter(g);atTerminal(g);g.e.action(g.p.id,{type:'arcadeStart'});
 const snap=g.e.snapshot(g.p.id);
 assert.equal('seed' in snap.self.cabinet,false);
 assert.ok(snap.self.cabinet.gate);
 snap.self.cabinet.gate.danger=99;
 snap.self.cabinet.lane=99;
 snap.self.places.arcadeBest=999;
 assert.ok(g.e.snapshot(g.p.id).self.cabinet.gate.danger<3);
 assert.equal(g.p.cabinetRun.lane,1);
 assert.equal(g.p.places.arcadeBest,0);
 assert.equal(g.e.snapshot(g.p.id).self.cabinet.phase,'playing');
});

test('online actions are room-authoritative and reject remote starts and forged credit input',()=>{
 const {C,I}=game();let clock=10000;
 const rooms=createRooms(C.Engine,{now:()=>clock});
 const login=rooms.join({name:'Player A',avatar:'offensive',layoutVersion:C.LAYOUT_VERSION},'127.0.0.51');
 const other=rooms.join({name:'Player B',avatar:'offensive',layoutVersion:C.LAYOUT_VERSION},'127.0.0.52');
 const sa=rooms.auth(login.session),sb=rooms.auth(other.session);
 const e=rooms.first.engine,p=e.player(sa.id);
 const act=(session,input)=>{clock+=220;return rooms.action(session,input);};
 assert.throws(()=>act(sa,{type:'arcadeStart',credits:999999}),/Enter the actual Chaos Arcade/);
 const b=I.BUILDINGS.find(b=>b.roomId==='arcade'),door=I.door(b);
 Object.assign(p,{x:door.x,y:door.y});
 act(sa,{type:'enterBuilding',building:'arcade'});
 atTerminal({I,p});
 const starter=p.credits;
 act(sa,{type:'arcadeStart',credits:999999});
 assert.equal(p.credits,starter);
 assert.throws(()=>act(sb,{type:'arcadeStep',score:99999}),/Enter the actual Chaos Arcade/);
 while(p.cabinetRun){
  const current=rooms.snapshot(sa).self.cabinet,gate=current.gate;
  const options=[current.lane,...[-1,1].map(d=>current.lane+d).filter(n=>n>=0&&n<=2)]
    .filter(n=>n!==gate.danger);
  const target=options.includes(gate.bonus)?gate.bonus:options[0]??current.lane;
  if(target!==current.lane)act(sa,{type:'arcadeShift',delta:target-current.lane,credits:999999});
  act(sa,{type:'arcadeStep',score:999999,reward:100000});
 }
 const result=rooms.snapshot(sa).self.cabinetResult;
 assert.equal(result.status,'won',JSON.stringify(result));
 assert.equal(result.reward,35);
 assert.equal(p.credits,starter+35);
 assert.equal(rooms.snapshot(sb).self.cabinet,undefined,'other players see only their own cabinet data');
});
