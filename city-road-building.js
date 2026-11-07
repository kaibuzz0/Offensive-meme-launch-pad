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
  function refresh(){
   // Read through shared localStorage so another open tab's completed build
   // becomes visible without reloading. Reject malformed/future saves.
   try{
    const raw=storage.getItem(key);
    const record=raw===null?null:JSON.parse(raw);
    saved=record&&record.version===VERSION&&record.seed===seed&&
     record.kind==='workbench'&&Number.isSafeInteger(record.x)&&
     Number.isSafeInteger(record.z)&&Math.abs(record.x)<1000000&&
     Math.abs(record.z)<1000000?Object.freeze({...record}):null;
    crafted=!!saved&&storage.getItem(CRAFT_KEY+seed)==='torch-1';
   }catch{saved=null;crafted=false;}
  }
  refresh();
  return Object.freeze({
   get crafted(){refresh();return crafted;},
   craftTorch(position,site){
    // Crafting happens at the actual saved workbench, not the supply cache.
    // This matters when the cache and workbench are several voxels apart.
    refresh();
    if(!saved||crafted||!position||!Number.isFinite(position.x)||!Number.isFinite(position.z)||
       Math.hypot(position.x-saved.x,position.z-saved.z)>=10)return false;
    try{
     // A second open tab may have crafted since this controller was created.
     // Never silently replace an existing or malformed crafting record.
     const persisted=JSON.parse(storage.getItem(key));
     // Never craft against a deleted, replaced or future-version workbench.
     if(!persisted||persisted.version!==VERSION||persisted.seed!==seed||
        persisted.kind!=='workbench'||persisted.x!==saved.x||persisted.z!==saved.z)return false;
     const current=storage.getItem(CRAFT_KEY+seed);
     if(current!==null)return false;
     storage.setItem(CRAFT_KEY+seed,'torch-1');
     if(storage.getItem(CRAFT_KEY+seed)!=='torch-1')return false;
    }catch{return false;}
    crafted=true;return true;
   },
   get placed(){refresh();return saved;},
   canPlace(suppliesClaimed,position,site){
    refresh();
    return !saved&&suppliesClaimed&&position&&site&&
     Number.isFinite(position.x)&&Number.isFinite(position.z)&&
     Math.hypot(position.x-site.x,position.z-site.z)<10;
   },
   place(suppliesClaimed,position,site){
    if(!this.canPlace(suppliesClaimed,position,site))return false;
    const next=Object.freeze({version:VERSION,seed,kind:'workbench',
     x:Math.round(site.x+5),z:Math.round(site.z+4)});
    try{
     // A second tab may have placed a bench since this controller loaded.
     // Preserve existing, corrupt, or future-version records rather than overwriting.
     if(storage.getItem(key)!==null)return false;
     storage.setItem(key,JSON.stringify(next));
     if(storage.getItem(key)!==JSON.stringify(next))return false;
    }catch{return false;}
    saved=next;return true;
   }
  });
 }
 root.CityRoadBuilding=Object.freeze({create,VERSION,KEY,CRAFT_KEY});
})(typeof window==='undefined'?globalThis:window);
