/* Arcade rules shared by solo play and the authoritative room server. No real assets. */
'use strict';
(function(root){
 const C=root.MemeCityCore,{Engine,WORLD}=C,P=Engine.prototype;
 const base={join:P.join,tick:P.tick,action:P.action,snapshot:P.snapshot,leave:P.leave};
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const gear=(p,slot)=>p.inventory.find(i=>i.uid===p.equipped[slot])?.item;
 const spots=[[1510,800],[1830,690],[470,640],[850,560],[1950,900],[620,1230],[1450,1390],[430,1480]];
 const patrol=[[620,500],[1440,1000],[1800,550],[620,1010]];
 function init(e){if(e.arcade)return;e.arcade={time:0,bots:[],bullets:[],effects:[],pickups:[],clock:0};for(let i=0;i<8;i++)spawn(e,'gang',...spots[i],`gang-${i}`);for(let i=0;i<4;i++)spawn(e,'cop',...patrol[i],`cop-${i}`);for(let i=0;i<12;i++)e.arcade.pickups.push({id:`loot-${i}`,x:180+(i%6)*340,y:i<6?590:910,kind:i%4===0?'med':'credit',ready:0});}
 function spawn(e,kind,x,y,id){const b={id,kind,x,y,homeX:x,homeY:y,hp:kind==='cop'?100:70,maxHp:kind==='cop'?100:70,cooldown:1,respawn:0,phase:e.arcade.bots.length*.9};e.arcade.bots.push(b);return b;}
 function move(o,x,y){const n=Math.max(1,Math.ceil(Math.hypot(x,y)/7));for(let i=0;i<n;i++){if(!C.blocked(o.x+x/n,o.y))o.x+=x/n;if(!C.blocked(o.x,o.y+y/n))o.y+=y/n;}}
 function visible(a,b){const d=distance(a,b);for(let i=1;i<Math.ceil(d/12);i++){const f=i/Math.ceil(d/12);if(C.blocked(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f))return false;}return true;}
 function safe(p){return !p.contract&&p.heat<1&&distance(p,WORLD.spawn)<90;}
 function effect(e,x,y,text,color='#bdff56'){e.arcade.effects.push({id:++e.serial,x,y,text,color,ttl:1.1});if(e.arcade.effects.length>45)e.arcade.effects.shift();}
 function notify(p,text){p.notice=text;p.noticeSeq=(p.noticeSeq||0)+1;}
 function win(e,p){const c=p.contract;if(!c)return;const reward=c.type==='bounty'?100:c.type==='courier'?85:120;p.credits+=reward;p.xp+=100;p.jobs=(p.jobs||0)+1;p.contract=null;effect(e,p.x,p.y,`JOB COMPLETE +${reward}`);notify(p,`Contract complete! +${reward} play credits / +100 XP.`);}
 function hurt(e,p,amount){if(p.invulnerable>0||safe(p))return;p.hp=Math.max(0,p.hp-amount);p.invulnerable=.6;effect(e,p.x,p.y,`−${amount} HP`,'#ff6b87');if(p.hp===0){const fine=Math.min(25,p.credits);p.credits-=fine;p.x=WORLD.spawn.x;p.y=WORLD.spawn.y;p.hp=100;p.heat=0;p.invulnerable=5;p.contract=null;p.deaths++;notify(p,`Busted! Back at the plaza. ${fine} play-credit recovery fee. Your equipment is safe.`);}}
 function bullet(e,source,target,side,owner,damage){const d=Math.max(1,distance(source,target));e.arcade.bullets.push({id:++e.serial,x:source.x,y:source.y-18,vx:(target.x-source.x)/d*650,vy:(target.y-source.y)/d*650,side,owner,damage,ttl:.8});}
 P.join=function(...args){init(this);const p=base.join.apply(this,args);Object.assign(p,{hp:100,heat:0,fireCooldown:0,dashCooldown:0,dashTime:0,invulnerable:3,quiet:0,kills:0,jobs:0,deaths:0,contract:null,notice:'',noticeSeq:0,missionCooldown:0});return p;};
 P.tick=function(dt){init(this);dt=Math.max(0,Math.min(.1,dt));base.tick.call(this,dt);const a=this.arcade;a.time+=dt;
  for(const p of this.players.values()){
   for(const key of ['fireCooldown','dashCooldown','invulnerable','missionCooldown'])p[key]=Math.max(0,p[key]-dt);
   p.quiet+=dt;if(p.quiet>5)p.heat=Math.max(0,p.heat-dt*3.8);
   if(p.dashTime>0){p.dashTime-=dt;move(p,p.input.x*400*dt,p.input.y*400*dt);}else if(gear(p,'feet')==='boots')move(p,p.input.x*25*dt,p.input.y*25*dt);
   if(p.contract){p.contract.remaining-=dt;if(p.contract.remaining<=0){p.contract=null;notify(p,'Contract expired. Pick another job from the mission board.');}else if(p.contract.type==='escape'&&p.heat<8&&a.time-p.contract.started>12)win(this,p);}
   for(const item of a.pickups){if(a.time<item.ready||distance(p,item)>30)continue;if(item.kind==='med'&&p.hp===100)continue;item.ready=a.time+25;if(item.kind==='med'){p.hp=Math.min(100,p.hp+35);effect(this,p.x,p.y,'+35 HEALTH','#6ce6d0');}else{p.credits+=8;p.xp+=5;effect(this,p.x,p.y,'+8 CREDITS');}}
  }
  for(const b of a.bots){
   if(b.hp<=0){b.respawn-=dt;if(b.respawn<=0){b.x=b.homeX;b.y=b.homeY;b.hp=b.maxHp;b.cooldown=1;}continue;}
   b.cooldown=Math.max(0,b.cooldown-dt);const candidates=[...this.players.values()].filter(p=>!safe(p)&&p.invulnerable<3&&(b.kind==='gang'||p.heat>=22)).sort((p,q)=>distance(b,p)-distance(b,q));const p=candidates[0],range=b.kind==='cop'?700:390;
   if(p&&distance(b,p)<range){const d=Math.max(1,distance(b,p)),speed=b.kind==='cop'?160:118;if(d>38){let dx=(p.x-b.x)/d*speed*dt,dy=(p.y-b.y)/d*speed*dt;const before={x:b.x,y:b.y};move(b,dx,dy);if(distance(before,b)<.01)move(b,-dy*2,dx*2);}
    if(b.cooldown===0&&visible(b,p)){if(b.kind==='cop'&&d<440){bullet(this,b,p,'bot',p.id,10);b.cooldown=1.35;}else if(d<48){hurt(this,p,b.kind==='gang'?12:16);b.cooldown=1;}}
   }else{const tx=b.homeX+Math.sin(a.time*.45+b.phase)*65,ty=b.homeY+Math.cos(a.time*.4+b.phase)*35,d=Math.max(1,Math.hypot(tx-b.x,ty-b.y));move(b,(tx-b.x)/d*42*dt,(ty-b.y)/d*42*dt);}
  }
  for(let i=a.bullets.length-1;i>=0;i--){const q=a.bullets[i];q.ttl-=dt;let hit=false;const steps=Math.max(1,Math.ceil(650*dt/9));for(let j=0;j<steps&&!hit;j++){q.x+=q.vx*dt/steps;q.y+=q.vy*dt/steps;if(C.blocked(q.x,q.y)){hit=true;break;}
    if(q.side==='player'){const b=a.bots.find(b=>b.hp>0&&Math.hypot(q.x-b.x,q.y-(b.y-18))<22);if(b){b.hp-=q.damage;hit=true;const p=this.players.get(q.owner);effect(this,b.x,b.y,String(q.damage),'#ffcc71');if(p&&b.kind==='cop'){p.heat=Math.max(p.heat,75);p.quiet=0;}if(b.hp<=0){b.respawn=18;if(p){p.kills++;p.credits+=b.kind==='gang'?18:10;p.xp+=20;p.heat=Math.min(100,p.heat+(b.kind==='cop'?20:9));p.quiet=0;if(b.kind==='gang'&&p.contract?.type==='bounty'){p.contract.progress++;if(p.contract.progress>=4)win(this,p);}}effect(this,b.x,b.y,'KO','#ff8fa7');}}
    }else{const p=this.players.get(q.owner);if(p&&Math.hypot(q.x-p.x,q.y-(p.y-18))<20){hurt(this,p,q.damage);hit=true;}}
   }if(hit||q.ttl<=0)a.bullets.splice(i,1);}
  for(let i=a.effects.length-1;i>=0;i--){a.effects[i].ttl-=dt;a.effects[i].y-=dt*22;if(a.effects[i].ttl<=0)a.effects.splice(i,1);}
 };
 P.action=function(id,action){init(this);const p=this.player(id),a=this.arcade;if(!action||typeof action.type!=='string')throw Error('Invalid action.');
  if(action.type==='fire'){
   if(p.fireCooldown>0)throw Error('Blaster cooling down.');p.fireCooldown=.25;const x=Number(action.x),y=Number(action.y);if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Invalid aim.');
   const enemies=a.bots.filter(b=>b.hp>0&&(b.kind==='gang'||p.heat>=22)&&distance(b,p)<470&&visible(p,b)).sort((b,c)=>distance(p,b)-distance(p,c));const target=enemies[0]||{x:p.x+x*400,y:p.y+y*400};bullet(this,p,target,'player',id,gear(p,'hand')==='blaster'?36:25);p.quiet=0;const copNearby=a.bots.some(b=>b.kind==='cop'&&b.hp>0&&distance(p,b)<320);if(copNearby)p.heat=Math.min(100,p.heat+5);return 'BLAST';
  }
  if(action.type==='dash'){if(p.dashCooldown>0)throw Error('Dash recharging.');p.dashCooldown=2.8;p.dashTime=.22;p.invulnerable=Math.max(p.invulnerable,.25);return 'DASH';}
  if(action.type==='contract'){
   if(p.contract)throw Error('Finish or abandon your current contract first.');if(p.missionCooldown>0)throw Error('Give the mission board a moment to refresh.');if(!['bounty','courier','escape'].includes(action.job))throw Error('Unknown contract.');
   p.missionCooldown=5;p.contract={type:action.job,remaining:action.job==='bounty'?90:action.job==='courier'?65:45,progress:0,started:a.time};
   if(action.job==='bounty'){const offsets=[[230,0],[-230,0],[0,235],[0,-235]];for(let i=0;i<4;i++){const [dx,dy]=offsets[i];let x=Math.max(50,Math.min(WORLD.width-50,p.x+dx)),y=Math.max(50,Math.min(WORLD.height-50,p.y+dy));if(C.blocked(x,y)){x=WORLD.spawn.x+220;y=WORLD.spawn.y+i*35;}if(a.bots.length<24)spawn(this,'gang',x,y,`wave-${++this.serial}`);}}
   if(action.job==='escape'){p.heat=80;p.quiet=0;}
   return action.job==='bounty'?'Street Sweep: knock out 4 hostile bots in 90 seconds.':action.job==='courier'?'Special Delivery: reach Creator Alley in 65 seconds.':'Lose the Heat: evade patrols until the wanted meter clears.';
  }
  if(action.type==='abandon'){if(!p.contract)throw Error('No active contract.');p.contract=null;return 'Contract abandoned. No reward claimed.';}
  if(action.type==='deliver'){if(p.contract?.type!=='courier')throw Error('No delivery active.');if(distance(p,WORLD.route[1])>100)throw Error('Get closer to the delivery beacon.');win(this,p);return 'Delivery complete!';}
  return base.action.call(this,id,action);
 };
 P.snapshot=function(id){init(this);const s=base.snapshot.call(this,id);s.arcade={time:this.arcade.time,bots:this.arcade.bots.map(b=>({...b})),bullets:this.arcade.bullets.map(b=>({...b})),effects:this.arcade.effects.map(e=>({...e})),pickups:this.arcade.pickups.map(i=>({...i}))};return s;};
})(typeof window==='undefined'?globalThis:window);
