/* Open Doors: walkable interiors with independent room coordinates and a discovery passport. */
'use strict';
(function(root){
 const C=root.MemeCityCore,P=C.Engine.prototype,base={join:P.join,tick:P.tick,action:P.action,snapshot:P.snapshot};
 const themes={launch:['Launch House','lobby','journey','#b9a3e5'],arcade:['Chaos Arcade','arcade','missions','#70d8d0'],club:['The Unfiltered','club','social','#d59ae8'],shop:['Bad Taste Supply','shop','shop','#c9db9a'],market:['Night Market','market','market','#e3ba85'],garage:['Meme Motors','garage','mobility','#99cfdf']};
 const extras={creator:[['Meme Gallery','gallery','collections','#c6b0e6'],['Print Studio','studio','avatar','#9dd5c3']],arena:[['The Proving Ground','arena','survival','#e7ba96']],social:[['The Common Room','lounge','social','#a6cadf'],['Boardwalk Cafe','cafe','social','#e3cc9c']]};
 const BUILDINGS=C.WORLD.buildings.map(b=>({...b,roomId:b.id,name:themes[b.id]?.[0]||b.label,theme:themes[b.id]?.[1]||(b.id.endsWith('-2')?'arcade':b.id.endsWith('-1')?'shop':'gallery'),activity:themes[b.id]?.[2]||(b.id.endsWith('-1')?'shop':'clans'),accent:themes[b.id]?.[3]||b.hue}));
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
 function restore(p,s){p.places={visited:IDS.filter(id=>Array.isArray(s?.visited)&&s.visited.includes(id)),souvenirs:IDS.filter(id=>Array.isArray(s?.souvenirs)&&s.souvenirs.includes(id))};p.room=null;return p.places;}
 function save(p){return {visited:[...p.places.visited],souvenirs:[...p.places.souvenirs]};}
 function activity(p){if(!p.room)return null;if(distance(p.room,ROOM.exit)<85)return {kind:'exit',label:'Exit to the street'};if(distance(p.room,ROOM.activity)<100)return {kind:'activity',label:p.room.activity==='shop'?'Browse equipment':p.room.activity==='survival'?'Arena terminal':'Use activity terminal',panel:p.room.activity};return null;}
 P.join=function(...args){const p=base.join.apply(this,args);restore(p);return p;};
 P.action=function(id,a){
  const p=this.player(id);
  if(a?.type==='enterBuilding'){
   if(p.room)throw Error('You are already inside.');const b=buildings(p).find(b=>b.roomId===a.building);if(!b)throw Error('Unknown building.');const entry=door(b);
   if(distance(p,entry)>100)throw Error('Walk to the building’s front door.');
   if(p.contract||p.defense||p.rising?.arena)throw Error('Finish or abandon your challenge before going inside.');if(p.heat>=22)throw Error('Lose your wanted pursuit before going inside.');
   p.room={id:b.roomId,name:b.name,theme:b.theme,activity:b.activity,accent:b.accent,...ROOM.spawn};p.fireHeld=false;p.dashTime=0;p.input={x:0,y:0};if(p.rising){p.rising.riding=false;p.rising.speed=0;}
   if(!p.places.visited.includes(b.roomId)){p.places.visited.push(b.roomId);p.xp+=15;p.credits+=10;}p.area='interior';return `Welcome to ${b.name}. Walk inside; E at the front door returns to the street.`;
  }
  if(a?.type==='exitBuilding'){
   if(!p.room)throw Error('You are outside.');if(distance(p.room,ROOM.exit)>95)throw Error('Walk to the glowing exit at the bottom of the room.');
   p.room=null;p.area=C.areaAt(p.x,p.y);p.input={x:0,y:0};p.invulnerable=Math.max(p.invulnerable,1);return 'Back on the street.';
  }
  if(p.room){
   if(['ride','fire','dash','contract','startSurvival','defenseDrill','checkpoint','build','demolish','starterfort','hire','list','purchase'].includes(a?.type))throw Error('Step outside for that activity.');
   if(a?.type==='buy'){
    if(p.room.theme!=='shop'||distance(p.room,ROOM.activity)>110)throw Error('Visit the equipment counter in Bad Taste Supply.');
    const old={x:p.x,y:p.y,area:p.area};const shop=C.WORLD.stations.find(s=>s.id==='shop');p.x=shop.x;p.y=shop.y;
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
 P.snapshot=function(id){const s=base.snapshot.call(this,id),p=this.player(id);s.self.room=p.room?{...p.room}:null;s.self.places=save(p);for(const x of s.players){const room=this.player(x.id).room;x.room=room?{...room}:null;x.facing={...(this.player(x.id).facing||{x:0,y:1})};x.moving=Math.hypot(this.player(x.id).input.x,this.player(x.id).input.y)>.1;}return s;};
 root.CityInteriors=Object.freeze({BUILDINGS,ROOM,IDS,furniture,buildings,door,nearest,roomBlocked,activity,restore,save});
})(typeof window==='undefined'?globalThis:window);
