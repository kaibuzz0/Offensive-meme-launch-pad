/* World-v2 review-only simulation: real collision, combat, patrols, defense and route rewards.
 * This is NOT the authoritative multiplayer engine and NEVER accesses storage or wallets.
 */
'use strict';
(function(root){
 function create(C,W,registry,Nav){
  if(!C?.BUILD_KIT||!W?.blocked||!registry?.resolve||!Nav?.createRouter)throw Error('World2 simulation dependencies missing');
  const nav=Nav.createRouter({WORLD:W.world,blocked:W.blocked},{cell:80,budget:11000});
  const plot=W.fortress,player={id:'preview-player',x:W.spawn.x,y:W.spawn.y,aim:{x:0,y:-1},
   hp:100,maxHp:100,heat:0,xp:0,credits:180,route:0,completed:false,kills:0,
   plot:[],outposts:[],crew:[],inventory:[],equipped:{},style:{skin:0,hair:0,pants:0,print:0},ammo:24,fireCooldown:0};
  const agents=[],mission={status:'idle',remaining:0,wave:0,earned:0},events=[];
  let input={x:0,y:0},time=0,sequence=0,respawnTimer=0;
  const clamp=(x,min,max)=>Math.min(max,Math.max(min,x)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const emit=message=>{events.push(message);if(events.length>15)events.shift();return message;};
  const positions=[
   {x:W.spawn.x,y:W.spawn.y-440,clan:'rugs'},
   {x:W.world.center.x+850,y:W.world.center.y,clan:'insiders'},
   {x:W.world.center.x,y:W.world.center.y+880,clan:'rugs'},
   {x:W.world.center.x-820,y:W.world.center.y,clan:'rugs'}
  ];
  function add(kind,point,options={}){
   const location=!W.blocked(point.x,point.y,player)?point:null;
   if(!location)throw Error('World2 spawn is obstructed: '+kind);
   const bot={id:'w2-'+(++sequence),kind,clan:options.clan||null,x:location.x,y:location.y,
    home:{x:location.x,y:location.y},hp:kind==='defender'?95:kind==='police'?75:60,
    maxHp:kind==='defender'?95:kind==='police'?75:60,cooldown:0,route:[],routeAt:0,
    raid:!!options.raid,alive:true};
   agents.push(bot);return bot;
  }
  const defender=add('defender',{x:W.spawn.x-110,y:W.spawn.y+100});
  const gangs=positions.map((p,i)=>add(i===1?'police':'gang',p,{clan:p.clan}));
  function move(unit,toward,speed,dt){
   const d=dist(unit,toward);if(d<4)return;
   let dest=toward;
   if(!nav.clear(unit,toward,player)){
    if(unit.routeAt<=time||!unit.route.length){
     const r=nav.plan(unit,toward,player);
     unit.route=r.status==='ok'?r.points.slice(1):[];
     unit.routeAt=time+1.8;
    }
    while(unit.route.length&&dist(unit,unit.route[0])<25)unit.route.shift();
    if(!unit.route.length)return;
    dest=unit.route[0];
   }else unit.route=[];
   const n=Math.max(1,dist(unit,dest)),dx=(dest.x-unit.x)/n*speed*dt,dy=(dest.y-unit.y)/n*speed*dt;
   if(!W.blocked(unit.x+dx,unit.y,player))unit.x+=dx;
   if(!W.blocked(unit.x,unit.y+dy,player))unit.y+=dy;
  }
  function hurt(agent,damage){
   if(!agent.alive)return false;
   agent.hp=Math.max(0,agent.hp-damage);
   if(agent.hp>0)return false;
   agent.alive=false;agent.route=[];if(agent.kind==='gang')player.kills++;
   if(agent.raid&&mission.status==='active')mission.remaining--;
   return true;
  }
  function attack(attacker,target,range,damage,dt){
   attacker.cooldown=Math.max(0,attacker.cooldown-dt);
   if(attacker.cooldown>0||dist(attacker,target)>range||!nav.clear(attacker,target,player))return false;
   attacker.cooldown=attacker.kind==='defender'?1.2:1.45;
   if(target===player){player.hp=Math.max(0,player.hp-damage);player.heat=clamp(player.heat+2,0,100);}
   else hurt(target,damage);
   return true;
  }
  function tick(step){
   const dt=clamp(Number.isFinite(step)?step:0,0,.1);time+=dt;
   player.fireCooldown=Math.max(0,player.fireCooldown-dt);
   if(respawnTimer>0){respawnTimer-=dt;if(respawnTimer<=0){player.hp=100;player.x=W.spawn.x;player.y=W.spawn.y;player.heat=0;emit('Respawned at the protected fortress approach.');}return;}
   const dx=input.x*205*dt,dy=input.y*205*dt;
   if(!W.blocked(player.x+dx,player.y,player))player.x+=dx;
   if(!W.blocked(player.x,player.y+dy,player))player.y+=dy;
   player.heat=Math.max(0,player.heat-dt*1.2);
   for(const bot of agents){
    if(!bot.alive)continue;
    bot.cooldown=Math.max(0,bot.cooldown-dt);
    if(bot.kind==='defender'){
     const nearby=agents.filter(a=>a.alive&&a.kind==='gang'&&dist(a,bot)<520).sort((a,b)=>dist(a,bot)-dist(b,bot))[0];
     if(nearby){if(dist(bot,nearby)>260)move(bot,nearby,125,dt);attack(bot,nearby,320,13,dt);}
     else if(dist(bot,bot.home)>90)move(bot,bot.home,105,dt);
    }else if(bot.kind==='police'){
     if(player.heat>=40){if(dist(bot,player)>160)move(bot,player,120,dt);attack(bot,player,285,9,dt);}
     else if(dist(bot,bot.home)>80)move(bot,bot.home,95,dt);
    }else{
     // Hostiles guard their area; a deliberate defense wave advances on the fortress.
     const target=bot.raid?(dist(bot,defender)<dist(bot,player)&&defender.alive?defender:player):
      dist(bot,player)<500?player:null;
     if(target){
      if(dist(bot,target)>145)move(bot,target,bot.raid?138:112,dt);
      attack(bot,target,180,bot.raid?11:7,dt);
     }else if(dist(bot,bot.home)>90)move(bot,bot.home,100,dt);
    }
   }
   if(mission.status==='active'&&mission.remaining===0){
    mission.status='complete';mission.earned++;player.xp+=90;player.credits+=70;
    emit('Fortress defense complete: +90 preview XP / +70 preview credits.');
   }
   if(player.hp===0){
    respawnTimer=1.5;mission.status='failed';
    for(const bot of agents)if(bot.raid)bot.alive=false;
    mission.remaining=0;emit('Defeated. Fortress defense failed; returning to the safe spawn.');
   }
  }
  function setInput(x,y){if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Invalid movement vector');
   const magnitude=Math.max(1,Math.hypot(x,y));input={x:x/magnitude,y:y/magnitude};
   if(Math.abs(input.x)+Math.abs(input.y)>.01)player.aim={...input};
  }
  function fire(aim=player.aim){
   if(player.hp<=0||respawnTimer>0)return {status:'unavailable'};
   if(player.fireCooldown>0)return {status:'cooldown'};
   if(!aim||!Number.isFinite(aim.x)||!Number.isFinite(aim.y)||Math.hypot(aim.x,aim.y)<.05)return {status:'invalid'};
   if(player.ammo<=0)return {status:'empty'};
   const len=Math.hypot(aim.x,aim.y),direction={x:aim.x/len,y:aim.y/len};
   player.aim=direction;player.ammo--;player.fireCooldown=C.WEAPON.shotInterval;
   const candidates=agents.filter(a=>a.alive&&a.kind!=='defender'&&dist(player,a)<550)
    .map(a=>{const d=dist(player,a),dot=((a.x-player.x)*direction.x+(a.y-player.y)*direction.y)/d;
     return {a,d,dot};}).filter(v=>v.dot>.91&&nav.clear(player,v.a,player))
    .sort((a,b)=>a.d-b.d);
   const victim=candidates[0]?.a;
   if(victim){hurt(victim,35);if(victim.kind==='police')player.heat=clamp(player.heat+45,0,100);
    return {status:'hit',target:victim.id,defeated:!victim.alive};}
   return {status:'miss'};
  }
  function reload(){player.ammo=24;return emit('Preview magazine reloaded (unlimited test ammo).');}
  function startDefense(){
   if(mission.status==='active')return {status:'blocked',message:'Defense already underway.'};
   if(dist(player,W.spawn)>850)return {status:'blocked',message:'Return to the fortress approach to start a defense.'};
   for(const a of agents)if(a.raid)a.alive=false;
   mission.status='active';mission.wave++;mission.remaining=0;
   for(let i=0;i<3;i++){
    const x=W.spawn.x+(i-1)*62,y=W.spawn.y-560-i*85;
    if(W.blocked(x,y,player))continue;
    add('gang',{x,y},{raid:true,clan:'rugs'});mission.remaining++;
   }
   if(!mission.remaining){mission.status='failed';return {status:'blocked',message:'No safe spawn for raiders.'};}
   return {status:'active',message:emit('Fortress defense wave '+mission.wave+'! Defeat '+mission.remaining+' raiders.')};
  }
  function checkpoint(){
   const target=registry.resolve('checkpoint:'+player.route);
   if(!target||player.completed)return {status:'complete',message:'Journey already complete.'};
   if(dist(player,target)>110)return {status:'far',message:'Walk closer to '+target.name+'.'};
   player.xp+=50;player.credits+=40;player.route++;
   if(player.route===registry.checkpoints.length){player.completed=true;player.xp+=100;player.credits+=60;}
   return {status:'claimed',message:emit('Checkpoint reached! Preview credits / XP awarded (not saved).')};
  }
  function loadStage(saved){
   if(!saved||saved.worldVersion!==2||saved.saveVersion!==6||saved.version!==6)return {status:'invalid'};
   player.plot=C.restorePlot(saved.plot);
   player.outposts=(saved.clans?.outposts||[]).filter(o=>o&&C.outpostLot(o.clan)&&C.BUILD_KIT.some(k=>k.id===o.kind)).slice(0,54).map(o=>({...o}));
   for(const key of ['xp','credits','kills','route'])if(Number.isSafeInteger(saved[key])&&saved[key]>=0)player[key]=saved[key];
   player.route=clamp(player.route,0,registry.checkpoints.length);
   player.completed=player.route===registry.checkpoints.length;
   player.inventory=Array.isArray(saved.inventory)?JSON.parse(JSON.stringify(saved.inventory)):[];player.equipped=saved.equipped&&typeof saved.equipped==='object'?{...saved.equipped}:{};
   player.crew=C.restoreCrew(saved.crew);
   const blocked=W.blocked(saved.x,saved.y,player);
   player.x=blocked?W.spawn.x:saved.x;player.y=blocked?W.spawn.y:saved.y;player.hp=100;player.heat=0;
   mission.status='idle';mission.remaining=0;
   return {status:'loaded',relocated:blocked};
  }
  function build(col,row,kind='wall'){
   if(!Number.isInteger(col)||!Number.isInteger(row)||col<0||row<0||col>=C.PLOT.cols||row>=C.PLOT.rows)return {status:'invalid'};
   if(!C.BUILD_KIT.some(k=>k.id===kind))return {status:'invalid'};
   if(dist(player,{x:W.fortress.x+W.fortress.w/2,y:W.fortress.y+W.fortress.h/2})>850)return {status:'far'};
   if(player.plot.some(o=>o.col===col&&o.row===row))return {status:'occupied'};
   const candidate={col,row,kind,rotation:0},pieces=[...player.plot,candidate];
   if(C.buildAccess(pieces,C.PLOT.cols,C.PLOT.rows))return {status:'blocked'};
   const old=player.plot;player.plot=pieces;
   if(W.blocked(player.x,player.y,player)){player.plot=old;return {status:'blocked'};}
   return {status:'built'};
  }
  function demolish(col,row){const i=player.plot.findIndex(o=>o.col===col&&o.row===row);if(i<0)return {status:'empty'};
   player.plot.splice(i,1);return {status:'removed'};
  }
  function reset(){player.x=W.spawn.x;player.y=W.spawn.y;player.hp=100;player.heat=0;player.xp=0;player.credits=180;player.route=0;
   player.completed=false;player.kills=0;player.ammo=24;player.plot=[];player.outposts=[];player.crew=[];
   player.inventory=[];player.equipped={};mission.status='idle';mission.remaining=0;mission.wave=0;mission.earned=0;input={x:0,y:0};
   for(const a of agents)a.alive=false;agents.length=0;add('defender',{x:W.spawn.x-110,y:W.spawn.y+100});
   for(let i=0;i<positions.length;i++)add(i===1?'police':'gang',positions[i],{clan:positions[i].clan});
   emit('Preview simulation reset. No production saves were written.');
  }
  return Object.freeze({player,agents,mission,events,setInput,tick,fire,reload,startDefense,checkpoint,loadStage,build,demolish,reset});
 }
 root.CityWorld2Simulation=Object.freeze({create});
})(typeof window==='undefined'?globalThis:window);
