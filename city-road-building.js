/* First-person Fortress Road building slice. Seed-scoped local save; no wallet or legacy save writes. */
'use strict';
(function(root){
 const VERSION=1;
 const KEY='meme-city-road-build-v1:';
 function create(seed,storage){
  if(typeof seed!=='string'||!seed||seed.length>128)throw new TypeError('invalid seed');
  if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')throw new TypeError('storage required');
  const key=KEY+seed;
  let saved=null;
  try{
   const raw=JSON.parse(storage.getItem(key));
   if(raw&&raw.version===VERSION&&raw.seed===seed&&raw.kind==='workbench'&&
      Number.isSafeInteger(raw.x)&&Number.isSafeInteger(raw.z)&&
      Math.abs(raw.x)<1000000&&Math.abs(raw.z)<1000000)saved=Object.freeze({...raw});
  }catch{}
  return Object.freeze({
   get placed(){return saved;},
   canPlace(suppliesClaimed,position,site){
    return !saved&&suppliesClaimed&&position&&site&&
     Number.isFinite(position.x)&&Number.isFinite(position.z)&&
     Math.hypot(position.x-site.x,position.z-site.z)<10;
   },
   place(suppliesClaimed,position,site){
    if(!this.canPlace(suppliesClaimed,position,site))return false;
    const next=Object.freeze({version:VERSION,seed,kind:'workbench',
     x:Math.round(site.x+5),z:Math.round(site.z+4)});
    try{
     storage.setItem(key,JSON.stringify(next));
     if(storage.getItem(key)!==JSON.stringify(next))return false;
    }catch{return false;}
    saved=next;return true;
   }
  });
 }
 root.CityRoadBuilding=Object.freeze({create,VERSION,KEY});
})(typeof window==='undefined'?globalThis:window);
