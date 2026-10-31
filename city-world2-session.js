/* Explicit opt-in world2 browser sandbox persistence. It NEVER touches the world1 save key. */
'use strict';
(function(root){
 const KIND='world2-private-preview',WORLD=2,SAVE=6;
 const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 function create(storage,key,sim){
  if(!storage||typeof key!=='string'||!key.startsWith('offensive-meme-city-world2-')||!sim?.loadStage||!sim?.territory)
   throw Error('Isolated world2 session storage required');
  let baseline=null,initialized=false,writeReady=false,revision=0;
  function verify(record){
   return object(record)&&record.kind===KIND&&Number.isSafeInteger(record.revision)&&record.revision>0&&
    object(record.save)&&record.save.version===SAVE&&record.save.saveVersion===SAVE&&record.save.worldVersion===WORLD&&
    Number.isFinite(record.save.x)&&Number.isFinite(record.save.y)&&
    Number.isSafeInteger(record.save.xp)&&record.save.xp>=0&&Number.isSafeInteger(record.save.credits)&&record.save.credits>=0&&
    Array.isArray(record.territory)&&record.territory.length<=sim.territory.zones.length;
  }
  function inspect(){
   let raw;try{raw=storage.getItem(key);}catch{return {status:'blocked',reason:'Sandbox storage is unavailable.'};}
   if(raw===null){baseline=null;revision=0;initialized=true;writeReady=true;return {status:'empty'};}
   let record;try{record=JSON.parse(raw);}catch{return {status:'invalid',reason:'Sandbox save is malformed. Left untouched.'};}
   if(!verify(record))return {status:'invalid',reason:'Sandbox save uses unsupported schema. Left untouched.'};
   // Inspect only, never overwrite an existing preview until it is intentionally loaded.
   baseline=raw;revision=record.revision;initialized=true;writeReady=false;
   return {status:'ready',record};
  }
  function load(){
   const result=inspect();if(result.status!=='ready')return result;
   const zoneCheck=sim.territory.restore(result.record.territory);
   if(zoneCheck.status!=='loaded')return {status:'invalid',reason:'Sandbox territory ownership is invalid. Nothing was saved.'};
   let loaded;
   try{loaded=sim.loadStage(result.record.save);}catch{return {status:'invalid',reason:'Saved character could not be loaded safely.'};}
   if(loaded?.status!=='loaded')return {status:'invalid',reason:'Saved world2 character is incompatible.'};
   // The standard staged-save loader clears territory; restore again after character load.
   sim.territory.restore(result.record.territory);
   writeReady=true;return {status:'loaded',revision,relocated:loaded.relocated};
  }
  function snapshot(){
   const p=sim.player;
   return {version:SAVE,saveVersion:SAVE,worldVersion:WORLD,x:p.x,y:p.y,
    xp:p.xp,credits:p.credits,kills:p.kills,jobs:p.jobs,route:p.route,completed:p.completed,
    inventory:JSON.parse(JSON.stringify(p.inventory)),equipped:{...p.equipped},
    plot:p.plot.map(o=>({...o})),crew:JSON.parse(JSON.stringify(p.crew)),crewKills:p.crewKills,
    clans:{clan:p.clan,reputation:{...p.reputation},outposts:p.outposts.map(o=>({...o}))},
    rising:JSON.parse(JSON.stringify(p.rising)),places:JSON.parse(JSON.stringify(p.places)),style:{...p.style}};
  }
  function save(){
   if(!initialized){const result=inspect();if(!['empty','ready'].includes(result.status))return result;}
   if(!writeReady)return {status:'review',reason:'Load the existing preview save before overwriting it.'};
   let current;try{current=storage.getItem(key);}catch{return {status:'blocked',reason:'Cannot read sandbox storage.'};}
   if(current!==baseline)return {status:'conflict',reason:'Sandbox session was changed in another tab. Reload before saving.'};
   const record={kind:KIND,revision:revision+1,save:snapshot(),
    territory:sim.territory.snapshot().map(({id,owner})=>({id,owner}))};
   const serialized=JSON.stringify(record);
   if(serialized.length>150000)return {status:'blocked',reason:'Sandbox save exceeds the protected size limit.'};
   try{storage.setItem(key,serialized);}
   catch{return {status:'blocked',reason:'Sandbox storage is full or unavailable.'};}
   try{if(storage.getItem(key)!==serialized)return {status:'conflict',reason:'Sandbox changed during save. Reload to review.'};}
   catch{return {status:'blocked',reason:'Cannot verify the saved sandbox state.'};}
   baseline=serialized;revision=record.revision;return {status:'saved',revision};
  }
  return Object.freeze({inspect,load,save,snapshot,key});
 }
 root.CityWorld2Session=Object.freeze({create});
})(typeof window==='undefined'?globalThis:window);
