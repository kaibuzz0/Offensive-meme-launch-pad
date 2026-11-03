/* Open Doors: walkable interiors with independent room coordinates and a discovery passport. */
'use strict';
(function(root){
 const C=root.MemeCityCore,P=C.Engine.prototype,base={join:P.join,tick:P.tick,action:P.action,snapshot:P.snapshot};
 const themes={launch:['Launch House','lobby','journey','#b9a3e5'],arcade:['Chaos Arcade','arcade','arcadeCabinet','#70d8d0'],club:['The Unfiltered','club','social','#d59ae8'],shop:['Bad Taste Supply','shop','shop','#c9db9a'],market:['Night Market','market','market','#e3ba85'],garage:['Meme Motors','garage','mobility','#99cfdf']};
 const extras={creator:[['Meme Gallery','gallery','collections','#c6b0e6'],['Print Studio','studio','avatar','#9dd5c3']],arena:[['The Proving Ground','arena','survival','#e7ba96']],social:[['The Common Room','lounge','social','#a6cadf'],['Boardwalk Cafe','cafe','social','#e3cc9c']]};
 const BUILDINGS=C.WORLD.buildings.map(b=>({...b,roomId:b.id,name:themes[b.id]?.[0]||b.label,theme:b.theme||themes[b.id]?.[1]||(b.id.endsWith('-2')?'arcade':b.id.endsWith('-1')?'shop':'gallery'),activity:b.activity||themes[b.id]?.[2]||(b.id.endsWith('-1')?'shop':'clans'),accent:themes[b.id]?.[3]||b.hue}));
 for(const d of C.DISTRICTS)C.districtBlocks(d.id).forEach((b,i)=>{const [name,theme,activity,accent]=extras[d.id][i];BUILDINGS.push({...b,x:b.x+d.ox,y:b.y+d.oy,roomId:`${d.id}-${i}`,name,theme,activity,accent});});
 const ROOM={width:1200,height:900,left:105,right:1095,top:190,bottom:755,spawn:{x:600,y:685},exit:{x:600,y:750},activity:{x:600,y:315},souvenir:{x:990,y:630}};
 const IDS=[...BUILDINGS.map(b=>b.roomId),'home'];
 const furniture=theme=>{
  const common=[{x:165,y:245,w:175,h:90,kind:'counter'},{x:865,y:245,w:175,h:90,kind:'counter'}];
  if(['lounge','cafe','club'].includes(theme))return [...common,{x:235,y:450,w:160,h:65,kind:'sofa'},{x:815,y:450,w:160,h:65,kind:theme==='club'?'decks':'sofa'},{x:360,y:590,w:115,h:70,kind:'table'},{x:725,y:590,w:115,h:70,kind:'table'}];
  if(theme==='garage')return [...common,{x:250,y:420,w:175,h:160,kind:'workbench'},{x:800,y:420,w:175,h:160,kind:'lift'}];
  if(['gallery','studio','lobby','home'].includes(theme))return [...common,{x:250,y:450,w:125,h:105,kind:'display'},{x:825,y:450,w:125,h:105,kind:theme==='studio'?'printer':'display'}];
  if(theme==='arcade')return [...common,...[245,845].flatMap(x=>[430,575].map(y=>({x,y,w:105,h:75,kind:'cabinet'})))];
  if(theme==='arena')return [...common,{x:220,y:430,w:130,h:160,kind:'rack'},{x:850,y:430,w:130,h:160,kind:'rack'}];
  return [...common,{x:235,y:445,w:160,h:100,kind:'rack'},{x:805,y:445,w:160,h:100,kind:theme==='market'?'stall':'rack'}];
 };
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function buildings(p){const result=[...BUILDINGS],home=p?.plot?.find(o=>o.kind==='home');if(home)result.push({roomId:'home',name:'Your Meme HQ',theme:'home',activity:'fortress',accent:'#c9e4a7',x:C.PLOT.x+home.col*64,y:C.PLOT.y+home.row*64-62,w:64,h:120});return result;}
 function door(b){return {x:b.x+b.w/2,y:b.y+b.h+37,name:b.name,id:b.roomId};}
 function nearest(p){return buildings(p).find(b=>distance(p,door(b))<92)||null;}
 function roomBlocked(x,y,theme){return !Number.isFinite(x)||!Number.isFinite(y)||x<ROOM.left||x>ROOM.right||y<ROOM.top||y>ROOM.bottom||furniture(theme).some(o=>x>o.x-13&&x<o.x+o.w+13&&y>o.y-10&&y<o.y+o.h+10);}
 function restore(p,s){
  p.places={visited:IDS.filter(id=>Array.isArray(s?.visited)&&s.visited.includes(id)),
   souvenirs:IDS.filter(id=>Array.isArray(s?.souvenirs)&&s.souvenirs.includes(id)),
   // Optional additive fields inside the existing places payload: old saved
   // characters load with no changes to their key or save version.
   arcadeBest:Number.isSafeInteger(s?.arcadeBest)&&s.arcadeBest>=0&&s.arcadeBest<=2000?s.arcadeBest:0,
   arcadeClaimed:s?.arcadeClaimed===true};
  p.cabinetRun=null;p.cabinetResult=null;p.room=null;return p.places;
 }
 function save(p){return {visited:[...p.places.visited],souvenirs:[...p.places.souvenirs],arcadeBest:p.places.arcadeBest||0,arcadeClaimed:p.places.arcadeClaimed===true};}
 function activity(p){if(!p.room)return null;if(distance(p.room,ROOM.exit)<85)return {kind:'exit',label:'Exit to the street'};if(distance(p.room,ROOM.activity)<100)return {kind:'activity',label:p.room.activity==='arcadeCabinet'?'Play Rug Runner':p.room.activity==='shop'?'Browse equipment':p.room.activity==='survival'?'Arena terminal':'Use activity terminal',panel:p.room.activity};return null;}
 // RUG RUNNER: a twelve-gate skill cabinet physically located inside
 // Chaos Arcade, with server-owned collisions and exactly-once reward.
 // This is a *turn-based* arcade game: advancing a gate requires a decision,
 // and pausing/focus loss never advances hazards or drains the player's HP.
 const CABINET_TURNS=12,CABINET_PRIZE=35,CABINET_XP=30,CABINET_MIN_SCORE=108;
 const CABINET_ACTIONS=new Set(['arcadeStart','arcadeShift','arcadeStep','arcadePause','arcadeResume','arcadeQuit']);
 function cabinetGate(run){
  const danger=(run.seed+run.turn*7+Math.floor(run.turn/3))%3;
  const bonus=(danger+1+(run.seed+run.turn)%2)%3;
  return {danger,bonus};
 }
 function cabinetState(p){
  const run=p.cabinetRun;
  if(!run)return null;
  const {seed,...view}=run;
  return {...view,gate:run.phase==='playing'?cabinetGate(run):null};
 }
 function cabinetAction(e,p,a){
  if(!p.room||p.room.id!=='arcade')
   throw Error('Enter the actual Chaos Arcade building before using its cabinet.');
  if(distance(p.room,ROOM.activity)>110)
   throw Error('Walk to the Chaos Arcade activity terminal to play Rug Runner.');
  const run=p.cabinetRun;
  if(a.type==='arcadeStart'){
   if(run?.phase==='playing')throw Error('Finish or quit the active Rug Runner challenge.');
   p.cabinetRun={phase:'playing',turn:0,lane:1,hp:3,score:0,combo:0,
    paused:false,shifted:false,seed:(++e.serial*101+137)%10007};
   p.cabinetResult=null;
   return 'Rug Runner started. Dodge the red lane, collect the green credit chip and advance each gate.';
  }
  if(a.type==='arcadeQuit'){
   if(!run||run.phase!=='playing')throw Error('No active arcade game to quit.');
   p.cabinetResult={status:'abandoned',score:run.score,turn:run.turn,reward:0,xp:0};
   p.cabinetRun=null;
   return 'You exited Rug Runner. Your city character and credits are safe.';
  }
  if(!run||run.phase!=='playing')throw Error('Start a Rug Runner game first.');
  if(a.type==='arcadePause'){if(run.paused)throw Error('Rug Runner is already paused.');run.paused=true;return 'Rug Runner paused. No gates advance.';}
  if(a.type==='arcadeResume'){if(!run.paused)throw Error('Rug Runner is not paused.');run.paused=false;return 'Rug Runner resumed.';}
  if(run.paused)throw Error('Resume Rug Runner before taking another turn.');
  if(a.type==='arcadeShift'){
   if(!Number.isInteger(a.delta)||Math.abs(a.delta)!==1)
    throw Error('Move exactly one lane left or right.');
   if(run.shifted)throw Error('Only one lane move is allowed per gate.');
   const lane=run.lane+a.delta;
   if(lane<0||lane>2)throw Error('You reached the edge of the arcade track.');
   run.lane=lane;run.shifted=true;
   return 'Moved '+(a.delta<0?'left.':'right.')+' Advance the gate when ready.';
  }
  if(a.type==='arcadeStep'){
   const gate=cabinetGate(run);
   if(run.lane===gate.danger){run.hp--;run.combo=0;}
   else if(run.lane===gate.bonus){run.combo++;run.score+=20+Math.min(10,run.combo*2);}
   else{run.combo=0;run.score+=7;}
   run.turn++;run.shifted=false;
   if(run.hp>0&&run.turn<CABINET_TURNS)return run.lane===gate.danger?
    'Hazard hit! You lost one heart. Choose the next lane.':
    'Gate cleared. Read the next lane warning before advancing.';
   const won=run.hp>0&&run.turn===CABINET_TURNS&&run.score>=CABINET_MIN_SCORE;
   const previousBest=p.places.arcadeBest||0;
   p.places.arcadeBest=Math.max(previousBest,run.score);
   const firstPrize=won&&!p.places.arcadeClaimed;
   if(firstPrize){p.places.arcadeClaimed=true;p.credits+=CABINET_PRIZE;p.xp+=CABINET_XP;}
   p.cabinetResult={status:won?'won':'lost',score:run.score,turn:run.turn,
    best:p.places.arcadeBest,reward:firstPrize?CABINET_PRIZE:0,xp:firstPrize?CABINET_XP:0};
   p.cabinetRun=null;
   return won?(firstPrize?
    'RUG RUNNER CLEARED! First-clear reward: +35 play credits / +30 XP.':
    'Rug Runner cleared! New runs improve your best score, but the first-clear prize is already claimed.'):
    'Rug Runner ended. Try again to improve your score.';
  }
  throw Error('Unknown arcade cabinet control.');
 }
 P.join=function(...args){const p=base.join.apply(this,args);restore(p);return p;};
 P.action=function(id,a){
  const p=this.player(id);
  if(CABINET_ACTIONS.has(a?.type))return cabinetAction(this,p,a);
  if(a?.type==='enterBuilding'){
   if(p.room)throw Error('You are already inside.');const b=buildings(p).find(b=>b.roomId===a.building);if(!b)throw Error('Unknown building.');const entry=door(b);
   if(distance(p,entry)>100)throw Error('Walk to the building’s front door.');
   if(p.contract||p.defense||p.rising?.arena||p.quarantineRun)throw Error('Finish or abandon your challenge before going inside.');if(p.heat>=22)throw Error('Lose your wanted pursuit before going inside.');
   p.room={id:b.roomId,name:b.name,theme:b.theme,activity:b.activity,accent:b.accent,...ROOM.spawn};p.fireHeld=false;p.dashTime=0;p.input={x:0,y:0};if(p.rising){p.rising.riding=false;p.rising.speed=0;}
   if(!p.places.visited.includes(b.roomId)){p.places.visited.push(b.roomId);p.xp+=15;p.credits+=10;}p.area='interior';return `Welcome to ${b.name}. Walk inside; E at the front door returns to the street.`;
  }
  if(a?.type==='exitBuilding'){
   if(!p.room)throw Error('You are outside.');if(distance(p.room,ROOM.exit)>95)throw Error('Walk to the glowing exit at the bottom of the room.');
   p.cabinetRun=null;p.room=null;p.area=C.areaAt(p.x,p.y);p.input={x:0,y:0};p.invulnerable=Math.max(p.invulnerable,1);return 'Back on the street.';
  }
  if(p.room){
   if(['ride','fire','dash','contract','startSurvival','startQuarantine','defenseDrill','checkpoint','build','demolish','starterfort','hire'].includes(a?.type))throw Error('Step outside for that activity.');
   if(['restock','list','purchase'].includes(a?.type)){
    const building=BUILDINGS.find(b=>b.roomId===p.room.id),service=a.type==='restock'?'supplies':'market';
    if(!building||building.activity!==service||distance(p.room,ROOM.activity)>110)throw Error('Use the matching service terminal inside its building.');
    const old={x:p.x,y:p.y,area:p.area,room:p.room};const target=service==='supplies'?root.CityRising.GUIDES.find(g=>g.id==='doc'):C.WORLD.stations.find(s=>s.id==='market');
    Object.assign(p,{x:target.x,y:target.y,area:C.areaAt(target.x,target.y),room:null});try{return base.action.call(this,id,a);}finally{Object.assign(p,old);}
   }
   if(a?.type==='buy'){
    if(BUILDINGS.find(b=>b.roomId===p.room.id)?.activity!=='shop'||distance(p.room,ROOM.activity)>110)throw Error('Visit the equipment counter in Bad Taste Supply.');
    const old={x:p.x,y:p.y,area:p.area};const shop=C.WORLD.stations.find(s=>s.id==='shop');p.x=shop.x;p.y=shop.y;p.area=C.areaAt(shop.x,shop.y);
    try{return base.action.call(this,id,a);}finally{Object.assign(p,old);}
   }
  }
  return base.action.call(this,id,a);
 };
 P.tick=function(dt){
  dt=Math.max(0,Math.min(.1,dt));const inputs=new Map();
  for(const p of this.players.values())if(p.room){inputs.set(p.id,p.input);p.input={x:0,y:0};p.fireHeld=false;}
  base.tick.call(this,dt);
  for(const p of this.players.values())if(p.room){
   const input=inputs.get(p.id)||{x:0,y:0},r=p.room,dx=input.x*195*dt,dy=input.y*195*dt,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/6));p.input=input;
   for(let i=0;i<steps;i++){if(!roomBlocked(r.x+dx/steps,r.y,r.theme))r.x+=dx/steps;if(!roomBlocked(r.x,r.y+dy/steps,r.theme))r.y+=dy/steps;}
   p.area='interior';
   if(!p.places.souvenirs.includes(r.id)&&distance(r,ROOM.souvenir)<45){p.places.souvenirs.push(r.id);p.xp+=25;p.notice=`ROOM MEMENTO / ${r.name} · +25 XP. Your discovery passport is saved.`;p.noticeSeq++;}
  }
 };
 P.snapshot=function(id){const s=base.snapshot.call(this,id),p=this.player(id);s.self.room=p.room?{...p.room}:null;s.self.places=save(p);s.self.cabinet=cabinetState(p);s.self.cabinetResult=p.cabinetResult?{...p.cabinetResult}:null;for(const x of s.players){const room=this.player(x.id).room;x.room=room?{...room}:null;x.facing={...(this.player(x.id).facing||{x:0,y:1})};x.firing=this.player(x.id).fireCooldown>.20;x.recoil=Math.max(0,Math.min(1,((this.player(x.id).fireCooldown||0)-.13)/.12));x.moving=Math.hypot(this.player(x.id).input.x,this.player(x.id).input.y)>.1;}return s;};
 root.CityInteriors=Object.freeze({BUILDINGS,ROOM,IDS,CABINET_TURNS,CABINET_MIN_SCORE,furniture,buildings,door,nearest,roomBlocked,activity,restore,save});
})(typeof window==='undefined'?globalThis:window);
