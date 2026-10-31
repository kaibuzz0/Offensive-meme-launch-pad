/* Offline world-v2 courier contract. No permanent player funds, trading or network side effects. */
'use strict';
(function(root){
 function create(registry){
  if(!registry?.resolve)throw Error('Canonical world2 POI registry required');
  const start=registry.resolve('door:launch'),end=registry.resolve('checkpoint:1');
  if(!start||!end)throw Error('Courier mission requires launch door and creator destination');
  const state={status:'idle',remaining:0,cooldown:0,completed:0,originId:start.id,targetId:end.id};
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function launch(player){
   if(state.status==='active')return {status:'busy',message:'Courier delivery already in progress.'};
   if(state.cooldown>0)return {status:'cooldown',message:'Courier desk is recharging. '+Math.ceil(state.cooldown)+' seconds.'};
   if(!player||!Number.isFinite(player.x)||!Number.isFinite(player.y)||dist(player,start)>125)
    return {status:'far',message:'Visit the Launch House entrance to accept a courier job.'};
   if(!(player.hp>0))return {status:'down',message:'Respawn before taking a delivery.'};
   state.status='active';state.remaining=210;
   return {status:'active',target:end,message:'Courier accepted. Deliver the parcel to '+end.name+' before time runs out.'};
  }
  function deliver(player){
   if(state.status!=='active')return {status:'inactive',message:'No active courier delivery.'};
   if(!player||!Number.isFinite(player.x)||!Number.isFinite(player.y)||dist(player,end)>125)
    return {status:'far',message:'Follow your route to '+end.name+' and interact there.'};
   if(!(player.hp>0))return {status:'down',message:'Respawn before completing delivery.'};
   state.status='complete';state.remaining=0;state.cooldown=45;state.completed++;
   player.xp+=75;player.credits+=60;player.jobs=(Number.isInteger(player.jobs)?player.jobs:0)+1;
   return {status:'delivered',message:'Courier delivered! +75 preview XP, +60 preview credits. No live save was changed.'};
  }
  function tick(dt){
   const d=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
   state.cooldown=Math.max(0,state.cooldown-d);
   if(state.status==='complete'&&state.cooldown===0)state.status='idle';
   if(state.status!=='active')return null;
   state.remaining=Math.max(0,state.remaining-d);
   if(state.remaining>1e-8)return null;
   state.remaining=0;
   state.status='failed';state.cooldown=20;
   return {status:'expired',message:'Courier delivery expired. No preview reward was awarded.'};
  }
  function abandon(){
   if(state.status!=='active')return {status:'inactive',message:'No active courier to abandon.'};
   state.status='failed';state.remaining=0;state.cooldown=10;
   return {status:'abandoned',message:'Courier delivery abandoned. No reward.'};
  }
  function reset(){state.status='idle';state.remaining=0;state.cooldown=0;state.completed=0;}
  return Object.freeze({state,start:launch,deliver,tick,abandon,reset,target:end,origin:start});
 }
 root.CityWorld2Contracts=Object.freeze({create});
})(typeof window==='undefined'?globalThis:window);
