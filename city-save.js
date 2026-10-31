/* Save schema guard: preserve old player data before changing world coordinates. */
'use strict';
(function(root){
 const SAVE_VERSION=5,WORLD_VERSION=1;
 function prepare(storage,key,backupKey){
  let raw;
  try{raw=storage.getItem(key);}catch{return {data:null,blocked:true,reason:'Browser storage is unavailable. This session cannot save.'};}
  if(raw===null)return {data:null,blocked:false,reason:''};
  let data;
  try{data=JSON.parse(raw);}catch{return {data:null,blocked:true,reason:'Existing save is malformed and has been left untouched. Saving is disabled.'};}
  if(!data||Array.isArray(data)||typeof data!=='object'||!Number.isInteger(data.version)||data.version<1){return {data:null,blocked:true,reason:'Existing save schema is invalid. Saving is disabled to protect it.'};}
  if(data.version>SAVE_VERSION||(data.worldVersion!==undefined&&data.worldVersion!==WORLD_VERSION)||(data.version===SAVE_VERSION&&(data.saveVersion!==SAVE_VERSION||data.worldVersion!==WORLD_VERSION))){return {data:null,blocked:true,reason:'Existing save requires a different game/world version. Saving is disabled to protect it.'};}
  if(data.version<SAVE_VERSION){
   // Never replace an earlier recovery copy. If a backup cannot be written, fail closed.
   try{if(storage.getItem(backupKey)===null)storage.setItem(backupKey,raw);}catch{return {data,blocked:true,reason:'Could not back up the old save. Play is available, but saving is disabled.'};}
  }
  return {data,blocked:false,reason:''};
 }
 root.CitySave=Object.freeze({SAVE_VERSION,WORLD_VERSION,prepare});
})(typeof window==='undefined'?globalThis:window);
