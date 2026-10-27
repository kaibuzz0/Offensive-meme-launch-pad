/* Authoritative arcade simulation, shared by solo and room play. */
'use strict';
(function(root){
 const C=root.MemeCityCore,{Engine,WORLD}=C,P=Engine.prototype;
 const base={join:P.join,tick:P.tick,input:P.input,action:P.action,snapshot:P.snapshot,leave:P.leave};
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const gear=(p,slot)=>p.inventory.find(i=>i.uid===p.equipped[slot])?.item;
 const spots=[[1510,800],[1830,690],[470,640],[850,560],[1950,900],[620,1230],[1450,1390],[430,1480]];
 const patrol=[[620,500],[1440,1000],[1800,550],[620,1010]];
 const jobs={bounty:{name:'Street Sweep',duration:90,reward:100},courier:{name:'Special Delivery',duration:65,reward:85},escape:{name:'Lose the Heat',duration:55,reward:120}};
 function init(e){
  if(e.arcade)return;
  e.arcade={time:0,bots:[],bullets:[],effects:[],pickups:[]};
  for(let i=0;i<8;i++)spawn(e,'gang',...spots[i],`gang-${i}`);
  for(let i=0;i<4;i++)spawn(e,'cop',...patrol[i],`cop-${i}`);
  for(let i=0;i<12;i++)e.arcade.pickups.push({id:`loot-${i}`,x:180+(i%6)*340,y:i<6?590:910,kind:i%4===0?'med':'credit',ready:0});
 }
 function spawn(e,kind,x,y,id,owner=null){
  const b={id,kind,x,y,homeX:x,homeY:y,hp:kind==='cop'?100:70,maxHp:kind==='cop'?100:70,cooldown:1.2,respawn:0,phase:e.arcade.bots.length*.9,state:'patrol',windup:0,targetId:null,seenAt:-100,aim:null,path:[],pathAt:0,owner};
  e.arcade.bots.push(b);return b;
 }
 function move(o,x,y){
  const n=Math.max(1,Math.ceil(Math.hypot(x,y)/7));
  for(let i=0;i<n;i++){if(!C.blocked(o.x+x/n,o.y))o.x+=x/n;if(!C.blocked(o.x,o.y+y/n))o.y+=y/n;}
 }
 function visible(a,b){
  const steps=Math.ceil(distance(a,b)/10);
  for(let i=1;i<steps;i++)if(C.blocked(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps))return false;
  return true;
 }
 function safe(p){return !p.contract&&p.heat<1&&distance(p,WORLD.spawn)<90;}
 function effect(e,x,y,text,color='#bdff56'){e.arcade.effects.push({id:++e.serial,x,y,text,color,ttl:1.1});if(e.arcade.effects.length>45)e.arcade.effects.shift();}
 function notify(p,text){p.notice=text;p.noticeSeq=(p.noticeSeq||0)+1;}
 function cleanup(e,id){e.arcade.bots=e.arcade.bots.filter(b=>b.owner!==id);}
 function result(e,p,status,reward=0){
  const c=p.contract;if(!c)return;
  p.resultSeq=(p.resultSeq||0)+1;
  p.lastResult={id:p.resultSeq,status,job:c.type,name:jobs[c.type].name,reward,xp:status==='complete'?100:0,elapsed:Math.round(e.arcade.time-c.started),kills:p.kills-c.startKills};
  p.contract=null;cleanup(e,p.id);
 }
 function win(e,p){
  if(!p.contract)return;
  const reward=jobs[p.contract.type].reward;p.credits+=reward;p.xp+=100;p.jobs++;
  result(e,p,'complete',reward);effect(e,p.x,p.y,`JOB COMPLETE +${reward}`);
  notify(p,`Contract complete! +${reward} play credits / +100 XP.`);
 }
 function hurt(e,p,amount){
  if(p.invulnerable>0||safe(p)||p.contract?.countdown>0)return;
  p.hp=Math.max(0,p.hp-amount);p.invulnerable=.8;p.combo=0;
  effect(e,p.x,p.y,`−${amount} HP`,'#ff6b87');
  if(p.hp===0){
   const fine=Math.min(25,p.credits);p.credits-=fine;
   result(e,p,'busted');cleanup(e,p.id);
   Object.assign(p,{x:WORLD.spawn.x,y:WORLD.spawn.y,hp:100,heat:0,invulnerable:5,dashTime:0,policeSeen:false});p.deaths++;
   notify(p,`Busted! Back at the plaza. ${fine} play-credit recovery fee. Your equipment is safe.`);
  }
 }
 function bullet(e,source,target,side,owner,damage){
  const d=Math.max(1,distance(source,target));
  e.arcade.bullets.push({id:++e.serial,x:source.x,y:source.y-18,vx:(target.x-source.x)/d*650,vy:(target.y-source.y)/d*650,side,owner,damage,ttl:.8});
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
    if(nx<0||ny<0||nx>=w||ny>=h||parent.has(n)||C.blocked(nx*cell+20,ny*cell+20))continue;
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
 P.join=function(...args){
  init(this);const p=base.join.apply(this,args);
  Object.assign(p,{hp:100,heat:0,fireCooldown:0,dashCooldown:0,dashTime:0,invulnerable:3,quiet:0,kills:0,jobs:0,deaths:0,contract:null,notice:'',noticeSeq:0,missionCooldown:0,facing:{x:1,y:0},dashVector:{x:1,y:0},policeSeen:false,lockTarget:null,combo:0,comboUntil:0,resultSeq:0,lastResult:null,fireHeld:false,fireAim:{x:1,y:0},shots:0});return p;
 };
 P.input=function(id,x,y){base.input.call(this,id,x,y);const p=this.player(id);if(Math.hypot(x,y)>.1){const n=Math.hypot(x,y);p.facing={x:x/n,y:y/n};}};
 P.trigger=function(id,held,x=1,y=0){
  if(typeof held!=='boolean'||!Number.isFinite(x)||!Number.isFinite(y))throw Error('Invalid fire control.');
  const p=this.player(id);p.fireHeld=held;const n=Math.max(1,Math.hypot(x,y));p.fireAim={x:x/n,y:y/n};
 };
 P.tick=function(dt){
  init(this);dt=Math.max(0,Math.min(.1,dt));base.tick.call(this,dt);const a=this.arcade;a.time+=dt;
  for(const p of this.players.values()){
   for(const k of ['fireCooldown','dashCooldown','invulnerable','missionCooldown'])p[k]=Math.max(0,p[k]-dt);
   p.quiet+=dt;
   p.policeSeen=p.heat>=22&&a.bots.some(b=>b.kind==='cop'&&b.hp>0&&distance(b,p)<570&&visible(b,p));
   if(p.quiet>5&&!p.policeSeen)p.heat=Math.max(0,p.heat-dt*3.8);
   if(p.comboUntil<a.time)p.combo=0;
   if(safe(p)&&p.quiet>5)p.hp=Math.min(100,p.hp+8*dt);
   if(p.dashTime>0){p.dashTime=Math.max(0,p.dashTime-dt);move(p,p.dashVector.x*400*dt,p.dashVector.y*400*dt);}
   else if(gear(p,'feet')==='boots')move(p,p.input.x*25*dt,p.input.y*25*dt);
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
  for(const p of this.players.values())if(p.fireHeld&&p.fireCooldown<.000001&&!(p.contract?.countdown>0)){
   p.fireCooldown=0;this.action(p.id,{type:'fire',x:p.fireAim.x,y:p.fireAim.y});
  }
  for(const b of [...a.bots]){
   if(b.hp<=0){if(!b.owner){b.respawn-=dt;if(b.respawn<=0)Object.assign(b,{x:b.homeX,y:b.homeY,hp:b.maxHp,cooldown:1.2,state:'patrol',windup:0,targetId:null});}continue;}
   if(b.owner&&this.players.get(b.owner)?.contract?.countdown>0){b.state='ready';continue;}
   b.cooldown=Math.max(0,b.cooldown-dt);
   const old=this.players.get(b.targetId);
   const candidates=[...this.players.values()].filter(p=>!safe(p)&&p.invulnerable<3&&(!b.owner||b.owner===p.id)&&(b.kind==='gang'||p.heat>=22)&&distance(b,p)<(b.kind==='cop'?700:390)&&visible(b,p)).sort((p,q)=>distance(b,p)-distance(b,q));
   const p=candidates[0];
   if(p){b.targetId=p.id;b.lastSeen={x:p.x,y:p.y};b.seenAt=a.time;}
   if(b.windup>0){
    b.windup=Math.max(0,b.windup-dt);b.state='attack';
    if(b.windup===0){
     const victim=this.players.get(b.attackTarget);
     if(victim&&b.kind==='cop'&&b.aim)bullet(this,b,b.aim,'bot',victim.id,10);
     else if(victim&&distance(b,victim)<64&&visible(b,victim))hurt(this,victim,12);
     b.cooldown=b.kind==='cop'?1.15:1.05;b.state='recover';
    }
   }else if(p){
    const d=distance(b,p);b.state='chase';
    if(b.cooldown===0&&((b.kind==='cop'&&d<410)||(b.kind==='gang'&&d<52))){
     b.windup=b.kind==='cop'?.65:.48;b.windupMax=b.windup;b.attackTarget=p.id;b.aim={x:p.x,y:p.y};b.state='attack';
    }else if(d>(b.kind==='cop'?150:43))steer(this,b,p,b.kind==='cop'?158:113,dt);
   }else if(old&&b.lastSeen&&a.time-b.seenAt<5&&!safe(old)&&(!b.owner||old.contract)){
    b.state='search';steer(this,b,b.lastSeen,115,dt);
   }else{
    b.state='patrol';b.targetId=null;b.windup=0;
    const target={x:b.homeX+Math.sin(a.time*.45+b.phase)*65,y:b.homeY+Math.cos(a.time*.4+b.phase)*35};
    if(distance(b,target)>8)steer(this,b,target,42,dt);
   }
  }
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
   const steps=Math.max(1,Math.ceil(650*dt/9));
   for(let j=0;j<steps&&!hit;j++){
    q.x+=q.vx*dt/steps;q.y+=q.vy*dt/steps;
    if(C.blocked(q.x,q.y)){hit=true;break;}
    if(q.side==='player'){
     const b=a.bots.find(b=>b.hp>0&&Math.hypot(q.x-b.x,q.y-(b.y-18))<22);
     if(b){
      b.hp-=q.damage;hit=true;b.hitFlash=.12;
      const p=this.players.get(q.owner);effect(this,b.x,b.y,String(q.damage),'#ffcc71');
      if(p&&b.kind==='cop'){p.heat=Math.max(p.heat,75);p.quiet=0;}
      if(b.hp<=0){
       b.respawn=18;b.windup=0;
       if(p){
        p.kills++;p.credits+=b.kind==='gang'?18:10;p.xp+=20;
        p.combo=p.comboUntil>a.time?p.combo+1:1;p.comboUntil=a.time+4;
        p.heat=Math.min(100,p.heat+(b.kind==='cop'?20:9));p.quiet=0;
        if(b.kind==='gang'){
         const owner=b.owner?this.players.get(b.owner):p;
         if(owner?.contract?.type==='bounty'){owner.contract.progress++;if(owner.contract.progress>=4)win(this,owner);}
        }
       }
       effect(this,b.x,b.y,'KO','#ff8fa7');
      }
     }
    }else{
     const p=this.players.get(q.owner);
     if(p&&Math.hypot(q.x-p.x,q.y-(p.y-18))<20){hurt(this,p,q.damage);hit=true;}
    }
   }
   if(hit||q.ttl<=0)a.bullets.splice(i,1);
  }
  for(const b of a.bots)b.hitFlash=Math.max(0,(b.hitFlash||0)-dt);
  for(let i=a.effects.length-1;i>=0;i--){a.effects[i].ttl-=dt;a.effects[i].y-=dt*22;if(a.effects[i].ttl<=0)a.effects.splice(i,1);}
 };
 P.action=function(id,action){
  init(this);const p=this.player(id),a=this.arcade;
  if(!action||typeof action.type!=='string')throw Error('Invalid action.');
  if(action.type==='fire'){
   const x=Number(action.x),y=Number(action.y);if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Invalid aim.');
   if(p.contract?.countdown>0)throw Error('Get ready — the job is starting.');
   if(p.fireCooldown>0)throw Error('Blaster cooling down.');p.fireCooldown=.25;p.shots++;
   const enemies=a.bots.filter(b=>b.hp>0&&(b.kind==='gang'||p.heat>=22)&&distance(b,p)<470&&visible(p,b)).sort((b,c)=>distance(p,b)-distance(p,c));
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
   if(p.contract)throw Error('Finish or abandon your current contract first.');
   if(p.missionCooldown>0)throw Error('Give the mission board a moment to refresh.');
   const job=jobs[action.job];if(!job)throw Error('Unknown contract.');
   if(action.job==='bounty'&&a.bots.length+4>48)throw Error('Street Sweep is busy. Try another contract.');
   cleanup(this,id);p.missionCooldown=5;p.lastResult=null;
   p.contract={type:action.job,remaining:job.duration,duration:job.duration,progress:0,countdown:2.5,started:a.time,startKills:p.kills};
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
  return base.action.call(this,id,action);
 };
 P.leave=function(id){if(this.arcade)cleanup(this,id);return base.leave.call(this,id);};
 P.snapshot=function(id){
  init(this);const s=base.snapshot.call(this,id);
  s.arcade={time:this.arcade.time,bots:this.arcade.bots.map(({path,...b})=>({...b})),bullets:this.arcade.bullets.map(b=>({...b})),effects:this.arcade.effects.map(e=>({...e})),pickups:this.arcade.pickups.map(i=>({...i}))};return s;
 };
})(typeof window==='undefined'?globalThis:window);
