/* Original, deterministic vertical geology for the same Meme City World V1.
 * No new universe, no server rewards, no replacement solo character save.
 * Browser-only solo mining uses a separate, validated sparse edit journal.
 */
'use strict';
(function(root){
 const C=root.MemeCityCore,F=root.CityFrontier;
 if(!C?.WORLD?.vertical||!F?.regions)throw Error('Canonical world and frontier must load before CityMining');
 const {minHeight,maxHeight,surface,stratumHeight}=C.WORLD.vertical;
 const TILE=32,MAX_EDITS=512,MAX_REGION_EDITS=96,VERSION=1;
 const KEY='offensive-meme-city-v1-mining-v1';
 const STRATA=Object.freeze([
  ['Topsoil and rubble',-8,'#9c8269',1],
  ['Sedimentary shelf',-16,'#8c857a',1],
  ['Slate and coal',-24,'#666c73',2],
  ['Copper seams',-32,'#937565',2],
  ['Ironstone',-40,'#68727b',3],
  ['Crystal and quartz',-48,'#686b8e',3],
  ['Deep ore',-56,'#605573',4],
  ['Unbreakable bedrock',-64,'#202733',Infinity]
 ].map(([name,z,color,hardness],index)=>Object.freeze({index,name,z,color,hardness,mineable:index<7})));
 if(STRATA.at(-1).z!==minHeight||STRATA[0].z!==surface-stratumHeight)
  throw Error('Mining layers do not match the world height bounds');
 const colors=Object.freeze({
  soil:'#978269',stone:'#777d7e',coal:'#383f4a',copper:'#c18a61',
  iron:'#9ca3a7',quartz:'#c5b7de',gold:'#d9b36d',crystal:'#8ebcd5',bedrock:'#222936'
 });
 const validZ=z=>Number.isInteger(z)&&z>=minHeight&&z<=maxHeight;
 const within=(r,ix,iy)=>r&&F.regionAt((ix+.5)*TILE,(iy+.5)*TILE)?.id===r.id;
 function hash(n){n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return((n^(n>>>16))>>>0)/4294967296;}
 function blockAt(ix,iy,layer){
  if(!Number.isInteger(ix)||!Number.isInteger(iy)||!Number.isInteger(layer)||layer<0||layer>=STRATA.length)return null;
  const region=F.regionAt((ix+.5)*TILE,(iy+.5)*TILE);
  if(!region)return null;
  if(layer===7)return Object.freeze({material:'bedrock',name:'Unbreakable bedrock',color:colors.bedrock,hardness:Infinity,z:-64,mineable:false,regionId:region.id});
  const roll=hash(F.SEED^region.seed^Math.imul(ix,73856093)^Math.imul(iy,19349663)^Math.imul(layer+1,83492791));
  let material=layer===0?'soil':'stone';
  // Material is derived from world seed, exact XY and vertical layer, never from saved claims.
  if(layer>=5&&roll>.974)material='crystal';
  else if(layer>=4&&roll>.963)material='gold';
  else if(layer>=3&&roll>.82)material='iron';
  else if(layer>=2&&roll>.76)material='copper';
  else if(layer>=1&&roll>.69)material='coal';
  else if(layer>=5&&roll>.64)material='quartz';
  return Object.freeze({material,name:material[0].toUpperCase()+material.slice(1),color:colors[material],
   hardness:STRATA[layer].hardness,z:STRATA[layer].z,mineable:true,regionId:region.id});
 }
 function location(actor){
  if(!actor||actor.room||!Number.isFinite(actor.x)||!Number.isFinite(actor.y))return null;
  const r=F.regionAt(actor.x,actor.y),ox=Math.floor(actor.x/TILE),oy=Math.floor(actor.y/TILE);
  return r&&within(r,ox,oy)?{region:r,ox,oy}:null;
 }
 function idFor(r,layer,ix,iy,ox,oy){return [r.id,layer,ix,iy,ox,oy].join(':');}
 function parse(id){
  if(typeof id!=='string'||id.length>95)return null;
  const a=id.split(':');if(a.length!==6)return null;
  const [rId,...rest]=a,n=rest.map(Number),r=F.byId.get(rId);
  if(!r||rest.some(s=>!Number.isSafeInteger(Number(s)))||n.some(x=>!Number.isSafeInteger(x)))return null;
  const [layer,ix,iy,ox,oy]=n;
  if(id!==idFor(r,layer,ix,iy,ox,oy)||layer<0||layer>=7||
   Math.abs(ix-ox)>2||Math.abs(iy-oy)>2||!within(r,ix,iy)||!within(r,ox,oy))return null;
  return {region:r,layer,ix,iy,ox,oy};
 }
 const geoKey=(r,layer,ix,iy)=>[r.id,layer,ix,iy].join(':');
 function opened(seen,r,layer,ix,iy){
  return seen.has(geoKey(r,layer,ix,iy));
 }
 function validateStep(o,seen){
  if(opened(seen,o.region,o.layer,o.ix,o.iy))return false;
  // A shaft can go deeper only if the same entrance column is excavated above.
  for(let i=0;i<o.layer;i++)if(!opened(seen,o.region,i,o.ox,o.oy))return false;
  if(o.layer>0&&(o.ix!==o.ox||o.iy!==o.oy)){
   // Tunnel horizontally from an already excavated tile at this depth.
   const adjacent=[[o.ix-1,o.iy],[o.ix+1,o.iy],[o.ix,o.iy-1],[o.ix,o.iy+1]];
   if(!adjacent.some(([x,y])=>opened(seen,o.region,o.layer,x,y)))return false;
  }
  return true;
 }
 function createStore(storage){
  const entries=[],mined=new Set(),totals=new Map(),regionCounts=new Map();
  let disabled=false,raw=null,surfaceCache=null;
  function apply(o,id){
   const block=blockAt(o.ix,o.iy,o.layer);
   mined.add(geoKey(o.region,o.layer,o.ix,o.iy));entries.push(id);surfaceCache=null;
   const material=block.material;totals.set(material,(totals.get(material)||0)+1);
   regionCounts.set(o.region.id,(regionCounts.get(o.region.id)||0)+1);
  }
  try{
   raw=storage?.getItem(KEY)??null;
   if(raw!==null){
    const saved=JSON.parse(raw);
    if(!saved||saved.version!==VERSION||saved.seed!==F.SEED||
       saved.minHeight!==minHeight||saved.maxHeight!==maxHeight||!Array.isArray(saved.blocks)||
       saved.blocks.length>MAX_EDITS)disabled=true;
    else for(const id of saved.blocks){
     const o=parse(id);
     if(!o||!validateStep(o,mined)||(regionCounts.get(o.region.id)||0)>=MAX_REGION_EDITS){disabled=true;break;}
     apply(o,id);
    }
   }
  }catch{disabled=true;}
  // Reject the *entire* journal, including any valid prefix. A corrupt tail
  // must never manufacture a partial material balance in the Gear panel.
  if(disabled){entries.length=0;mined.clear();totals.clear();regionCounts.clear();surfaceCache=null;}
  // Failed load can never be resumed or written over.
  function inspect(actor,dx=0,dy=0,layer=0){
   const at=location(actor);
   if(!at||!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)>2||Math.abs(dy)>2||
      !Number.isInteger(layer)||layer<0||layer>=STRATA.length)return null;
   const ix=at.ox+dx,iy=at.oy+dy;
   if(!within(at.region,ix,iy))return null;
   const block=blockAt(ix,iy,layer),removed=opened(mined,at.region,layer,ix,iy);
   return {...block,ix,iy,layer,mined:removed,accessible:!disabled&&block.mineable&&!removed&&
    validateStep({region:at.region,layer,ix,iy,ox:at.ox,oy:at.oy},mined)};
  }
  function mine(actor,dx,dy,layer){
   if(disabled)return {ok:false,reason:'Mining journal is incompatible or corrupted. No records were changed.'};
   const at=location(actor),block=inspect(actor,dx,dy,layer);
   if(!at||!block)return {ok:false,reason:'Mine only inside a walkable frontier biome, within two tiles of your position.'};
   if(!block.mineable)return {ok:false,reason:'Bedrock at -64 cannot be mined.'};
   if(block.mined)return {ok:false,reason:'This block has already been removed.'};
   if(!block.accessible)return {ok:false,reason:'First dig the entrance shaft and adjacent tunnels in the layers above.'};
   if(entries.length>=MAX_EDITS||(regionCounts.get(at.region.id)||0)>=MAX_REGION_EDITS)
    return {ok:false,reason:'Local mine excavation limit reached. Your existing mine is preserved.'};
   const id=idFor(at.region,layer,block.ix,block.iy,at.ox,at.oy);
   try{
    if(!storage||typeof storage.setItem!=='function'||(storage.getItem(KEY)??null)!==raw)
     return {ok:false,reason:'Your mining save changed in another tab or storage is unavailable.'};
    const encoded=JSON.stringify({version:VERSION,seed:F.SEED,minHeight,maxHeight,blocks:[...entries,id]});
    storage.setItem(KEY,encoded);raw=encoded;
    apply({region:at.region,layer,ix:block.ix,iy:block.iy},id);
    return {ok:true,material:block.material,name:block.name,depth:block.z,total:entries.length};
   }catch{return {ok:false,reason:'Storage quota exceeded or unavailable. The block was not mined.'};}
  }

  // Render only actual player-made entrances and exposed surface tiles.
  // Values are derived from the validated sparse journal; never trust an
  // arbitrary saved mineral balance or client-provided height.
  function surfaceOpenings(visible){
   if(disabled)return [];
   if(surfaceCache)return visible?surfaceCache.filter(h=>visible(h.x,h.y,h.w,h.h)):surfaceCache.slice();
   const shafts=new Map();
   for(const id of entries){
    const o=parse(id);if(!o||o.ix!==o.ox||o.iy!==o.oy)continue;
    const key=o.region.id+':'+o.ox+':'+o.oy;
    shafts.set(key,Math.min(shafts.get(key)??0,STRATA[o.layer].z));
   }
   const out=[];
   for(const id of entries){
    const o=parse(id);if(!o||o.layer!==0)continue;
    const x=o.ix*TILE,y=o.iy*TILE;
    if(visible&&!visible(x,y,TILE,TILE))continue;
    const shaft=o.ix===o.ox&&o.iy===o.oy;
    out.push(Object.freeze({x,y,w:TILE,h:TILE,shaft,
     depth:shaft?shafts.get(o.region.id+':'+o.ox+':'+o.oy):STRATA[0].z,
     regionId:o.region.id}));
   }
   surfaceCache=Object.freeze(out);
   return visible?out.filter(h=>visible(h.x,h.y,h.w,h.h)):out.slice();
  }
  return Object.freeze({
   key:KEY,disabled:()=>disabled,count:()=>entries.length,
   inventory:()=>Object.freeze(Object.fromEntries(totals)),
   inspect,mine,surfaceOpenings,entries:()=>entries.slice(),regionCount:r=>regionCounts.get(r)||0
  });
 }

 // A solo excavation session is an explicit player depth/position state, not a
 // mutation of the ground-plane engine or the protected Solo save. On exit the
 // avatar returns to its existing world location at surface z=0.
 function createExplorer(store,actor){
  const entry=location(actor);
  if(!store||store.disabled?.()||!entry)return null;
  const at={x:actor.x,y:actor.y};
  let layer=0,dx=0,dy=0;
  const pos=()=>Object.freeze({layer,dx,dy,x:(entry.ox+dx+.5)*TILE,
   y:(entry.oy+dy+.5)*TILE,z:layer===0?surface:STRATA[layer-1].z});
  const sample=(x,y,index)=>store.inspect(at,x,y,index);
  const canDescend=()=>dx===0&&dy===0&&layer<STRATA.length-1&&!!sample(0,0,layer)?.mined;
  const canAscend=()=>dx===0&&dy===0&&layer>0&&(layer===1||!!sample(0,0,layer-2)?.mined);
  const canMove=(mx,my)=>{
   if(layer===0||!Number.isInteger(mx)||!Number.isInteger(my)||Math.abs(mx)+Math.abs(my)!==1)return false;
   const nx=dx+mx,ny=dy+my;
   if(Math.abs(nx)>2||Math.abs(ny)>2)return false;
   return !!sample(nx,ny,layer-1)?.mined;
  };
  const canDig=(tx,ty)=>Number.isInteger(tx)&&Number.isInteger(ty)&&Math.abs(tx)<=2&&Math.abs(ty)<=2&&
   Math.abs(tx-dx)+Math.abs(ty-dy)<=1&&!!sample(tx,ty,layer)?.accessible;
  return Object.freeze({position:pos,canAscend,canDescend,canMove,canDig,
   move:(mx,my)=>{if(!canMove(mx,my))return false;dx+=mx;dy+=my;return true;},
   descend:()=>{if(!canDescend())return false;layer++;return true;},
   ascend:()=>{if(!canAscend())return false;layer--;return true;}
  });
 }
 root.CityMining=Object.freeze({TILE,VERSION,KEY,maxHeight,minHeight,surface,stratumHeight,STRATA,
  MAX_EDITS,MAX_REGION_EDITS,validZ,blockAt,location,createStore,createExplorer});
})(typeof window==='undefined'?globalThis:window);
