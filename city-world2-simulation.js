/* World-v2 review-only simulation: real collision, combat, patrols, defense and route rewards.
 * This is NOT the authoritative multiplayer engine and NEVER accesses storage or wallets.
 */
'use strict';
(function(root){
 function create(C,W,registry,Nav){
  if(!C?.BUILD_KIT||!W?.blocked||!registry?.resolve||!Nav?.createRouter)throw Error('World2 simulation dependencies missing');
  const nav=Nav.createRouter({WORLD:W.world,blocked:W.blocked},{cell:80,budget:11000});
  const territory=root.CityWorld2Territory?.create(C,W,registry)||null;
  const services=root.CityWorld2Services?.create(C,root.CityInteriors)||null;
  const courier=root.CityWorld2Contracts?.create(registry)||null;
  const plot=W.fortress,player={id:'preview-player',x:W.spawn.x,y:W.spawn.y,aim:{x:0,y:-1},
   hp:100,maxHp:100,heat:0,xp:0,credits:180,route:0,completed:false,kills:0,jobs:0,
   plot:[],outposts:[],crew:[],crewKills:0,clan:null,reputation:{},rising:{},places:{},inventory:[],equipped:{},style:{skin:0,hair:0,pants:0,print:0},ammo:24,fireCooldown:0};
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
    raid:!!options.raid,territory:!!options.territory,alive:true};
   agents.push(bot);return bot;
  }
  let defender=add('defender',{x:W.spawn.x-110,y:W.spawn.y+100});
  positions.map((p,i)=>add(i===1?'police':'gang',p,{clan:p.clan}));
  function spawnTerritoryGuards(){
   for(const zone of territory?.zones||[]){
    let point={x:zone.x+80,y:zone.y};
    if(W.blocked(point.x,point.y,player))point={x:zone.x,y:zone.y};
    add('gang',point,{clan:zone.homeClan,territory:true});
   }
  }
  spawnTerritoryGuards();
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
   if(attacker.cooldown>0||dist(attacker,target)>range||!nav.clear(attacker,target,player))return false;
   attacker.cooldown=attacker.kind==='defender'?1.2:1.45;
   if(target===player){player.hp=Math.max(0,player.hp-damage);player.heat=clamp(player.heat+2,0,100);}
   else hurt(target,damage);
   return true;
  }
  function hasEquipped(itemId){
   const item=C.ITEMS.find(i=>i.id===itemId);
   if(!item)return false;const uid=player.equipped?.[item.slot];
   return !!uid&&player.inventory.some(x=>x.uid===uid&&x.item===item.id);
  }
  function tick(step){
   const dt=clamp(Number.isFinite(step)?step:0,0,.1);time+=dt;
   player.fireCooldown=Math.max(0,player.fireCooldown-dt);
   if(respawnTimer>0){respawnTimer-=dt;if(respawnTimer<=0){player.hp=100;player.x=W.spawn.x;player.y=W.spawn.y;player.heat=0;emit('Respawned at the protected fortress approach.');}return;}
   const speed=205+(hasEquipped('boots')?25:0),dx=input.x*speed*dt,dy=input.y*speed*dt;
   if(!W.blocked(player.x+dx,player.y,player))player.x+=dx;
   if(!W.blocked(player.x,player.y+dy,player))player.y+=dy;
   player.heat=Math.max(0,player.heat-dt*1.2);
   const contractEvent=courier?.tick(dt);
   if(contractEvent?.status==='expired')emit(contractEvent.message);
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
   const capture=territory?.tick(dt,player,agents);
   if(capture?.status==='captured'||capture?.status==='interrupted')emit(capture.message);
   if(mission.status==='active'&&mission.remaining===0){
    mission.status='complete';mission.earned++;player.xp+=90;player.credits+=70;
    emit('Fortress defense complete: +90 preview XP / +70 preview credits.');
   }
   if(player.hp===0){
    territory?.cancel();courier?.abandon();respawnTimer=1.5;mission.status='failed';
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
   if(victim){hurt(victim,hasEquipped('blaster')?36:35);if(victim.kind==='police')player.heat=clamp(player.heat+45,0,100);
    return {status:'hit',target:victim.id,defeated:!victim.alive};}
   return {status:'miss'};
  }
  function reload(){player.ammo=24;return emit('Preview magazine reloaded (unlimited test ammo).');}
  function startDefense(){
   if(mission.status==='active')return {status:'blocked',message:'Defense already underway.'};
   if(courier?.state.status==='active')return {status:'blocked',message:'Finish or abandon the courier delivery first.'};
   if(dist(player,W.spawn)>850)return {status:'blocked',message:'Return to the fortress approach to start a defense.'};
   for(let i=agents.length-1;i>=0;i--)if(agents[i].raid)agents.splice(i,1);
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
   const used=new Set(),lots=Array.isArray(saved.clans?.outposts)?saved.clans.outposts:[];
   player.outposts=lots.slice(0,54).filter(o=>{
    if(!o||!C.outpostLot(o.clan)||!Number.isInteger(o.col)||o.col<0||o.col>=3||
       !Number.isInteger(o.row)||o.row<0||o.row>=3||!C.BUILD_KIT.some(k=>k.id===o.kind))return false;
    const key=o.clan+':'+o.col+':'+o.row;if(used.has(key))return false;used.add(key);return true;
   }).map(o=>({clan:o.clan,col:o.col,row:o.row,kind:o.kind,rotation:0}));
   for(const key of ['xp','credits','kills','jobs','route'])if(Number.isSafeInteger(saved[key])&&saved[key]>=0)player[key]=saved[key];
   player.route=clamp(player.route,0,registry.checkpoints.length);
   player.completed=player.route===registry.checkpoints.length;
   const unique=new Set();
   player.inventory=(Array.isArray(saved.inventory)?saved.inventory:[]).filter(i=>i&&typeof i.uid==='string'&&
    /^gear-\d+$/.test(i.uid)&&C.ITEMS.some(item=>item.id===i.item)&&!unique.has(i.uid)&&unique.add(i.uid)).slice(0,100)
    .map(i=>({uid:i.uid,item:i.item}));
   player.equipped={};for(const item of player.inventory){const known=C.ITEMS.find(x=>x.id===item.item);
    if(saved.equipped?.[known.slot]===item.uid)player.equipped[known.slot]=item.uid;}
   player.clan=C.NEIGHBORHOODS.some(n=>n.id===saved.clans?.clan)?saved.clans.clan:null;
   player.reputation=saved.clans?.reputation&&typeof saved.clans.reputation==='object'?JSON.parse(JSON.stringify(saved.clans.reputation)):{};
   player.rising=saved.rising&&typeof saved.rising==='object'?JSON.parse(JSON.stringify(saved.rising)):{};
   player.places=saved.places&&typeof saved.places==='object'?JSON.parse(JSON.stringify(saved.places)):{};
   if(saved.style&&['skin','hair','pants'].every(k=>Number.isInteger(saved.style[k])))player.style={...player.style,...saved.style};
   player.crewKills=Number.isSafeInteger(saved.crewKills)?Math.max(0,saved.crewKills):0;
   player.crew=C.restoreCrew(saved.crew);
   const blocked=W.blocked(saved.x,saved.y,player);
   player.x=blocked?W.spawn.x:saved.x;player.y=blocked?W.spawn.y:saved.y;player.hp=100;player.heat=0;
   mission.status='idle';mission.remaining=0;territory?.reset();courier?.reset();
   for(let i=agents.length-1;i>=0;i--)if(agents[i].raid)agents.splice(i,1);
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
   player.completed=false;player.kills=0;player.jobs=0;player.ammo=24;player.fireCooldown=0;player.plot=[];player.outposts=[];player.crew=[];
   player.inventory=[];player.equipped={};player.clan=null;player.reputation={};player.rising={};player.places={};player.crewKills=0;territory?.reset();courier?.reset();mission.status='idle';mission.remaining=0;mission.wave=0;mission.earned=0;input={x:0,y:0};
   for(const a of agents)a.alive=false;agents.length=0;defender=add('defender',{x:W.spawn.x-110,y:W.spawn.y+100});
   for(let i=0;i<positions.length;i++)add(i===1?'police':'gang',positions[i],{clan:positions[i].clan});
   spawnTerritoryGuards();
   emit('Preview simulation reset. No production saves were written.');
  }
  const joinFaction=clan=>territory?territory.join(player,clan):{status:'disabled',message:'Territory preview not loaded.'};
  const captureControl=id=>territory?territory.start(player,id,agents):{status:'disabled',message:'Territory preview not loaded.'};
  function startCourier(){
   if(!courier)return {status:'disabled',message:'Courier module not loaded.'};
   if(mission.status==='active')return {status:'blocked',message:'Finish your fortress defense first.'};
   return courier.start(player);
  }
  function deliverCourier(){return courier?courier.deliver(player):{status:'disabled',message:'Courier module not loaded.'};}
  return Object.freeze({player,agents,mission,events,territory,courier,services,joinFaction,captureControl,startCourier,deliverCourier,
   setInput,tick,fire,reload,startDefense,checkpoint,loadStage,build,demolish,reset});
 }
 root.CityWorld2Simulation=Object.freeze({create});
})(typeof window==='undefined'?globalThis:window);
