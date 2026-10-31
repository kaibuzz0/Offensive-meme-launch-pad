/* Safe World V1 CENTER-CITY save fork. Never overwrite the original solo save.
 * All progression is imported into a new schema/key with an immutable source
 * snapshot; original World V1 can be restored by switching the website branch.
 */
'use strict';
(function(root){
 const SAVE_VERSION=6,WORLD_VERSION=1,LAYOUT_VERSION=2;
 const sourceAreas={
  fortress:{x:0,y:0},hub:{x:2240,y:0},creator:{x:4480,y:0},
  arena:{x:0,y:1660},social:{x:4480,y:1660},
  offensive:{x:0,y:3320},congress:{x:2240,y:3320},exit:{x:4480,y:3320},
  'you-missed':{x:0,y:4980},maduro:{x:2240,y:4980},redacted:{x:4480,y:4980}
 };
 const isSave=s=>s&&typeof s==='object'&&!Array.isArray(s)&&Number.isInteger(s.version);
 function migrate(C,old){
  if(!isSave(old)||old.version<1||old.version>5||
   (old.worldVersion!==undefined&&old.worldVersion!==WORLD_VERSION)||
   (old.version===5&&(old.saveVersion!==5||old.worldVersion!==1)))
   return {status:'blocked',reason:'Original solo save has an unsupported schema. It was not modified.'};
  function migratePoint(point,area,forceLocal=false){
   if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return null;
   const x=point.x,y=point.y,source=sourceAreas[area];
   const locations=Object.entries(sourceAreas);
   const id=forceLocal&&source?area:locations.find(([name,r])=>
    x>=r.x&&x<r.x+2240&&y>=r.y&&y<r.y+1660)?.[0];
   if(!id)return null;
   const from=sourceAreas[id],to=id==='hub'?C.HUB:C.DISTRICTS.find(d=>d.id===id)||C.NEIGHBORHOODS.find(n=>n.id===id);
   if(!to)return null;
   const newX=(forceLocal?x:x-from.x)+(to.ox??to.x),
    newY=(forceLocal?y:y-from.y)+(to.oy??to.y);
   if(newX<28||newY<35||newX>=C.WORLD.width-28||newY>=C.WORLD.height-28)return null;
   return {x:newX,y:newY,area:id};
  }
  const copy=JSON.parse(JSON.stringify(old)),pos=migratePoint(old,old.area,old.version===1);
  // Previously-unmapped greenbelt positions are moved to a safe fortress spawn.
  const safe=pos&&!C.blocked(pos.x,pos.y)?pos:{x:C.WORLD.spawn.x,y:C.WORLD.spawn.y,area:'fortress'};
  copy.x=safe.x;copy.y=safe.y;copy.area=safe.area;
  if(Array.isArray(copy.crew))for(const member of copy.crew){
   if(!member||!member.post)continue;
   const post=migratePoint(member.post);if(!post||C.blocked(post.x,post.y))delete member.post;
   else member.post={x:post.x,y:post.y};
  }
  copy.version=SAVE_VERSION;copy.saveVersion=SAVE_VERSION;copy.worldVersion=WORLD_VERSION;
  copy.layoutVersion=LAYOUT_VERSION;
  // Never carry untransformed optional waypoints into the new geometry.
  for(const key of ['waypoint','checkpoint','respawn']){
   if(!copy[key])continue;
   const mapped=migratePoint(copy[key]);copy[key]=mapped||null;
  }
  return {status:'ready',save:copy,relocated:!pos||safe!==pos};
 }
 function prepare(storage,activeKey,sourceKey,backupKey,C){
  const blocked=reason=>({data:null,blocked:true,reason});
  if(![activeKey,sourceKey,backupKey].every(k=>typeof k==='string'&&k)||
   new Set([activeKey,sourceKey,backupKey]).size!==3)return blocked('Invalid save slots.');
  let active,original,backup;
  try{active=storage.getItem(activeKey);original=storage.getItem(sourceKey);backup=storage.getItem(backupKey);}
  catch{return blocked('Browser storage unavailable. Saving is disabled; original save is untouched.');}
  if(active!==null){
   let data;try{data=JSON.parse(active);}catch{return blocked('Center-city save is malformed; saving is disabled.');}
   if(!isSave(data)||data.version!==SAVE_VERSION||data.saveVersion!==SAVE_VERSION||
      data.worldVersion!==WORLD_VERSION||data.layoutVersion!==LAYOUT_VERSION)
    return blocked('Center-city save version is unsupported; saving is disabled.');
   return {data,blocked:false,reason:''};
  }
  if(original===null)return {data:null,blocked:false,reason:''};
  if(backup!==null&&backup!==original)return blocked('An older source backup exists. Original save has changed; automatic migration paused to prevent data loss.');
  let old;try{old=JSON.parse(original);}catch{return blocked('Original solo save is malformed and was not modified.');}
  const result=migrate(C,old);if(result.status!=='ready')return blocked(result.reason);
  try{
   if(storage.getItem(sourceKey)!==original||storage.getItem(activeKey)!==null)
    return blocked('Save changed in another tab; migration paused.');
   if(backup===null)storage.setItem(backupKey,original);
   if(storage.getItem(sourceKey)!==original||storage.getItem(activeKey)!==null)
    return blocked('Save changed during backup; migration paused.');
   storage.setItem(activeKey,JSON.stringify(result.save));
  }catch{return blocked('Could not create protected center-city save. Original remains untouched; saving disabled.');}
  return {data:result.save,blocked:false,
   reason:result.relocated?'Previous position could not be mapped. Started safely at your central fortress; other progress was imported.':''};
 }
 root.CityCenterSave=Object.freeze({SAVE_VERSION,WORLD_VERSION,LAYOUT_VERSION,migrate,prepare});
})(typeof window==='undefined'?globalThis:window);
