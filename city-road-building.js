/* First-person Fortress Road building slice. Seed-scoped local save; no wallet or legacy save writes. */
'use strict';
(function(root){
 const VERSION=1;
 const KEY='meme-city-road-build-v1:';
 const CRAFT_KEY='meme-city-road-craft-v1:';
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
  let crafted=false;
  try { crafted=storage.getItem(CRAFT_KEY+seed)==='torch-1' && !!saved; } catch {}
  return Object.freeze({
   get crafted(){return crafted;},
   craftTorch(position,site){
    // Crafting happens at the actual saved workbench, not the supply cache.
    // This matters when the cache and workbench are several voxels apart.
    if(!saved||crafted||!position||!Number.isFinite(position.x)||!Number.isFinite(position.z)||
       Math.hypot(position.x-saved.x,position.z-saved.z)>=10)return false;
    try{
     // A second open tab may have crafted since this controller was created.
     // Never silently replace an existing or malformed crafting record.
     const current=storage.getItem(CRAFT_KEY+seed);
     if(current!==null)return false;
     storage.setItem(CRAFT_KEY+seed,'torch-1');
     if(storage.getItem(CRAFT_KEY+seed)!=='torch-1')return false;
    }catch{return false;}
    crafted=true;return true;
   },
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
 root.CityRoadBuilding=Object.freeze({create,VERSION,KEY,CRAFT_KEY});
})(typeof window==='undefined'?globalThis:window);
