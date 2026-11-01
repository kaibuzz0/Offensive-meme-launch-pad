/* Authoritative arcade simulation, shared by solo and room play. */
'use strict';
(function(root){
 const C=root.MemeCityCore,{Engine,WORLD,HUB}=C,P=Engine.prototype;
 const base={join:P.join,tick:P.tick,input:P.input,action:P.action,snapshot:P.snapshot,leave:P.leave};
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const gear=(p,slot)=>p.inventory.find(i=>i.uid===p.equipped[slot])?.item;
 const spots=[[1510,800],[1830,690],[470,640],[850,560],[1950,900],[620,1230],[1450,1390],[430,1480]];
 const patrol=[[620,500],[1440,1000],[1800,550],[620,1010]];
 const jobs={bounty:{name:'Street Sweep',duration:90,reward:100},courier:{name:'Special Delivery',duration:65,reward:85},escape:{name:'Lose the Heat',duration:55,reward:120}};
 const peaceful=p=>!!p.room||['creator','social'].includes(C.areaAt(p.x,p.y));
 function init(e){
  if(e.arcade)return;
  e.arcade={time:0,bots:[],guards:[],bullets:[],effects:[],pickups:[]};
  for(let i=0;i<8;i++)spawn(e,'gang',spots[i][0]+HUB.x,spots[i][1]+HUB.y,`gang-${i}`);
  for(let i=0;i<4;i++)spawn(e,'cop',patrol[i][0]+HUB.x,patrol[i][1]+HUB.y,`cop-${i}`);
  for(const n of C.NEIGHBORHOODS)for(let i=0;i<4;i++){
   const rug=i%2===1;const b=spawn(e,rug?'gang':'cop',n.x+(rug?170:-170),n.y+200+Math.floor(i/2)*100,'block-'+n.id+'-'+i);b.faction=rug?'exit':'congress';b.ranged=true;b.ambient=true;
  }
  for(const n of C.NEIGHBORHOODS)if(!['congress','exit'].includes(n.id))for(let i=0;i<2;i++){const b=spawn(e,'gang',n.x+(i?230:-230),n.y+260,'resident-'+n.id+'-'+i);b.faction=n.id;b.ranged=true;b.ambient=true;b.resident=true;}
  for(let i=0;i<12;i++)e.arcade.pickups.push({id:`loot-${i}`,x:HUB.x+180+(i%6)*340,y:HUB.y+(i<6?590:910),kind:i%4===0?'med':'credit',ready:0});
 }
 // One bounded street conflict, owned by the shared simulation in both modes.
 const CONFLICT=Object.freeze({x:HUB.x+770,y:HUB.y+1000,name:'Founders Crossing',radius:420});
 function conflictState(e){return e.conflict??=( {id:0,phase:'cooldown',remaining:90,winner:null,participants:new Map(),reinforced:false,summary:'Next street conflict is gathering.'});}
 function conflictWave(e,c,count){for(const faction of ['congress','exit'])for(let i=0;i<count;i++){
  if(e.arcade.bots.length>=64)return;
  const b=spawn(e,faction==='congress'?'cop':'gang',CONFLICT.x+(faction==='congress'?-180:180),CONFLICT.y+(i-.5)*65,'conflict-'+c.id+'-'+(++e.serial));
  Object.assign(b,{eventId:c.id,faction,ranged:true,ambient:true,cooldown:2,hp:100,maxHp:100});
 }}
 function finishConflict(e,c,winner){
  c.phase='resolution';c.remaining=12;c.winner=winner;c.summary=winner?(winner==='congress'?'Insider security holds the crossing.':'Rugmasters take the crossing.'):'Stalemate. Both crews withdraw.';
  for(const [id,entry]of c.participants){const p=e.players.get(id);if(!p||entry.paid)continue;entry.paid=true;
   const qualified=entry.damage>=60&&entry.active>=10,reward=qualified?(entry.side===winner?80:40):0;
   if(reward){p.credits+=reward;p.xp+=50;}p.conflictResult={event:c.id,outcome:winner===null?'timeout':entry.side===winner?'victory':'defeat',reward,damage:Math.round(entry.damage)};
   notify(p,c.summary+(reward?` +${reward} play credits / +50 XP.`:' No event reward: contribute 60 damage and stay active for 10 seconds.'));
  }
  e.arcade.bullets=e.arcade.bullets.filter(q=>!e.arcade.bots.some(b=>b.eventId===c.id&&b.id===q.sourceId));
  for(const b of e.arcade.bots.filter(b=>b.eventId===c.id)){b.windup=0;b.cooldown=99;b.state='withdraw';}
 }
 function tickConflict(e,dt){
  const c=conflictState(e);if(!e.players.size)return;c.remaining-=dt;
  if(c.phase==='cooldown'&&c.remaining<=0){c.id++;c.phase='announced';c.remaining=15;c.winner=null;c.participants.clear();c.reinforced=false;c.summary='Insider security and Rugmasters contest Founders Crossing. Join through Clans or watch from outside the ring.';for(const p of e.players.values())notify(p,c.summary);}
  else if(c.phase==='announced'&&c.remaining<=0){c.phase='gathering';c.remaining=10;conflictWave(e,c,2);}
  else if(c.phase==='gathering'&&c.remaining<=0){c.phase='active';c.remaining=75;}
  else if(c.phase==='active'){
   for(const [id,entry]of c.participants){const p=e.players.get(id);if(p&&!p.room&&p.hp>0&&distance(p,CONFLICT)<=CONFLICT.radius&&(p.fireHeld||Math.hypot(p.input.x,p.input.y)>.1))entry.active+=dt;}
   if(c.remaining<=50&&!c.reinforced){c.reinforced=true;conflictWave(e,c,1);}
   const living=e.arcade.bots.filter(b=>b.eventId===c.id&&b.hp>0),insiders=living.filter(b=>b.faction==='congress').length,rugs=living.filter(b=>b.faction==='exit').length;
   if(c.reinforced&&(!insiders||!rugs))finishConflict(e,c,insiders?'congress':rugs?'exit':null);
   else if(c.remaining<=0)finishConflict(e,c,null);
  }else if(c.phase==='resolution'&&c.remaining<=0){e.arcade.bots=e.arcade.bots.filter(b=>b.eventId!==c.id);c.phase='cooldown';c.remaining=180;c.participants.clear();}
 }
 function conflictSnapshot(e,id){const c=conflictState(e),entry=c.participants.get(id),bots=e.arcade.bots.filter(b=>b.eventId===c.id&&b.hp>0);return {id:c.id,phase:c.phase,remaining:c.remaining,winner:c.winner,summary:c.summary,...CONFLICT,insiders:bots.filter(b=>b.faction==='congress').length,rugs:bots.filter(b=>b.faction==='exit').length,entry:entry?{...entry}:null};}
 root.CityConflict=Object.freeze({location:CONFLICT});
 function spawn(e,kind,x,y,id,owner=null){
  const b={id,kind,x,y,homeX:x,homeY:y,hp:kind==='cop'?100:70,maxHp:kind==='cop'?100:70,cooldown:1.2,respawn:0,phase:e.arcade.bots.length*.9,state:'patrol',windup:0,targetId:null,seenAt:-100,aim:null,path:[],pathAt:0,owner};
  e.arcade.bots.push(b);return b;
 }
 function move(o,x,y){
  const n=Math.max(1,Math.ceil(Math.hypot(x,y)/7));
  for(let i=0;i<n;i++){if(!C.blocked(o.x+x/n,o.y,o))o.x+=x/n;if(!C.blocked(o.x,o.y+y/n,o))o.y+=y/n;}
 }
 function visible(a,b){
  const steps=Math.ceil(distance(a,b)/10);
  for(let i=1;i<steps;i++)if(C.blocked(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps,a))return false;
  return true;
 }
 function safe(p){return peaceful(p)||!p.contract&&p.heat<1&&distance(p,WORLD.spawn)<90;}
 function effect(e,x,y,text,color='#bdff56'){e.arcade.effects.push({id:++e.serial,x,y,text,color,ttl:1.1});if(e.arcade.effects.length>45)e.arcade.effects.shift();}
 function notify(p,text){p.notice=text;p.noticeSeq=(p.noticeSeq||0)+1;}
 function cleanup(e,id){e.arcade.bots=e.arcade.bots.filter(b=>b.owner!==id);}
 function result(e,p,status,reward=0){
  const c=p.contract;if(!c)return;
  p.resultSeq=(p.resultSeq||0)+1;
  p.lastResult={id:p.resultSeq,status,job:c.type,name:jobs[c.type].name,reward,xp:status==='complete'?100:0,elapsed:Math.round(e.arcade.time-c.started),kills:p.kills-c.startKills+(p.crewKills||0)-(c.startCrewKills||0)};
  p.contract=null;cleanup(e,p.id);
 }
 function win(e,p){
  if(!p.contract)return;
  const reward=jobs[p.contract.type].reward;p.credits+=reward;p.xp+=100;p.jobs++;
  result(e,p,'complete',reward);effect(e,p.x,p.y,`JOB COMPLETE +${reward}`);
  notify(p,`Contract complete! +${reward} play credits / +100 XP.`);
 }
 function hurt(e,p,amount,zombie=false){
  if(p.ally){if(p.hp<=0||!zombie&&peaceful(p))return;p.hp=Math.max(0,p.hp-amount);if(!p.hp){p.recover=15;p.state='recovering';}return;}

  if(p.invulnerable>0||!zombie&&(safe(p)||p.contract?.countdown>0||p.defense?.countdown>0))return;
  p.hp=Math.max(0,p.hp-amount);p.invulnerable=.8;p.combo=0;
  effect(e,p.x,p.y,`−${amount} HP`,'#ff6b87');
  if(p.hp===0){
   const fine=Math.min(25,p.credits);p.credits-=fine;
   result(e,p,'busted');p.defense=null;cleanup(e,p.id);
   Object.assign(p,{x:WORLD.spawn.x,y:WORLD.spawn.y,hp:100,heat:0,invulnerable:5,dashTime:0,policeSeen:false});p.deaths++;
   notify(p,`Busted! Back at the plaza. ${fine} play-credit recovery fee. Your equipment is safe.`);
  }
 }
 function bullet(e,source,target,side,owner,damage){
  const d=Math.max(.001,distance(source,target)),dx=(target.x-source.x)/d,dy=(target.y-source.y)/d;
  const anchor=C.weaponAnchor(Math.atan2(dy,dx));
  e.arcade.bullets.push({id:++e.serial,x:source.x+anchor.x,y:source.y+anchor.y,launch:{x:source.x,y:source.y},height:anchor.height,vx:dx*650,vy:dy*650,side,owner,sourceId:source.id,sourceFaction:C.factionOf(source),damage,ttl:.8});
 }
 // A bounded grid search gives pursuers a route around solid scenery.
 function route(e,from,to){
  const cell=40,w=Math.ceil(WORLD.width/cell),h=Math.ceil(WORLD.height/cell);
  const index=(x,y)=>Math.floor(y/cell)*w+Math.floor(x/cell),start=index(from.x,from.y),goal=index(to.x,to.y);
  const queue=[start],parent=new Map([[start,-1]]);let end=start,best=Infinity;
  for(let head=0;head<queue.length&&head<2400;head++){
   const at=queue[head],x=at%w,y=Math.floor(at/w),d=Math.abs(x-goal%w)+Math.abs(y-Math.floor(goal/w));
   if(d<best){best=d;end=at;}if(at===goal)break;
   for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=x+dx,ny=y+dy,n=ny*w+nx;
    if(nx<0||ny<0||nx>=w||ny>=h||parent.has(n)||C.blocked(nx*cell+20,ny*cell+20,from))continue;
    parent.set(n,at);queue.push(n);
   }
  }
  const path=[];for(let at=end;at!==start&&at!==-1;at=parent.get(at)??-1)path.push({x:(at%w)*cell+20,y:Math.floor(at/w)*cell+20});
  return path.reverse();
 }
 function steer(e,b,target,speed,dt){
  let goal=target;
  if(!visible(b,target)){
   if(e.arcade.time>b.pathAt){b.path=route(e,b,target);b.pathAt=e.arcade.time+.85;}
   while(b.path.length&&distance(b,b.path[0])<18)b.path.shift();
   if(b.path.length)goal=b.path[0];
  }else b.path=[];
  const d=Math.max(1,distance(b,goal));move(b,(goal.x-b.x)/d*speed*dt,(goal.y-b.y)/d*speed*dt);
 }
 function cleanupRaid(e,id){e.arcade.bots=e.arcade.bots.filter(b=>!(b.raid&&b.owner===id));}
 function freeSpawn(e,p,x,y){for(let r=0;r<6;r++)for(const [dx,dy]of [[0,1],[1,0],[-1,0],[0,-1]]){const pos={x:x+dx*r*32,y:y+dy*r*32};if(!C.blocked(pos.x,pos.y,p))return pos;}return {...WORLD.spawn};}
 function syncCrew(e){
  const a=e.arcade,ids=new Set();for(const p of e.players.values())for(let i=0;i<p.crew.length;i++){
   const record=p.crew[i],id=`${p.id}:${record.id}`;ids.add(id);let g=a.guards.find(g=>g.id===id);const role=C.CREW_TYPES.find(t=>t.id===record.role);
   if(!g){const anchor=record.mode==='follow'?p:record.mode==='patrol'?{x:1000+i*80,y:1000}:record.post||{x:1000+i*80,y:1000};const pos=freeSpawn(e,p,anchor.x+35+i*27,anchor.y+45);g={id,owner:p.id,ally:true,role:role.id,name:role.name,...pos,hp:role.hp,maxHp:role.hp,cooldown:0,recover:0,invulnerable:0,heat:0,quiet:0,state:'guarding',facing:{x:1,y:0},path:[],pathAt:0};a.guards.push(g);}
   g.clan=p.clan;g.outposts=p.outposts;g.mode=record.mode;g.post=record.post||{x:C.PLOT.x+400+i*80,y:C.PLOT.y+600};g.plot=p.plot;g.slot=i;if(C.blocked(g.x,g.y,g))Object.assign(g,freeSpawn(e,p,g.x,g.y));
  }a.guards=a.guards.filter(g=>ids.has(g.id));
 }
 function tickCrew(e,dt){
  for(const g of e.arcade.guards){const owner=e.players.get(g.owner),role=C.CREW_TYPES.find(t=>t.id===g.role);g.cooldown=Math.max(0,g.cooldown-dt);g.flash=Math.max(0,(g.flash||0)-dt);
   if(g.hp<=0){g.recover-=dt;if(g.recover<=0){Object.assign(g,freeSpawn(e,owner,g.post.x,g.post.y));g.hp=role.hp;g.state='guarding';}continue;}
   const enemy=!peaceful(g)&&e.arcade.bots.filter(b=>b.hp>0&&C.npcHostile(b,e.players.get(g.owner))&&!(b.owner&&(e.players.get(b.owner)?.contract?.countdown>0||b.raid&&e.players.get(b.owner)?.defense?.countdown>0))&&distance(g,b)<role.range&&visible(g,b)).sort((a,b)=>distance(g,a)-distance(g,b))[0];
   if(enemy){const d=Math.max(1,distance(g,enemy));g.facing={x:(enemy.x-g.x)/d,y:(enemy.y-g.y)/d};g.state='engaging';g.moving=d<95;if(d<95)move(g,-g.facing.x*role.speed*.55*dt,-g.facing.y*role.speed*.55*dt);if(!g.cooldown){const count=e.arcade.bullets.length;bullet(e,g,enemy,'ally',g.id,role.damage);const q=e.arcade.bullets.at(-1);if(e.arcade.bullets.length>count)q.creditOwner=g.owner;g.cooldown=role.cooldown;g.flash=.1;}continue;}
   let target=g.post;
   if(g.mode==='follow'){const f=owner.facing||{x:1,y:0};target={x:owner.x-f.x*(90+g.slot*18)+f.y*(g.slot%2?40:-40),y:owner.y-f.y*(90+g.slot*18)-f.x*(g.slot%2?40:-40)};}
   if(g.mode==='patrol'){const fort=C.DISTRICTS.find(d=>d.id==='fortress'),points=[{x:fort.ox+680,y:fort.oy+390},{x:fort.ox+1690,y:fort.oy+390},{x:fort.ox+1690,y:fort.oy+1150},{x:fort.ox+550,y:fort.oy+1150}];g.patrolIndex??=g.slot%4;target=points[g.patrolIndex];if(distance(g,target)<28)g.patrolIndex=(g.patrolIndex+1)%4;}
   g.state=g.mode==='follow'?'following':g.mode==='patrol'?'patrolling':'guarding';g.moving=distance(g,target)>35;if(g.moving){const dx=target.x-g.x,dy=target.y-g.y,d=Math.max(1,Math.hypot(dx,dy));g.facing={x:dx/d,y:dy/d};steer(e,g,target,role.speed,dt);}
  }
 }
 function crewAction(e,p,action){
  if(action.type==='hire'){
   if(p.area!=='fortress')throw Error('Walk to Fortress Heights to hire defenders.');if(p.crew.length>=4)throw Error('Your squad is full: maximum four defenders.');
   const role=C.CREW_TYPES.find(t=>t.id===action.role);if(!role)throw Error('Unknown defender.');if(p.credits<role.cost)throw Error('Not enough play credits.');
   let id;do{id=`crew-${++e.serial}`;}while(p.crew.some(g=>g.id===id));p.crew.push({id,role:role.id,mode:'guard',post:{x:p.x,y:p.y}});p.credits-=role.cost;syncCrew(e);return `${role.name} hired. Holding your current position.`;
  }
  if(action.type==='crewOrder'){
   const record=p.crew.find(g=>g.id===action.id);if(!record)throw Error('This defender is not in your squad.');if(!['guard','patrol','follow'].includes(action.mode))throw Error('Unknown squad order.');
   record.mode=action.mode;if(action.mode==='guard')record.post={x:p.x,y:p.y};syncCrew(e);return action.mode==='guard'?'Defender ordered to hold your position.':action.mode==='patrol'?'Defender ordered to patrol your fortress.':'Defender ordered to follow you.';
  }
  if(action.type==='endDefense'){if(!p.defense)throw Error('No active defense drill.');p.defense=null;cleanupRaid(e,p.id);return 'Defense drill cancelled.';}
  if(action.type==='defenseDrill'){
   if(p.area!=='fortress')throw Error('Walk to your fortress to start a defense drill.');if(p.contract||p.defense)throw Error('Finish your current challenge first.');if((p.defenseCooldown||0)>0)throw Error('Defense drill is recharging.');if(e.arcade.bots.length+4>64)throw Error('Too many active enemies.');
   p.defense={remaining:4,timeLeft:120,countdown:3};for(let i=0;i<4;i++){const fort=C.DISTRICTS.find(d=>d.id==='fortress'),b=spawn(e,'gang',fort.ox+850+i*160,fort.oy+1215,`raid-${++e.serial}`,p.id);b.raid=true;b.plot=p.plot;}return 'Defense drill started. Four raiders are approaching your fortress.';
  }
  return null;
 }

 // Undead hordes spawn only in the unbuilt greenbelt, beyond city and clan bases.
 // No wallet gating, persistent saves, new currencies, or client-only hitboxes.
 const ZOMBIE_MAX=12,settlements=[{ox:HUB.x,oy:HUB.y},...C.DISTRICTS,...C.NEIGHBORHOODS];
 const zombieRandom=e=>Math.max(0,Math.min(.999999,(e.zombieRandom||Math.random)()));
 const undead=b=>b?.kind==='zombie';
 function deadZone(x,y){
  if(C.areaAt(x,y)!=='greenbelt'||C.blocked(x,y))return false;
  return settlements.every(r=>Math.hypot(Math.max(r.ox-x,0,x-r.ox-2240),Math.max(r.oy-y,0,y-r.oy-1660))>=100);
 }
 function summonZombies(e){
  const a=e.arcade,alive=a.bots.filter(b=>undead(b)&&b.hp>0).length;
  if(alive>=ZOMBIE_MAX)return 0;
  const players=[...e.players.values()].filter(p=>!p.room&&p.hp>0&&C.areaAt(p.x,p.y)==='greenbelt');
  if(!players.length)return 0;
  const origin=players[Math.floor(zombieRandom(e)*players.length)];
  let start;
  for(let i=0;i<55;i++){
   const radius=450+i%7*165+zombieRandom(e)*95,angle=zombieRandom(e)*Math.PI*2+i*1.256637;
   const x=origin.x+Math.cos(angle)*radius,y=origin.y+Math.sin(angle)*radius;
   if(deadZone(x,y)&&players.every(p=>distance(p,{x,y})>=275)){start={x,y};break;}
  }
  if(!start)return 0;
  const quantity=Math.min(ZOMBIE_MAX-alive,2+Math.floor(zombieRandom(e)*3));
  let added=0;
  for(let i=0;i<quantity;i++){
   const angle=i*2.39996,r=i*40,x=start.x+Math.cos(angle)*r,y=start.y+Math.sin(angle)*r;
   if(!deadZone(x,y)||players.some(p=>distance(p,{x,y})<250))continue;
   const b=spawn(e,'zombie',x,y,'zombie-'+(++e.serial));
   Object.assign(b,{hp:85,maxHp:85,state:'rising',age:0,bite:0,speed:75+zombieRandom(e)*22,
    originalX:x,originalY:y,faceX:1,faceY:0,phase:zombieRandom(e)*Math.PI*2});
   added++;
  }
  if(added)for(const p of players)if(distance(p,start)<1100)
   notify(p,'DEAD ZONE / Walkers are rising beyond the city. Undead attack every clan and faction.');
  return added;
 }
 function tickZombies(e,dt){
  const a=e.arcade;if(!e.players.size)return;
  a.zombieNext??=22;a.zombieNext-=dt;
  if(a.zombieNext<=0)a.zombieNext=summonZombies(e)?45+zombieRandom(e)*30:14;
  for(const z of a.bots.filter(undead)){
   z.age+=dt;
   if(z.hp<=0){z.respawn=Math.min(5,z.respawn)-dt;continue;}
   if(z.age>160){z.hp=0;z.respawn=0;continue;}
   z.bite=Math.max(0,z.bite-dt);
   const monk=e.monkEvent?.active;
   const targets=[
    ...[...e.players.values()].filter(p=>!p.room&&p.hp>0).map(obj=>({kind:'player',obj})),
    ...a.guards.filter(g=>g.hp>0).map(obj=>({kind:'guard',obj})),
    ...a.bots.filter(b=>b!==z&&!undead(b)&&b.hp>0&&(!b.eventId||e.conflict?.phase==='active')).map(obj=>({kind:'npc',obj})),
    ...(monk&&monk.hp!==0?[{kind:'monk',obj:monk}]:[])
   ].filter(t=>distance(z,t.obj)<690&&visible(z,t.obj))
     .sort((x,y)=>distance(z,x.obj)-distance(z,y.obj));
   const target=targets[0];
   if(!target){
    z.state='roam';z.attackTarget=null;
    if(z.age>100&&![...e.players.values()].some(p=>!p.room&&distance(p,z)<1400)){
     z.hp=0;z.respawn=0;continue;
    }
    const goal={x:z.originalX+Math.sin(a.time*.27+z.phase)*65,y:z.originalY+Math.cos(a.time*.22+z.phase)*60};
    const d=Math.max(1,distance(z,goal));move(z,(goal.x-z.x)/d*20*dt,(goal.y-z.y)/d*20*dt);
    continue;
   }
   const v=target.obj,dx=v.x-z.x,dy=v.y-z.y,d=Math.max(1,Math.hypot(dx,dy));
   z.faceX=dx/d;z.faceY=dy/d;z.attackTarget=v.id||'wandering-monk';
   if(d<56){
    z.state='attack';
    if(!z.bite){
     z.bite=1.15+zombieRandom(e)*.3;
     if(target.kind==='npc'){
      v.hp=Math.max(0,v.hp-10);v.hitFlash=.15;
      if(!v.hp){v.respawn=18;v.windup=0;v.targetId=null;}
     }else if(target.kind==='monk')v.hp=Math.max(0,(v.hp??80)-10);
     else hurt(e,v,10,true);
     effect(e,v.x,v.y,'BITE','#b4dc7a');
    }
    continue;
   }
   z.state='chase';
   // Direct steering with a bounded sidestep avoids costly global path searches.
   const step=z.speed*dt,ox=z.x,oy=z.y;
   move(z,z.faceX*step,z.faceY*step);
   if(distance(z,{x:ox,y:oy})<.1){
    const sign=Math.floor(a.time+z.phase)%2?1:-1;
    move(z,-z.faceY*step*sign,z.faceX*step*sign);
   }
  }
  a.bots=a.bots.filter(b=>!undead(b)||b.hp>0&&b.age<=160||b.respawn>0);
 }
 P.join=function(...args){
  init(this);const p=base.join.apply(this,args);
  Object.assign(p,{hp:100,heat:0,fireCooldown:0,dashCooldown:0,dashTime:0,invulnerable:3,quiet:0,kills:0,jobs:0,deaths:0,contract:null,notice:'',noticeSeq:0,missionCooldown:0,facing:{x:1,y:0},dashVector:{x:1,y:0},policeSeen:false,lockTarget:null,combo:0,comboUntil:0,resultSeq:0,lastResult:null,fireHeld:false,fireAim:{x:1,y:0},shots:0});return p;
 };
 P.input=function(id,x,y){base.input.call(this,id,x,y);const p=this.player(id);if(Math.hypot(x,y)>.1&&!p.fireHeld&&p.fireCooldown<.13){const n=Math.hypot(x,y);p.facing={x:x/n,y:y/n};}};
 P.trigger=function(id,held,x=1,y=0,manual=false){
  if(typeof held!=='boolean'||!Number.isFinite(x)||!Number.isFinite(y))throw Error('Invalid fire control.');
  const p=this.player(id);p.fireHeld=held;p.manualAim=manual===true;const n=Math.max(1,Math.hypot(x,y));p.fireAim={x:x/n,y:y/n};
 };
 P.tick=function(dt){
  init(this);syncCrew(this);dt=Math.max(0,Math.min(.1,dt));base.tick.call(this,dt);const a=this.arcade;a.time+=dt;tickConflict(this,dt);tickZombies(this,dt);
  for(const p of this.players.values()){
   for(const k of ['fireCooldown','dashCooldown','invulnerable','missionCooldown'])p[k]=Math.max(0,p[k]-dt);
   p.quiet+=dt;
   p.policeSeen=!peaceful(p)&&p.heat>=22&&a.bots.some(b=>b.kind==='cop'&&b.hp>0&&distance(b,p)<570&&visible(b,p));
   if(p.quiet>5&&!p.policeSeen)p.heat=Math.max(0,p.heat-dt*3.8);
   if(p.comboUntil<a.time)p.combo=0;
   if(safe(p)&&p.quiet>5)p.hp=Math.min(100,p.hp+8*dt);
   if(p.dashTime>0){p.dashTime=Math.max(0,p.dashTime-dt);move(p,p.dashVector.x*400*dt,p.dashVector.y*400*dt);}
   else if(gear(p,'feet')==='boots')move(p,p.input.x*25*dt,p.input.y*25*dt);
   if(p.defense){if(p.defense.countdown>0)p.defense.countdown=Math.max(0,p.defense.countdown-dt);else p.defense.timeLeft-=dt;if(p.defense.timeLeft<=0){p.defense=null;cleanupRaid(this,p.id);notify(p,'Defense drill ended. Your hired squad is safe.');}}
   if(p.contract){
    if(p.contract.countdown>0)p.contract.countdown=Math.max(0,p.contract.countdown-dt);
    else p.contract.remaining-=dt;
    if(p.contract.remaining<=0){result(this,p,'expired');notify(p,'Contract expired. Pick another job from the mission board.');}
    else if(p.contract.type==='escape'&&p.heat<8&&!p.policeSeen&&a.time-p.contract.started>12)win(this,p);
   }
   for(const item of a.pickups){
    if(a.time<item.ready||distance(p,item)>30||item.kind==='med'&&p.hp===100)continue;
    item.ready=a.time+25;
    if(item.kind==='med'){p.hp=Math.min(100,p.hp+35);effect(this,p.x,p.y,'+35 HEALTH','#6ce6d0');}
    else{p.credits+=8;p.xp+=5;effect(this,p.x,p.y,'+8 CREDITS');}
   }
  }
  // Held fire advances with the simulation, so a slow render frame does not lower fire rate.
  for(const p of this.players.values())if(!peaceful(p)&&p.fireHeld&&p.fireCooldown<.000001&&!(p.contract?.countdown>0||p.defense?.countdown>0)){
   p.fireCooldown=0;this.action(p.id,{type:'fire',x:p.fireAim.x,y:p.fireAim.y});
  }
  for(const b of [...a.bots]){
    if(b.kind==='zombie')continue;
   if(b.eventId&&this.conflict?.phase!=='active'){b.state=this.conflict?.phase==='resolution'?'withdraw':'ready';continue;}
   if(b.hp<=0){if(!b.owner&&!b.eventId){b.respawn-=dt;if(b.respawn<=0)Object.assign(b,{x:b.homeX,y:b.homeY,hp:b.maxHp,cooldown:1.2,state:'patrol',windup:0,targetId:null});}continue;}
   if(!b.owner&&![...this.players.values()].some(p=>!p.room&&distance(b,p)<1300)){b.state='dormant';b.windup=0;b.targetId=null;b.attackTarget=null;b.aim=null;b.path=[];b.cooldown=Math.max(b.cooldown,1.2);continue;}
   if(b.owner&&(this.players.get(b.owner)?.contract?.countdown>0||b.raid&&this.players.get(b.owner)?.defense?.countdown>0)){b.state='ready';continue;}
   b.cooldown=Math.max(0,b.cooldown-dt);
   const builder=[...this.players.values()].find(p=>p.plot?.length||p.outposts?.length);b.plot=builder?.plot||[];b.outposts=builder?.outposts||[];
   const old=this.players.get(b.targetId)||a.guards.find(g=>g.id===b.targetId&&g.hp>0);
   const candidates=[...this.players.values(),...a.guards.filter(g=>g.hp>0)].filter(p=>!safe(p)&&C.npcHostile(b,p)&&p.invulnerable<3&&(!b.owner||b.owner===(p.ally?p.owner:p.id))&&distance(b,p)<(b.kind==='cop'?700:390)&&visible(b,p)).sort((p,q)=>distance(b,p)-distance(b,q));
   // Nearby rivals create street battles independent of player aggression.
   const rival=!b.owner&&a.bots.filter(q=>q!==b&&q.hp>0&&!q.owner&&(q.kind==='zombie'||C.rivals(C.factionOf(b),C.factionOf(q)))&&distance(b,q)<440&&visible(b,q)).sort((x,y)=>distance(b,x)-distance(b,y))[0];
   if(rival&&(!candidates[0]||distance(b,rival)<distance(b,candidates[0]))){
    b.state='skirmish';b.aim={x:rival.x,y:rival.y};b.windup=0;
    if(distance(b,rival)>180)steer(this,b,rival,105,dt);
    if(!b.cooldown){bullet(this,b,rival,'faction',rival.id,12);b.cooldown=1.1;}
    continue;
   }
   const p=candidates[0];
   if(p){b.targetId=p.id;b.lastSeen={x:p.x,y:p.y};b.seenAt=a.time;}
   if(b.windup>0){
    b.windup=Math.max(0,b.windup-dt);b.state='attack';
    if(b.windup===0){
     const victim=this.players.get(b.attackTarget)||a.guards.find(g=>g.id===b.attackTarget&&g.hp>0);
     if(victim&&C.npcHostile(b,victim)&&!peaceful(victim)&&(b.kind==='cop'||b.ranged)&&b.aim)bullet(this,b,b.aim,'bot',victim.id,b.boss?14:b.ranged?8:10);
     else if(victim&&C.npcHostile(b,victim)&&!peaceful(victim)&&distance(b,victim)<64&&visible(b,victim))hurt(this,victim,12);
     b.cooldown=b.kind==='cop'?1.15:1.05;b.state='recover';
    }
   }else if(p){
    const d=distance(b,p);b.state='chase';
    if(b.cooldown===0&&(((b.kind==='cop'||b.ranged)&&d<410)||(b.kind==='gang'&&!b.ranged&&d<52))){
     b.windup=b.ranged?.8:b.kind==='cop'?.65:.48;b.windupMax=b.windup;b.attackTarget=p.id;b.aim={x:p.x,y:p.y};b.state='attack';
    }else if(d>(b.kind==='cop'||b.ranged?150:43))steer(this,b,p,b.boss?86:b.kind==='cop'||b.ranged?158:113,dt);
   }else if(old&&C.npcHostile(b,old)&&!peaceful(old)&&b.lastSeen&&a.time-b.seenAt<5&&!safe(old)&&(!b.owner||old.contract)){
    b.state='search';steer(this,b,b.lastSeen,115,dt);
   }else{
    b.state='patrol';b.targetId=null;b.windup=0;
    const home=b.raid?{x:C.PLOT.x+C.PLOT.cols*C.PLOT.tile/2,y:C.PLOT.y+C.PLOT.rows*C.PLOT.tile/2}:{x:b.homeX,y:b.homeY};
    const target={x:home.x+Math.sin(a.time*.45+b.phase)*65,y:home.y+Math.cos(a.time*.4+b.phase)*35};
    if(distance(b,target)>8)steer(this,b,target,42,dt);
   }
  }
  tickCrew(this,dt);
  // Soft separation prevents several enemies occupying the same attack point.
  const living=a.bots.filter(b=>b.hp>0);
  for(let i=0;i<living.length;i++)for(let j=i+1;j<living.length;j++){
   const b=living[i],c=living[j],d=distance(b,c);if(d>=35)continue;
   const angle=d>.01?Math.atan2(c.y-b.y,c.x-b.x):b.phase+1;
   const push=Math.min(2,(35-d)*dt*2.2),x=Math.cos(angle)*push,y=Math.sin(angle)*push;
   move(b,-x,-y);move(c,x,y);
  }
  for(let i=a.bullets.length-1;i>=0;i--){
   const q=a.bullets[i];q.ttl-=dt;let hit=false;
   const launch=q.launch,travel=650*dt+(launch?C.WEAPON.barrel:0),steps=Math.max(1,Math.ceil(travel/9));if(launch){q.x=launch.x;q.y=launch.y;delete q.launch;}
   for(let j=0;j<steps&&!hit;j++){
    q.x+=q.vx/650*travel/steps;q.y+=q.vy/650*travel/steps;
    if(C.blocked(q.x,q.y,this.players.get(q.creditOwner||q.owner)||a.guards.find(g=>g.id===q.owner))){hit=true;break;}
    if(q.side==='faction'){
     const rival=a.bots.find(b=>b.id===q.owner&&b.hp>0&&!b.owner&&(b.kind==='zombie'||C.rivals(q.sourceFaction,C.factionOf(b))));
     if(rival&&Math.hypot(q.x-rival.x,q.y-rival.y)<22){rival.hp-=q.damage;rival.hitFlash=.12;hit=true;if(rival.hp<=0){rival.respawn=18;rival.windup=0;effect(this,rival.x,rival.y,'FACTION KO','#a9cadf');}}
    }else if(q.side==='player'||q.side==='ally'){
     const b=a.bots.find(b=>b.hp>0&&(!b.eventId||this.conflict?.phase==='active')&&C.npcHostile(b,this.players.get(q.creditOwner||q.owner))&&Math.hypot(q.x-b.x,q.y-b.y)<22);
     if(b){
      const actual=Math.min(b.hp,q.damage);b.hp-=q.damage;hit=true;b.hitFlash=.12;
      const event=this.conflict,entry=event?.participants.get(q.owner);if(q.side==='player'&&b.eventId===event?.id&&event.phase==='active'&&entry&&entry.side!==b.faction){const contributor=this.players.get(q.owner);if(contributor&&!contributor.room&&distance(contributor,CONFLICT)<=CONFLICT.radius)entry.damage+=actual;}
      const p=this.players.get(q.creditOwner||q.owner);effect(this,b.x,b.y,String(q.damage),'#ffcc71');
      if(p&&b.kind==='cop'){p.heat=Math.max(p.heat,75);p.quiet=0;}
      if(b.hp<=0){
       b.respawn=18;b.windup=0;
       if(p){
        if(q.side==='ally')p.crewKills++;
        if(q.side!=='ally'&&!b.eventId){p.kills++;if(b.kind!=='zombie'){p.credits+=b.kind==='gang'?18:10;p.xp+=20;}
        p.combo=p.comboUntil>a.time?p.combo+1:1;p.comboUntil=a.time+4;
        }
        if(q.side!=='ally'&&b.kind!=='zombie')p.heat=Math.min(100,p.heat+(b.kind==='cop'?20:9));p.quiet=0;
        if(b.kind==='gang'){
         const owner=b.owner?this.players.get(b.owner):p;
         if(b.owner&&owner?.contract?.type==='bounty'){owner.contract.progress++;if(owner.contract.progress>=4)win(this,owner);}
        }
       }
       effect(this,b.x,b.y,'KO','#ff8fa7');
      }
     }
    }else{
     const p=this.players.get(q.owner)||a.guards.find(g=>g.id===q.owner);
     const shooter=a.bots.find(b=>b.id===q.sourceId);
     if(p&&shooter&&C.npcHostile(shooter,p)&&!peaceful(p)&&Math.hypot(q.x-p.x,q.y-p.y)<20){hurt(this,p,q.damage);hit=true;}
    }
   }
   if(hit||q.ttl<=0)a.bullets.splice(i,1);
  }
  for(const p of this.players.values())if(p.defense&& !a.bots.some(b=>b.raid&&b.owner===p.id&&b.hp>0)){p.credits+=60;p.xp+=40;p.defense=null;p.defenseCooldown=45;cleanupRaid(this,p.id);notify(p,'Fortress defended! +60 play credits / +40 XP.');}
  for(const p of this.players.values())p.defenseCooldown=Math.max(0,(p.defenseCooldown||0)-dt);
  for(const b of a.bots)b.hitFlash=Math.max(0,(b.hitFlash||0)-dt);
  for(let i=a.effects.length-1;i>=0;i--){a.effects[i].ttl-=dt;a.effects[i].y-=dt*22;if(a.effects[i].ttl<=0)a.effects.splice(i,1);}
 };
 P.action=function(id,action){
  init(this);const p=this.player(id),a=this.arcade;p.area=C.areaAt(p.x,p.y);if(typeof action?.manual==='boolean')p.manualAim=action.manual;
  if(!action||typeof action.type!=='string')throw Error('Invalid action.');
  if(peaceful(p)&&['fire','contract'].includes(action.type))throw Error('This district is a peaceful zone.');
  if(action.type==='contract'&&!['hub','arena','fortress'].includes(C.areaAt(p.x,p.y)))throw Error('Start contracts from your fortress, Founder Square or Arena District.');
  const crewResult=crewAction(this,p,action);if(crewResult!==null)return crewResult;
  if(action.type==='joinConflict'){
   const c=conflictState(this);if(!['announced','gathering','active'].includes(c.phase)||c.phase==='active'&&c.remaining<60)throw Error('Enrollment is closed. Watch this round or return for the next one.');
   if(p.room||distance(p,CONFLICT)>CONFLICT.radius)throw Error('Walk to Founders Crossing to join.');
   if(!['congress','exit'].includes(p.clan))throw Error('Join Insider Cunts or Rugmasters first.');
   if(p.contract||p.blockJob||p.defense||p.rising?.arena)throw Error('Finish your current challenge first.');
   if(c.participants.has(id))throw Error('Already enrolled in this conflict.');
   c.participants.set(id,{side:p.clan,damage:0,active:0,paid:false});return 'Enrolled. Deal 60 damage to rival event troops and actively play in the ring for 10 seconds. Rewards arrive once at resolution.';
  }
  if(action.type==='fire'){
   let x=Number(action.x),y=Number(action.y);if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Invalid aim.');const aimLength=Math.max(1,Math.hypot(x,y));x/=aimLength;y/=aimLength;
   if(p.contract?.countdown>0||p.defense?.countdown>0)throw Error('Get ready — the job is starting.');
   if(p.fireCooldown>0)throw Error('Blaster cooling down.');p.fireCooldown=.25;p.shots++;
   const enemies=a.bots.filter(b=>b.hp>0&&C.npcHostile(b,p)&&distance(b,p)<470&&visible(p,b)&&(!p.manualAim||((b.x-p.x)*x+(b.y-p.y)*y)/Math.max(1,distance(p,b))>.86)).sort((b,c)=>distance(p,b)-distance(p,c));
   const locked=enemies.find(b=>b.id===p.lockTarget);if(locked&&distance(p,locked)<=distance(p,enemies[0])+75){enemies.splice(enemies.indexOf(locked),1);enemies.unshift(locked);}
   const target=enemies[0]||{x:p.x+x*400,y:p.y+y*400};p.lockTarget=enemies[0]?.id||null;
   const d=Math.max(1,distance(p,target));p.facing={x:(target.x-p.x)/d,y:(target.y-p.y)/d};
   bullet(this,p,target,'player',id,gear(p,'hand')==='blaster'?36:25);p.quiet=0;
   if(a.bots.some(b=>b.kind==='cop'&&b.hp>0&&distance(p,b)<320&&visible(p,b)))p.heat=Math.min(100,p.heat+5);
   return 'BLAST';
  }
  if(action.type==='dash'){
   if(p.dashCooldown>0)throw Error('Dash recharging.');
   p.dashVector={...p.facing};p.dashCooldown=2.8;p.dashTime=.22;p.invulnerable=Math.max(p.invulnerable,.3);return 'DASH';
  }
  if(action.type==='contract'){
   if(p.defense)throw Error('Finish your fortress defense drill first.');
   if(p.area==='arena'&&action.job!=='bounty')throw Error('Street Sweep runs here. Other jobs start in Founder Square.');
   if(p.contract)throw Error('Finish or abandon your current contract first.');
   if(p.missionCooldown>0)throw Error('Give the mission board a moment to refresh.');
   const job=jobs[action.job];if(!job)throw Error('Unknown contract.');
   if(action.job==='bounty'&&a.bots.length+4>64)throw Error('Street Sweep is busy. Try another contract.');
   cleanup(this,id);p.missionCooldown=5;p.lastResult=null;
   p.contract={type:action.job,remaining:job.duration,duration:job.duration,progress:0,countdown:2.5,started:a.time,startKills:p.kills,startCrewKills:p.crewKills||0};
   if(action.job==='bounty'){
    const offsets=[[270,40],[-270,40],[185,210],[-185,210]];
    for(let i=0;i<4;i++){
     const [dx,dy]=offsets[i];let x=Math.max(50,Math.min(WORLD.width-50,p.x+dx)),y=Math.max(50,Math.min(WORLD.height-50,p.y+dy));
     if(C.blocked(x,y)){x=WORLD.spawn.x+220;y=WORLD.spawn.y+i*35;}
     spawn(this,'gang',x,y,`wave-${++this.serial}`,id);
    }
   }
   if(action.job==='escape'){p.heat=80;p.quiet=0;}
   return `${job.name}: get ready! ${action.job==='bounty'?'Knock out 4 hostile bots.':action.job==='courier'?'Deliver to Creator Alley.':'Break line of sight with the cops.'}`;
  }
  if(action.type==='abandon'){if(!p.contract)throw Error('No active contract.');result(this,p,'abandoned');return 'Contract abandoned. No reward claimed.';}
  if(action.type==='deliver'){
   if(p.contract?.type!=='courier')throw Error('No delivery active.');
   if(p.contract.countdown>0)throw Error('Wait for the starting signal.');
   if(distance(p,WORLD.route[1])>100)throw Error('Get closer to the delivery beacon.');
   win(this,p);return 'Delivery complete!';
  }
  const message=base.action.call(this,id,action);
  if(action.type==='travel')a.bullets=a.bullets.filter(q=>q.owner!==id);
  return message;
 };
 P.leave=function(id){if(this.arcade){cleanup(this,id);this.arcade.guards=this.arcade.guards.filter(g=>g.owner!==id);}return base.leave.call(this,id);};
 P.snapshot=function(id){
  init(this);const s=base.snapshot.call(this,id);
  s.conflict=conflictSnapshot(this,id);s.arcade={zombieNext:this.arcade.zombieNext,guards:this.arcade.guards.map(({plot,path,...g})=>({...g})),time:this.arcade.time,bots:this.arcade.bots.map(({path,plot,...b})=>({...b})),bullets:this.arcade.bullets.map(b=>({...b})),effects:this.arcade.effects.map(e=>({...e})),pickups:this.arcade.pickups.map(i=>({...i}))};return s;
 };
})(typeof window==='undefined'?globalThis:window);
