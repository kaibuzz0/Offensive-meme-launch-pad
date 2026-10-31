/* World-v2 migration staging. Preview only: does not activate a new city or change live save keys. */
'use strict';
(function(root){
 const TARGET_WORLD=2,TARGET_SAVE=6;
 const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 function plan(C,T,original){
  if(!isObject(original)||!Number.isInteger(original.version)||original.version<1||original.version>5||
     (original.worldVersion!==undefined&&original.worldVersion!==1)||
     (original.version===5&&original.saveVersion!==5))return {status:'invalid',reason:'Unsupported saved world or schema version.'};
  // The current browser never persists these session-scoped activities. Do not invent
  // location/timer transforms for a future save that contains them.
  if(original.contract||original.blockJob||original.defense||original.room||original.rising?.arena)
   return {status:'blocked',reason:'An active session activity needs an explicit migration policy.'};
  let copy;
  try{copy=JSON.parse(JSON.stringify(original));}catch{return {status:'invalid',reason:'Unable to clone the saved progress.'};}
  const notices=[],fallback=()=>({x:T.draft.areas.hub.x+T.draft.areas.hub.w/2,y:T.draft.areas.hub.y+T.draft.areas.hub.h/2,area:'hub'});
  function convert(p,id){
   if(!isObject(p)||!Number.isFinite(p.x)||!Number.isFinite(p.y))return null;
   const result=T.point(C,p,id);
   return result?{x:result.x,y:result.y,area:result.area}:null;
  }
  // v1 stores local-area coordinates; later saves store absolute world1 positions.
  let origin={x:original.x,y:original.y};
  if(original.version===1){
   const area=original.area||'hub',region=T.source(C,area);
   if(region&&Number.isFinite(original.x)&&Number.isFinite(original.y)&&original.x>=0&&original.y>=0&&original.x<region.w&&original.y<region.h)
    origin={x:region.x+original.x,y:region.y+original.y};
   else origin=null;
  }
  const home=convert(origin);
  const destination=home||fallback();
  if(!home)notices.push('Legacy location could not be projected; placed at the public commons. Inventory and progression were retained.');
  copy.x=destination.x;copy.y=destination.y;copy.area=destination.area;
  const crewPosts=[];
  if(Array.isArray(copy.crew)){
   for(let i=0;i<copy.crew.length;i++){
    const member=copy.crew[i];
    if(!isObject(member)||!isObject(member.post))continue;
    const projected=convert(member.post),post=projected||{x:T.draft.areas.fortress.x+T.draft.areas.fortress.w/2,y:T.draft.areas.fortress.y+T.draft.areas.fortress.h-120,area:'fortress'};
    if(!projected)notices.push('Unmapped defender post '+i+' was moved to the fortress staging area.');
    member.post={x:post.x,y:post.y};crewPosts.push({index:i,...post});
   }
  }
  // Known optional persisted waypoints/checkpoints are projected; do not silently
  // carry old-world coordinates into the new map. Bad points remain explicitly marked.
  for(const key of ['waypoint','checkpoint','respawn']){
   if(original[key]==null)continue;
   const migrated=convert(original[key]);
   if(!migrated){copy[key]=null;notices.push('Unmapped '+key+' was cleared; a safe public spawn remains available.');}
   else copy[key]={...copy[key],x:migrated.x,y:migrated.y,area:migrated.area};
  }
  // The existing plot and per-clan outposts use local col/row tile indices.
  // Their real anchors are defined by T.draft.plot and T.outpost(), respectively.
  copy.version=TARGET_SAVE;copy.saveVersion=TARGET_SAVE;copy.worldVersion=TARGET_WORLD;
  const route=Number.isInteger(original.route)&&original.route>=0&&original.route<C.WORLD.route.length?
   convert(C.WORLD.route[original.route]):null;
  return {status:'preview',save:copy,notices,routeTarget:route,crewPosts,
    anchor:{plot:{...T.draft.plot},outposts:C.NEIGHBORHOODS.map(n=>({id:n.id,...T.outpost(C,n.id)}))}};
 }
 function stage(storage,keys,C,T){
  const {active,backup,preview}=keys||{};
  if(![active,backup,preview].every(k=>typeof k==='string'&&k.length>0)||new Set([active,backup,preview]).size!==3)
   return {status:'invalid',reason:'Distinct save, backup and preview keys required.'};
  let raw,existing;
  try{raw=storage.getItem(active);existing=storage.getItem(backup);}
  catch{return {status:'blocked',reason:'Cannot read local storage.'};}
  if(raw===null)return {status:'invalid',reason:'No original save exists to migrate.'};
  let save;try{save=JSON.parse(raw);}catch{return {status:'invalid',reason:'Original save JSON is malformed.'};}
  const planned=plan(C,T,save);
  if(planned.status!=='preview')return planned;
  if(existing!==null&&existing!==raw)return {status:'conflict',reason:'The protected world-v2 backup belongs to a different save revision.'};
  const staged=JSON.stringify({kind:'world2-preview-only',sourceRaw:raw,save:planned.save,notices:planned.notices});
  try{
   if(storage.getItem(active)!==raw)return {status:'conflict',reason:'Save changed in another tab before migration staging.'};
   if(existing===null)storage.setItem(backup,raw);
   if(storage.getItem(active)!==raw)return {status:'conflict',reason:'Save changed while preserving the recovery copy.'};
   storage.setItem(preview,staged);
   if(storage.getItem(active)!==raw)return {status:'conflict',reason:'Save changed during staging. Preview must not be activated.'};
   return {status:'staged',notices:planned.notices,previewKey:preview};
  }catch{return {status:'blocked',reason:'Could not safely write backup/preview. The original was not modified.'};}
 }
 root.CityMigration=Object.freeze({TARGET_WORLD,TARGET_SAVE,plan,stage});
})(typeof window==='undefined'?globalThis:window);
