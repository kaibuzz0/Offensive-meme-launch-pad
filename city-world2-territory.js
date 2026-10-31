/* Isolated world-v2 faction control points. No storage, rewards outside the preview, or building damage. */
'use strict';
(function(root){
 function create(C,W,registry){
  if(!C?.NEIGHBORHOODS?.length||!W?.blocked||!registry?.resolve)throw Error('World2 territory dependencies missing');
  const zones=C.NEIGHBORHOODS.map(n=>{
   const p=registry.resolve('neighborhood:'+n.id);
   if(!p||W.blocked(p.x,p.y))throw Error('Territory marker must be collision-safe: '+n.id);
   return {id:'control:'+n.id,name:n.name,homeClan:n.id,owner:n.id,x:p.x,y:p.y,progress:0,state:'guarded'};
  });
  const byId=new Map(zones.map(x=>[x.id,x]));
  let current=null,healthAtStart=0;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const validClan=id=>C.NEIGHBORHOODS.some(n=>n.id===id);
  function join(player,clan){
   if(!player||!validClan(clan))return {status:'invalid',message:'Choose a valid world2 faction.'};
   if(current){current.progress=0;current.state='guarded';current=null;}
   player.clan=clan;
   return {status:'joined',message:'Preview faction selected: '+C.NEIGHBORHOODS.find(n=>n.id===clan).clan+'.'};
  }
  function hostile(zone,player,agents){
   return agents.some(a=>a&&a.alive!==false&&a.hp>0&&a.clan&&a.clan!==player.clan&&
    (a.kind==='gang'||a.kind==='police')&&distance(a,zone)<190);
  }
  function start(player,id,agents=[]){
   const zone=byId.get(id);
   if(!zone)return {status:'invalid',message:'Unknown control point.'};
   if(!validClan(player?.clan))return {status:'no-clan',message:'Select a preview faction before capturing territory.'};
   if(zone.owner===player.clan)return {status:'friendly',message:'Your faction already controls this point.'};
   if(!Number.isFinite(player.x)||!Number.isFinite(player.y)||distance(player,zone)>155)return {status:'far',message:'Get within 155 units of the control point.'};
   if(!(player.hp>0))return {status:'down',message:'Respawn before capturing.'};
   if(current&&current!==zone){current.progress=0;current.state='guarded';}
   current=zone;healthAtStart=player.hp;
   zone.state=hostile(zone,player,agents)?'contested':'capturing';
   return {status:zone.state,message:zone.state==='contested'?'Hostile gang units contest this point. Clear them first.':'Hold this control point for eight seconds.'};
  }
  function tick(dt,player,agents=[]){
   if(!current)return null;
   const zone=current;
   const step=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
   if(!player||!validClan(player.clan)||distance(player,zone)>155||player.hp<=0||player.hp<healthAtStart){
    zone.progress=0;zone.state='guarded';current=null;
    return {status:'interrupted',message:'Control-point capture interrupted; progress reset.'};
   }
   if(hostile(zone,player,agents)){
    zone.state='contested';return {status:'contested',zoneId:zone.id,progress:zone.progress};
   }
   zone.state='capturing';zone.progress=Math.min(8,zone.progress+step);
   if(zone.progress<8-1e-8)return {status:'capturing',zoneId:zone.id,progress:zone.progress};
   zone.owner=player.clan;zone.state='captured';zone.progress=8;current=null;
   player.xp+=80;player.credits+=50;
   if(!player.reputation||typeof player.reputation!=='object')player.reputation={};
   player.reputation[player.clan]=(Number.isSafeInteger(player.reputation[player.clan])?player.reputation[player.clan]:0)+1;
   return {status:'captured',zoneId:zone.id,message:'Control point secured for '+player.clan+'! +80 preview XP, +50 preview credits, +1 reputation.'};
  }
  function reset(){
   current=null;
   for(const zone of zones){zone.owner=zone.homeClan;zone.state='guarded';zone.progress=0;}
  }
  function restore(owners){
   if(!Array.isArray(owners)||owners.length>zones.length)return {status:'invalid'};
   const entries=new Map();
   for(const item of owners){
    if(!item||typeof item!=='object'||!byId.has(item.id)||!validClan(item.owner)||entries.has(item.id))return {status:'invalid'};
    entries.set(item.id,item.owner);
   }
   reset();
   for(const zone of zones){const owner=entries.get(zone.id);if(owner){zone.owner=owner;zone.state=owner===zone.homeClan?'guarded':'captured';zone.progress=owner===zone.homeClan?0:8;}}
   return {status:'loaded'};
  }
  function cancel(){if(current){current.progress=0;current.state='guarded';current=null;}}
  function snapshot(){
   return zones.map(z=>Object.freeze({id:z.id,name:z.name,x:z.x,y:z.y,owner:z.owner,progress:z.progress,state:z.state,homeClan:z.homeClan}));
  }
  return Object.freeze({zones,join,start,tick,reset,cancel,restore,snapshot,active:()=>current?.id||null});
 }
 root.CityWorld2Territory=Object.freeze({create});
})(typeof window==='undefined'?globalThis:window);
