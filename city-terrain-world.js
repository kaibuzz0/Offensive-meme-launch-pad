/* Terrain-only seeded atlas for the ONE Meme City world.
 * Reuses the 132 names/material palettes from CityFrontier as data only;
 * none of its old fixed positions, streets, props or NPCs are imported.
 * Chunk baselines are deterministic; only visible chunks are cached.
 */
'use strict';
(function(root){
 const COLS=12,ROWS=11,CELL=112,LIMIT=64,VERSION=1;
 const rand32=(seed)=>{
  let state=seed>>>0;
  return ()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 };
 function createTerrain(seed, definitions){
  if(!root.CityWorldgen?.createWorld)throw Error('Seeded generator is required');
  if(!Array.isArray(definitions)||definitions.length!==132||new Set(definitions.map(b=>b.id)).size!==132)
   throw Error('Exactly 132 unique biome definitions are required');
  const base=root.CityWorldgen.createWorld(seed,{terrainOnly:true});
  const random=rand32(base.seedHash^0x56d28fc4);
  const biomes=definitions.map(b=>Object.freeze({
   id:b.id,name:b.name,group:b.group,material:b.material,
   hue:Number.isFinite(b.hue)?b.hue:100,
   sat:Number.isFinite(b.sat)?b.sat:40,
   light:Number.isFinite(b.light)?b.light:45
  }));
  // Seed-shuffle the unique biome definitions; a single naturalistic cluster
  // for every type is guaranteed within the starter atlas, not just possible.
  for(let i=biomes.length-1;i>0;i--){
   const j=Math.floor(random()*(i+1));
   [biomes[i],biomes[j]]=[biomes[j],biomes[i]];
  }
  const anchors=Object.freeze(biomes.map((b,i)=>Object.freeze({
   ...b,
   x:(i%COLS-(COLS-1)/2)*CELL+(random()-.5)*CELL*.24,
   y:(Math.floor(i/COLS)-(ROWS-1)/2)*CELL+(random()-.5)*CELL*.24
  })));
  const byId=new Map(anchors.map(a=>[a.id,a]));
  const cache=new Map();
  function biomeAt(x,y){
   if(!Number.isFinite(x)||!Number.isFinite(y))return null;
   const nx=Math.round(x),ny=Math.round(y),climate=base.climateAt(nx,ny);
   if(!climate)return null;
   // Bounded climate warp softens the stratified placement into irregular
   // regions while preserving coverage at all biome anchor points.
   const wx=x+(climate.moisture-.5)*26,wy=y+(climate.temperature-.5)*26;
   let best=null,distance=Infinity;
   for(const b of anchors){
    const dx=wx-b.x,dy=wy-b.y,d=dx*dx+dy*dy;
    if(d<distance){distance=d;best=b;}
   }
   return Object.freeze({...best,height:climate.height,
    temperature:climate.temperature,moisture:climate.moisture});
  }
  function chunkAt(cx,cy){
   if(!Number.isInteger(cx)||!Number.isInteger(cy)||Math.abs(cx)>1000000||Math.abs(cy)>1000000)return null;
   const key=cx+':'+cy;
   if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
   const raw=base.chunkAt(cx,cy);if(!raw)return null;
   const tiles=raw.tiles.map(tile=>{
    const b=biomeAt(tile.x,tile.y);
    return Object.freeze({x:tile.x,y:tile.y,height:tile.height,
     biome:b.id,material:b.material,hue:b.hue,sat:b.sat,light:b.light,
     road:false,settlementId:null});
   });
   const result=Object.freeze({id:'terrain:'+VERSION+':'+base.seedHash+':'+key,
    cx,cy,seed:base.seedHash,tiles:Object.freeze(tiles),
    structures:Object.freeze([]),sites:Object.freeze([])});
   cache.set(key,result);
   if(cache.size>LIMIT)cache.delete(cache.keys().next().value);
   return result;
  }
  const spawn=Object.freeze({x:Math.floor(random()*33)-16,
   y:Math.floor(random()*33)-16});
  return Object.freeze({
   seed:base.seed,seedHash:base.seedHash,version:VERSION,
   CHUNK_SIZE:base.CHUNK_SIZE,MIN_HEIGHT:base.MIN_HEIGHT,MAX_HEIGHT:base.MAX_HEIGHT,
   biomes:Object.freeze(biomes),anchors,biomeAt,chunkAt,
   blockAt:base.blockAt,spawnAt:()=>spawn,
   cacheSize:()=>cache.size,biomeById:id=>byId.get(id)||null
  });
 }
 root.CityTerrainWorld=Object.freeze({createTerrain,VERSION,COLS,ROWS,CELL,LIMIT});
})(typeof window==='undefined'?globalThis:window);
