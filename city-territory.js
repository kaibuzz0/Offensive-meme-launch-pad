/* District Defense: two bounded faction incursions in the one existing Meme City. */
'use strict';
(function(root){
 const C=root.MemeCityCore,P=C.Engine.prototype;
 const base={action:P.action,tick:P.tick,snapshot:P.snapshot,leave:P.leave};
 const RANGE=610,DURATION=115,MIN_DAMAGE=65,MIN_ACTIVE=7,REWARD=55,XP=50;
 const WAVES=Object.freeze([3,4]);
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const notice=(p,text)=>{p.notice=text;p.noticeSeq=(p.noticeSeq||0)+1;};
 function destroy(e,owner){
  if(!e.arcade)return;
  const ids=new Set(e.arcade.bots.filter(b=>b.territoryOwner===owner).map(b=>b.id));
  e.arcade.bullets=e.arcade.bullets.filter(q=>!ids.has(q.sourceId));
  e.arcade.bots=e.arcade.bots.filter(b=>b.territoryOwner!==owner);
 }
 function end(e,status){
  const q=e.territoryEvent;if(!q)return;
  destroy(e,q.owner);e.territoryEvent=null;
  const p=e.players.get(q.owner);if(!p)return;
  const qualified=status==='won'&&q.damage>=MIN_DAMAGE&&q.active>=MIN_ACTIVE;
  p.territoryRun=null;p.territoryCooldown=status==='won'?50:status==='abandoned'?15:30;
  const reward=qualified?REWARD:0,xp=qualified?XP:0;
  if(qualified){p.credits+=reward;p.xp+=xp;p.jobs++;
   p.reputation[q.clan]=Math.min(10000,(p.reputation[q.clan]||0)+1);}
  p.territoryResult={status:status==='won'&&!qualified?'assisted':status,
   clan:q.clan,wave:q.wave,damage:Math.round(q.damage),active:Math.floor(q.active),reward,xp};
  notice(p,qualified?`DISTRICT SECURED / +${reward} play credits, +${xp} XP and +1 clan reputation.`:
   status==='won'?'Your patrols secured the block. Personal rewards require 65 direct damage and 7 active seconds.':
   status==='abandoned'?'District defense cancelled. No rewards.':
   status==='left'?'Left the defended block. No rewards.':
   status==='busted'?'District defense lost. Your saved clan standing is safe.':
   'District defense timed out. All response squads withdrawn.');
 }
 function validSpot(q,i,used){
  for(let j=0;j<55;j++){
   const a=i*1.19+j*.43+q.wave*.5,r=205+(i%3)*60+(j%4)*14;
   const x=q.x+Math.cos(a)*r,y=q.y+Math.sin(a)*r,pos={x,y};
   if(C.areaAt(x,y)===q.clan&&!C.blocked(x,y)&&dist(pos,q)<460&&
    used.every(o=>dist(o,pos)>64))return pos;
  }
  return null;
 }
 function wave(e){
  const q=e.territoryEvent;if(!q)return;
  const count=WAVES[q.wave],a=e.arcade;
  a.bots=a.bots.filter(b=>b.territoryOwner!==q.owner||b.hp>0);
  if(a.bots.length+count+1>64){end(e,'expired');return;}
  const positions=[];
  for(let i=0;i<count+1;i++){
   const pos=validSpot(q,i,positions);
   if(!pos){end(e,'expired');return;}
   positions.push(pos);
  }
  function bot(faction,role,i){
   const pos=positions[i],cop=faction==='congress',hp=role==='defender'?115:95;
   a.bots.push({id:`district-${role}-${++e.serial}`,kind:cop?'cop':'gang',
    x:pos.x,y:pos.y,homeX:pos.x,homeY:pos.y,hp,maxHp:hp,cooldown:1.2,
    respawn:0,phase:e.serial*.9,state:'rally',windup:0,targetId:null,
    seenAt:-100,aim:null,path:[],pathAt:0,owner:null,ambient:true,ranged:true,
    resident:role==='defender',faction,territoryRole:role,territoryOwner:q.owner,
    territoryWave:q.wave+1});
  }
  for(let i=0;i<count;i++)bot(q.enemy,'invader',i);
  bot(q.clan,'defender',count);
  q.wave++;q.phase='active';q.next=0;
  for(const p of e.players.values())if(!p.room&&dist(p,q)<RANGE)
   notice(p,`DISTRICT ALERT / WAVE ${q.wave}/2. ${q.enemy.toUpperCase()} raiders are attacking; allied responders mobilized.`);
 }
 function state(e,id){
  const q=e.territoryEvent,p=e.players.get(id);
  const self={cooldown:p?.territoryCooldown||0,result:p?.territoryResult?{...p.territoryResult}:null};
  if(!q)return {phase:'idle',...self};
  return {phase:q.phase,clan:q.clan,enemy:q.enemy,owner:q.owner,
   ownerName:e.players.get(q.owner)?.name||'Guest',mine:q.owner===id,
   x:q.x,y:q.y,radius:RANGE,remaining:q.remaining,next:q.next,wave:q.wave,
   invaders:e.arcade.bots.filter(b=>b.territoryOwner===q.owner&&b.territoryRole==='invader'&&b.hp>0).length,
   defenders:e.arcade.bots.filter(b=>b.territoryOwner===q.owner&&b.territoryRole==='defender'&&b.hp>0).length,
   damage:q.owner===id?q.damage:0,active:q.owner===id?q.active:0,
   minDamage:MIN_DAMAGE,minActive:MIN_ACTIVE,...self};
 }
 P.action=function(id,a){
  const p=this.player(id);
  if(a?.type==='startTerritoryDefense'){
   const n=C.NEIGHBORHOODS.find(n=>n.id===p.clan);
   if(!n)throw Error('Join a clan before defending its territory.');
   if(p.room||C.areaAt(p.x,p.y)!==n.id||dist(p,n)>150)
    throw Error('Walk to your own clan terminal to start district defense.');
   if(p.contract||p.defense||p.blockJob||p.rising?.arena||p.quarantineRun||p.territoryRun)
    throw Error('Finish or abandon your active challenge first.');
   if(p.heat>=22)throw Error('Lose your wanted pursuit first.');
   if(this.territoryEvent)throw Error('Another district defense is already active in this room.');
   if((p.territoryCooldown||0)>0)throw Error('Your district defense beacon is recharging.');
   if(this.quarantineEvent||this.arcade?.bots.length>56)
    throw Error('The streets are too crowded to admit another defense squad.');
   const enemy=C.FACTIONS[n.id].enemies[0];
   p.territoryRun=true;p.territoryResult=null;
   this.territoryEvent={owner:id,clan:n.id,enemy,x:n.x,y:n.y,
    phase:'warning',remaining:DURATION,next:4,wave:0,damage:0,active:0,
    startDeaths:p.deaths};
   notice(p,'DISTRICT ALERT / Four seconds to prepare. Defend two waves alongside allied NPC patrols.');
   return 'Territory Defense started. Defeat two raiding waves, contribute 65 damage and stay active for 7 seconds.';
  }
  if(a?.type==='endTerritoryDefense'){
   if(this.territoryEvent?.owner!==id)throw Error('You have no active district defense to end.');
   end(this,'abandoned');return 'District defense ended. All temporary NPCs cleaned up.';
  }
  if(p.territoryRun&&['joinClan','blockJob','contract','defenseDrill','startSurvival',
   'startQuarantine','joinConflict','enterBuilding'].includes(a?.type))
   throw Error('Finish or retreat from district defense first.');
  return base.action.call(this,id,a);
 };
 P.tick=function(dt){
  base.tick.call(this,dt);dt=Math.max(0,Math.min(.1,dt));
  for(const p of this.players.values())
   p.territoryCooldown=Math.max(0,(p.territoryCooldown||0)-dt);
  const q=this.territoryEvent;if(!q)return;
  const p=this.players.get(q.owner);
  if(!p){destroy(this,q.owner);this.territoryEvent=null;return;}
  if(p.deaths>q.startDeaths||p.hp<=0){end(this,'busted');return;}
  if(p.room||C.areaAt(p.x,p.y)!==q.clan||dist(p,q)>RANGE){
   end(this,'left');return;
  }
  q.remaining-=dt;if(q.remaining<=0){end(this,'expired');return;}
  if(q.phase==='active'){
   if(p.fireHeld||Math.hypot(p.input.x,p.input.y)>.1)q.active+=dt;
   if(this.arcade.bots.some(b=>b.territoryOwner===q.owner&&
     b.territoryRole==='invader'&&b.hp>0))return;
   if(q.wave===WAVES.length){end(this,'won');return;}
   q.phase='warning';q.next=4;
   notice(p,'WAVE CLEARED / Allied patrols are regrouping. New raiders in 4 seconds.');
  }
  q.next=Math.max(0,q.next-dt);
  if(!q.next)wave(this);
 };
 P.snapshot=function(id){const s=base.snapshot.call(this,id);s.territory=state(this,id);return s;};
 P.leave=function(id){
  if(this.territoryEvent?.owner===id){destroy(this,id);this.territoryEvent=null;}
  return base.leave.call(this,id);
 };
 root.CityTerritory=Object.freeze({RANGE,DURATION,MIN_DAMAGE,MIN_ACTIVE,REWARD,XP,WAVES});
})(typeof window==='undefined'?globalThis:window);
