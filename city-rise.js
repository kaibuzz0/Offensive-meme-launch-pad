/* City Rising: persistent solo journeys, exploration, arena survival and city mobility. */
'use strict';
(function(root){
 const C=root.MemeCityCore,P=C.Engine.prototype,base={join:P.join,tick:P.tick,action:P.action,snapshot:P.snapshot};
 // Translate V1 story contacts with their home districts; their saved chapter
 // and discovery IDs remain unchanged as the world layout moves around them.
 const legacyBases={hub:{x:2240,y:0},fortress:{x:0,y:0},
  creator:{x:4480,y:0},arena:{x:0,y:1660},social:{x:4480,y:1660}};
 const shift=(point,area=point.area)=>{
  const from=legacyBases[area],to=area==='hub'?C.HUB:C.DISTRICTS.find(d=>d.id===area);
  return from&&to?{...point,x:point.x+(to.ox??to.x)-from.x,
    y:point.y+(to.oy??to.y)-from.y}:point;
 };
 const LANDMARKS=[
  {id:'plaza',name:'Founder Fountain',area:'hub',x:3360,y:900},
  {id:'launch',name:'First Launch',area:'hub',x:2570,y:590},
  {id:'nightlife',name:'After Hours',area:'hub',x:4040,y:900},
  {id:'fort',name:'Home Turf',area:'fortress',x:1120,y:1160},
  {id:'west',name:'Westside Roots',area:'fortress',x:450,y:870},
  {id:'east',name:'Watch the Horizon',area:'fortress',x:1800,y:870},
  {id:'gallery',name:'Meme Masterpiece',area:'creator',x:4880,y:1000},
  {id:'studio',name:'Fresh Print',area:'creator',x:6160,y:1080},
  {id:'ring',name:'Fight Night',area:'arena',x:650,y:2600},
  {id:'champion',name:'Champion Corner',area:'arena',x:1600,y:2600},
  {id:'boardwalk',name:'The Gathering',area:'social',x:5600,y:2780},
  {id:'cafe',name:'Last Light Cafe',area:'social',x:6140,y:2800}
 ].map(p=>shift(p));
 const GUIDES=[
  {id:'nova',name:'NOVA / CITY GUIDE',x:3390,y:850,panel:'journey',color:'#c1e69c',line:'Every city starts with someone showing up. Make this one yours.'},
  {id:'wrench',name:'WRENCH / MEME MOTORS',x:4020,y:1040,panel:'mobility',color:'#f1be84',line:'The board is a city loaner. Keep moving. Keep your feet on it.'},
  {id:'doc',name:'PATCH / STREET MEDIC',x:2670,y:1040,panel:'supplies',color:'#9be3d1',line:'Stay alive long enough to build something worth defending.'},
  {id:'marshal',name:'MARSHAL / THE ARENA',x:1120,y:2590,panel:'survival',color:'#ffb19a',line:'Three waves. One crew. Leave your ego at the gate.'},
  {id:'keeper',name:'KEEPER / FORTRESS HQ',x:1645,y:1140,panel:'fortress',color:'#c2d99c',line:'Walls make a plot. You and your squad make it home.'}
 ].map(p=>{
  if(p.id==='wrench'||p.id==='doc'){
   const id=p.id==='doc'?'shop':'garage',station=C.WORLD.stations.find(s=>s.id===id);
   return {...p,x:station.x+65,y:station.y-25};
  }
  return shift(p,p.id==='marshal'?'arena':p.id==='keeper'?'fortress':'hub');
 });
 const UPGRADE_COSTS=[120,220,350];
 const fresh=()=>({found:[],claimed:0,fortLevel:0,medkits:2,arenaWins:0,bestWave:0,riding:false,speed:0,arena:null,arenaCooldown:0,arenaResult:null});
 const int=(v,max=999999)=>Number.isSafeInteger(v)?Math.max(0,Math.min(max,v)):0;
 const say=(p,text)=>{p.notice=text;p.noticeSeq=(p.noticeSeq||0)+1;};
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const CHAPTERS=[
  {name:'Make an entrance',description:'Discover 3 city landmarks. Their floating diamonds mark the way.',reward:60,xp:60,ready:p=>p.rising.found.length>=3,target:p=>LANDMARKS.find(n=>!p.rising.found.includes(n.id))},
  {name:'Earn your street cred',description:'Complete any contract in Founder Square or Arena District.',reward:75,xp:80,ready:p=>p.jobs>=1,target:()=>({x:C.HUB.x+1120,y:C.HUB.y+900,name:'Founder Square mission board'})},
  {name:'A place to call home',description:'Build at least 4 pieces in your Fortress Heights plot.',reward:90,xp:90,ready:p=>p.plot.length>=4,target:()=>({...C.DISTRICTS[0]})},
  {name:'Nobody builds alone',description:'Hire at least one defender at Fortress Heights.',reward:80,xp:90,ready:p=>p.crew.length>=1,target:()=>({...C.DISTRICTS[0]})},
  {name:'Culture across the city',description:'Discover at least one landmark in Creator Quarter and one on Social Boardwalk.',reward:120,xp:120,ready:p=>['creator','social'].every(area=>LANDMARKS.some(n=>n.area===area&&p.rising.found.includes(n.id))),target:p=>LANDMARKS.find(n=>['creator','social'].includes(n.area)&&!LANDMARKS.some(l=>l.area===n.area&&p.rising.found.includes(l.id)))},
  {name:'The proving ground',description:'Survive all 3 arena waves and defeat the Rug Baron.',reward:150,xp:160,ready:p=>p.rising.arenaWins>0,target:()=>({...GUIDES.find(g=>g.id==='marshal'),name:'Arena survival terminal'})},
  {name:'Put down roots',description:'Build a Meme HQ and upgrade your fortress to level 2.',reward:180,xp:180,ready:p=>p.rising.fortLevel>=2,target:()=>({...GUIDES.find(g=>g.id==='keeper'),name:'Fortress command'})},
  {name:'This city is yours',description:'Find all 12 landmarks. Leave your mark in every district.',reward:250,xp:250,ready:p=>p.rising.found.length===LANDMARKS.length,target:p=>LANDMARKS.find(n=>!p.rising.found.includes(n.id))}
 ];
 const ONLINE_CHAPTERS=[CHAPTERS[0],CHAPTERS[1],
  {name:'Find your crew',description:'Join any clan through the Clans panel.',reward:50,xp:50,ready:p=>!!p.clan,target:()=>C.NEIGHBORHOODS[0]},
  {name:'Work the block',description:'Complete one clan job.',reward:70,xp:70,ready:p=>Object.values(p.reputation||{}).some(n=>n>0),target:p=>C.NEIGHBORHOODS.find(n=>n.id===p.clan)||C.NEIGHBORHOODS[0]},
  CHAPTERS[4],
  {name:'Dress for the city',description:'Own and equip an item from an equipment shop.',reward:60,xp:60,ready:p=>p.inventory.length>0&&Object.keys(p.equipped).length>0,target:()=>C.WORLD.stations.find(s=>s.id==='shop')},
  {name:'Open doors',description:'Explore three different building interiors.',reward:80,xp:80,ready:p=>(p.places?.visited.length||0)>=3,target:()=>C.WORLD.stations.find(s=>s.id==='arcade')},CHAPTERS[7]];
 const chapters=p=>p.mode==='online'?ONLINE_CHAPTERS:CHAPTERS;
 function restore(p,s){const r=fresh();if(s&&typeof s==='object'){
  r.found=LANDMARKS.filter(n=>Array.isArray(s.found)&&s.found.includes(n.id)).map(n=>n.id);
  r.claimed=int(s.claimed,CHAPTERS.length);r.fortLevel=int(s.fortLevel,3);r.medkits=int(s.medkits,9);r.arenaWins=int(s.arenaWins);r.bestWave=int(s.bestWave,3);
 }p.rising=r;return r;}
 function save(p){const {found,claimed,fortLevel,medkits,arenaWins,bestWave}=p.rising;return {found:[...found],claimed,fortLevel,medkits,arenaWins,bestWave};}
 function objective(p){const chapter=chapters(p)[p.rising.claimed];return chapter?{...chapter,number:p.rising.claimed+1,ready:chapter.ready(p),target:chapter.target(p)}:null;}
 function nearest(p){return GUIDES.find(n=>dist(p,n)<100);}
 function cleanArena(e,p,status){
  const a=p.rising.arena;if(!a)return;
  p.rising.arenaResult={status,wave:a.wave,elapsed:Math.round(240-a.remaining),reward:status==='won'?180:0};
  p.rising.bestWave=Math.max(p.rising.bestWave,status==='won'?3:Math.max(0,a.wave-1));
  if(status==='won'){p.rising.arenaWins++;p.credits+=180;p.xp+=160;p.rising.arenaCooldown=40;}
  e.arcade.bots=e.arcade.bots.filter(b=>!(b.arena&&b.owner===p.id));e.arcade.bullets=e.arcade.bullets.filter(q=>!(q.side==='bot'&&q.owner===p.id));p.rising.arena=null;
  say(p,status==='won'?'ARENA CLEARED! +180 play credits / +160 XP. The Rug Baron is down.':status==='busted'?'Arena run ended. Your squad and gear are safe.':status==='left'?'You left the Arena District. Run ended without a completion reward.':'Arena run ended. Regroup and try again.');
 }
 function wave(e,p){const a=p.rising.arena;a.wave++;a.next=0;a.spawned=true;
  const count=a.wave+2;
  for(let i=0;i<count;i++){
   const boss=a.wave===3&&i===count-1,ranged=boss||(a.wave>=2&&i===0),side=i%2?-1:1;
   let x=1120+side*(250+(i%3)*70),y=2590+(i%2?-160:160);
   if(C.blocked(x,y,p)){x=1120+side*200;y=2750;}
   const hp=boss?420:ranged?100:70+a.wave*10;
   e.arcade.bots.push({id:`arena-${++e.serial}`,owner:p.id,arena:true,boss,ranged,kind:'gang',x,y,homeX:x,homeY:y,hp,maxHp:hp,cooldown:1.5,respawn:0,phase:i*.9,state:'ready',windup:0,targetId:null,seenAt:-100,aim:null,path:[],pathAt:0});
  }
  say(p,a.wave===3?'WAVE 3 / THE RUG BARON. Use cover, keep moving, and watch the aiming lines.':`WAVE ${a.wave} / ${count} raiders incoming. Your squad can help.`);
 }
 P.join=function(...args){const p=base.join.apply(this,args);restore(p);p.mode=this.mode||'solo';return p;};
 P.action=function(id,a){
  const p=this.player(id),r=p.rising;
  if(!r)return base.action.call(this,id,a);
  if(a?.type==='ride'){
   if(p.contract||p.defense||r.arena)throw Error('Finish your active challenge before riding.');
   if(p.heat>=22)throw Error('Lose the cops before taking out the board.');
   r.riding=!r.riding;r.speed=0;p.fireHeld=false;return r.riding?'Hoverboard mounted. Steer normally; V / Ride to dismount.':'Back on foot.';
  }
  if(a?.type==='medkit'){
   if(p.hp>=100)throw Error('Health is already full.');if(!r.medkits)throw Error('No medkits left. Find Patch near Bad Taste Supply.');
   r.medkits--;p.hp=Math.min(100,p.hp+45);p.invulnerable=Math.max(p.invulnerable,.4);return 'Medkit used. +45 HP.';
  }
  if(a?.type==='restock'){
   if(p.room||dist(p,GUIDES.find(g=>g.id==='doc'))>125)throw Error('Visit Patch near Bad Taste Supply.');
   if(r.medkits>=9)throw Error('You can carry up to 9 medkits.');if(p.credits<25)throw Error('A medkit costs 25 play credits.');p.credits-=25;r.medkits++;return 'Medkit packed. 25 play credits.';
  }
  if(a?.type==='claimChapter'){
   const c=objective(p);if(!c)throw Error('Your city journey is complete.');if(!c.ready)throw Error('Complete this chapter’s objective first.');
   r.claimed++;p.credits+=c.reward;p.xp+=c.xp;return `CHAPTER ${c.number} COMPLETE / +${c.reward} play credits / +${c.xp} XP.`;
  }
  if(a?.type==='fortUpgrade'){
   if(C.areaAt(p.x,p.y)!=='fortress')throw Error('Visit Fortress Heights to upgrade.');
   if(!p.plot.some(o=>o.kind==='home')||p.plot.length<4)throw Error('Build a Meme HQ and at least 4 pieces first.');
   if(r.fortLevel>=3)throw Error('Fortress is fully upgraded.');const cost=UPGRADE_COSTS[r.fortLevel];if(p.credits<cost)throw Error(`Upgrade needs ${cost} play credits.`);
   p.credits-=cost;r.fortLevel++;return `FORTRESS LEVEL ${r.fortLevel}. Stronger defenders and an HQ healing zone.`;
  }
  if(a?.type==='startSurvival'){
   if(dist(p,GUIDES.find(g=>g.id==='marshal'))>180)throw Error('Walk to Marshal’s arena terminal.');
   if(p.contract||p.defense||r.arena)throw Error('Finish or abandon your active challenge first.');if(r.arenaCooldown>0)throw Error('The arena is resetting. Try again shortly.');
   if(this.arcade.bots.length+12>64)throw Error('Arena is busy. Finish other challenges first.');
   r.riding=false;r.speed=0;r.arenaResult=null;r.arena={wave:0,next:3,remaining:240,spawned:false,startDeaths:p.deaths};return 'Arena survival: 3 waves. Stand ready. Defeat the Rug Baron to win.';
  }
  if(a?.type==='endSurvival'){if(!r.arena)throw Error('No arena run active.');cleanArena(this,p,'abandoned');return 'Arena run abandoned. No completion reward.';}
  if(r.arena&&['contract','defenseDrill'].includes(a?.type))throw Error('Finish or abandon the arena run first.');
  if(['fire','contract','defenseDrill','dash'].includes(a?.type)){r.riding=false;r.speed=0;}
  return base.action.call(this,id,a);
 };
 P.tick=function(dt){
  dt=Math.max(0,Math.min(.1,dt));for(const p of this.players.values())if(p.rising?.riding&&(p.fireHeld||p.heat>=22)){p.rising.riding=false;p.rising.speed=0;}
  base.tick.call(this,dt);
  for(const p of this.players.values()){
   const r=p.rising;if(!r)continue;r.arenaCooldown=Math.max(0,r.arenaCooldown-dt);
   if(r.riding){
    const n=Math.hypot(p.input.x,p.input.y);r.speed=n>.05?Math.min(270,r.speed+260*dt):0;
    if(n>.05){const dx=p.input.x*r.speed*dt,dy=p.input.y*r.speed*dt,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/6));for(let i=0;i<steps;i++){if(!C.blocked(p.x+dx/steps,p.y,p))p.x+=dx/steps;if(!C.blocked(p.x,p.y+dy/steps,p))p.y+=dy/steps;}}
    p.area=C.areaAt(p.x,p.y);
   }
   for(const n of LANDMARKS)if(!r.found.includes(n.id)&&dist(p,n)<60){r.found.push(n.id);p.credits+=20;p.xp+=20;say(p,`LANDMARK FOUND / ${n.name} · ${r.found.length}/12 · +20 play credits / +20 XP.`);}
   for(const g of this.arcade.guards.filter(g=>g.owner===p.id)){
    const type=C.CREW_TYPES.find(t=>t.id===g.role),max=type.hp+r.fortLevel*20;
    if(g.maxHp!==max){if(g.hp>0)g.hp=Math.min(max,g.hp+Math.max(0,max-g.maxHp));g.maxHp=max;}
    if(g.hp>0&&g.hp<g.maxHp&&r.fortLevel&&C.areaAt(g.x,g.y)==='fortress'&&g.state!=='engaging')g.hp=Math.min(g.maxHp,g.hp+dt*r.fortLevel*2);
   }
   const home=p.plot.find(o=>o.kind==='home');
   if(r.fortLevel&&home&&p.quiet>5&&dist(p,{x:C.PLOT.x+home.col*64+32,y:C.PLOT.y+home.row*64+32})<210+r.fortLevel*35)p.hp=Math.min(100,p.hp+dt*(2+r.fortLevel));
   const a=r.arena;if(!a)continue;
   if(p.deaths>a.startDeaths){cleanArena(this,p,'busted');continue;}
   if(C.areaAt(p.x,p.y)!=='arena'){cleanArena(this,p,'left');continue;}
   a.remaining-=dt;if(a.remaining<=0){cleanArena(this,p,'expired');continue;}
   const alive=this.arcade.bots.some(b=>b.arena&&b.owner===p.id&&b.hp>0);
   if(a.spawned&&!alive){a.spawned=false;r.bestWave=Math.max(r.bestWave,a.wave);if(a.wave===3){cleanArena(this,p,'won');continue;}a.next=4;say(p,`WAVE ${a.wave} CLEARED. Next wave in 4 seconds. Heal and regroup.`);}
   if(!a.spawned){a.next=Math.max(0,a.next-dt);if(a.next===0){this.arcade.bots=this.arcade.bots.filter(b=>!(b.arena&&b.owner===p.id));wave(this,p);}}
  }
 };
 P.snapshot=function(id){const s=base.snapshot.call(this,id),p=this.player(id);s.self.rising=JSON.parse(JSON.stringify(p.rising));for(const x of s.players){const player=this.players.get(x.id);x.riding=!!player.rising?.riding;}return s;};
 root.CityRising=Object.freeze({LANDMARKS,GUIDES,CHAPTERS,ONLINE_CHAPTERS,chapters,UPGRADE_COSTS,restore,save,objective,nearest});
})(typeof window==='undefined'?globalThis:window);
