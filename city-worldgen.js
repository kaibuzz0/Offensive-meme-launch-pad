/* Meme City: a seeded, seamless procedural-world generation foundation.
 * Fresh worlds are derived from a world seed, never from a static map layout.
 * Pure generation only. Does not load, migrate, or overwrite existing V1 saves.
 * Coordinates are signed 32-bit tile coordinates; the world is chunk-addressed.
 * There is no Math.random, network fetch, or dependency on legacy city geometry.
 */
'use strict';
(function(root){
 const CHUNK_SIZE=16,TILE_SIZE=32,MIN_HEIGHT=-64,MAX_HEIGHT=256,STEP=8;
 const SETTLEMENT_CELL=96,MAX_SETTLEMENT_RADIUS=28;
 const BIOMES=Object.freeze({
  ocean:{surface:'sand',tint:'#355a74',vegetation:'kelp'},
  coast:{surface:'sand',tint:'#d5c593',vegetation:'grass'},
  evergreen:{surface:'forest-soil',tint:'#417b58',vegetation:'pine'},
  desert:{surface:'sand',tint:'#c7a66a',vegetation:'cactus'},
  tundra:{surface:'snow',tint:'#b7c8d3',vegetation:'spruce'},
  wetland:{surface:'mud',tint:'#557963',vegetation:'reeds'},
  volcanic:{surface:'basalt',tint:'#74534a',vegetation:'ash'},
  alpine:{surface:'shale',tint:'#89939a',vegetation:'rock'},
  tropical:{surface:'jungle-soil',tint:'#2d8c5d',vegetation:'palm'},
  grassland:{surface:'loam',tint:'#91a866',vegetation:'grass'},
  salt:{surface:'salt',tint:'#d6d2b5',vegetation:'scrub'},
  crystal:{surface:'quartz',tint:'#ab92c5',vegetation:'crystals'},
  fungal:{surface:'mycelium',tint:'#8f6ba1',vegetation:'mushrooms'},
  ruins:{surface:'rubble',tint:'#7c776c',vegetation:'scrap'}
 });
 const SETTLEMENT_TYPES=Object.freeze(['village','town','city']);
 const PREFIX=Object.freeze(['Ash','Brine','Cedar','Dawn','Ember','Fern','Glen','Iron','Juniper','Moss','Oak','River','Silver','Stone','Thorn','Willow']);
 const SUFFIX=Object.freeze(['brook','cross','fall','ford','haven','hollow','keep','meadow','reach','rest','ridge','stead','vale','watch','wick','wood']);
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
 const fade=t=>t*t*(3-2*t);
 const lerp=(a,b,t)=>a+(b-a)*t;
 const finiteTile=n=>Number.isSafeInteger(n)&&n>=-2147483648&&n<=2147483647;
 function hashString(value){
  const s=String(value),chars=Array.from(s);
  let h=2166136261;
  for(const c of chars){h^=c.codePointAt(0);h=Math.imul(h,16777619);}
  return h>>>0;
 }
 function mix(seed,x,y,z=0){
  let h=(seed^Math.imul(x|0,0x9e3779b1)^Math.imul(y|0,0x85ebca77)^Math.imul(z|0,0xc2b2ae3d))|0;
  h=Math.imul(h^(h>>>16),0x7feb352d);
  h=Math.imul(h^(h>>>15),0x846ca68b);
  return (h^(h>>>16))>>>0;
 }
 const unit=(seed,x,y,z=0)=>mix(seed,x,y,z)/4294967296;
 function valueNoise2(seed,x,y){
  const ix=Math.floor(x),iy=Math.floor(y),fx=fade(x-ix),fy=fade(y-iy);
  return lerp(lerp(unit(seed,ix,iy)*2-1,unit(seed,ix+1,iy)*2-1,fx),
   lerp(unit(seed,ix,iy+1)*2-1,unit(seed,ix+1,iy+1)*2-1,fx),fy);
 }
 function valueNoise3(seed,x,y,z){
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),
   fx=fade(x-ix),fy=fade(y-iy),fz=fade(z-iz);
  const plane=k=>lerp(
   lerp(unit(seed,ix,iy,k)*2-1,unit(seed,ix+1,iy,k)*2-1,fx),
   lerp(unit(seed,ix,iy+1,k)*2-1,unit(seed,ix+1,iy+1,k)*2-1,fx),fy);
  return lerp(plane(iz),plane(iz+1),fz);
 }
 function fbm(seed,x,y,octaves=4){
  let total=0,amplitude=1,frequency=1,norm=0;
  for(let i=0;i<octaves;i++){
   total+=amplitude*valueNoise2(seed+i*0x9e3779b1,x*frequency,y*frequency);
   norm+=amplitude;amplitude*=.5;frequency*=2;
  }
  return total/norm;
 }
 const ordered=(a,b)=>a.id.localeCompare(b.id);
 function createWorld(seed,options={}){
  const terrainOnly=options?.terrainOnly===true;
  if(typeof seed!=='string'&&!(typeof seed==='number'&&Number.isSafeInteger(seed)))
   throw Error('Provide a stable string or safe integer world seed');
  if(String(seed).length>128)throw Error('World seed is too long');
  const numericSeed=hashString(seed);
  // Independent noise domains avoid fixed environmental rows or fixed city slots.
  const salt=n=>mix(numericSeed,n,0,0);
  const heightSeed=salt(1),tempSeed=salt(2),rainSeed=salt(3),
   weirdSeed=salt(4),warpSeed=salt(5),caveSeed=salt(6),oreSeed=salt(7),
   sitesSeed=salt(8),styleSeed=salt(9);
  function climateAt(x,y){
   if(!finiteTile(x)||!finiteTile(y))return null;
   const wx=fbm(warpSeed,x/230,y/230,3)*33,
    wy=fbm(warpSeed^0x56ff0021,(x+500)/230,(y-500)/230,3)*33;
   const u=x+wx,v=y+wy;
   const rough=fbm(heightSeed,u/160,v/160,5),
    peaks=Math.abs(fbm(heightSeed^0x6f29acb1,u/56,v/56,3)),
    elevation=clamp(Math.round((36+rough*82+peaks*30)/STEP)*STEP,0,MAX_HEIGHT-STEP);
   const temperature=clamp(.5+fbm(tempSeed,u/175,v/175,4)*.75-elevation/450,0,1);
   const moisture=clamp(.5+fbm(rainSeed,(u+177)/153,(v-340)/153,4)*.86,0,1);
   const anomaly=clamp(.5+fbm(weirdSeed,u/145,v/145,3)*.8,0,1);
   return {height:elevation,temperature,moisture,anomaly};
  }
  function biomeAt(x,y){
   const c=climateAt(x,y);
   if(!c)return null;
   const {height:h,temperature:t,moisture:m,anomaly:a}=c;
   // Classification is based on smooth fields, so regions grow naturally
   // across chunk boundaries; there is no predefined 132-cell biome array.
   let id;
   if(h<STEP)id='ocean';
   else if(h<2*STEP&&m>.42)id='coast';
   else if(h>120)id='alpine';
   else if(a>.79&&h>40)id=t>.57?'volcanic':'crystal';
   else if(a<.19&&m>.56)id='fungal';
   else if(a<.21&&m<.35)id='ruins';
   else if(t<.28)id='tundra';
   else if(t>.69&&m<.36)id='desert';
   else if(m>.77&&h<56)id='wetland';
   else if(t>.61&&m>.6)id='tropical';
   else if(m<.28&&t>.39)id='salt';
   else if(m>.5)id='evergreen';
   else id='grassland';
   return Object.freeze({id,...BIOMES[id],...c});
  }
  function settlementCell(gx,gy){
   if(!finiteTile(gx)||!finiteTile(gy))return null;
   // One deterministic candidate per coarse cell, naturally sparse.
   if(unit(sitesSeed,gx,gy,1)>.64)return null;
   const x=gx*SETTLEMENT_CELL+48+Math.floor((unit(sitesSeed,gx,gy,2)-.5)*42);
   const y=gy*SETTLEMENT_CELL+48+Math.floor((unit(sitesSeed,gx,gy,3)-.5)*42);
   const b=biomeAt(x,y);
   if(!b||['ocean','volcanic','alpine','wetland'].includes(b.id)||b.height<STEP*2)return null;
   const slope=Math.max(
    Math.abs(b.height-climateAt(x+8,y).height),
    Math.abs(b.height-climateAt(x,y+8).height));
   if(slope>40)return null;
   const kindRoll=unit(sitesSeed,gx,gy,4);
   const type=kindRoll>.87?'city':kindRoll>.62?'town':'village';
   const radius=type==='city'?MAX_SETTLEMENT_RADIUS:type==='town'?18:11;
   const p=PREFIX[Math.floor(unit(sitesSeed,gx,gy,5)*PREFIX.length)];
   const suffix=SUFFIX[Math.floor(unit(sitesSeed,gx,gy,6)*SUFFIX.length)];
   return Object.freeze({id:'settlement:'+numericSeed.toString(16)+':'+gx+':'+gy,
    type,name:p+suffix,x,y,radius,biome:b.id});
  }
  function settlementsNear(x,y,radius=0){
   if(!finiteTile(x)||!finiteTile(y)||!Number.isFinite(radius)||radius<0||radius>1024)return Object.freeze([]);
   const minX=Math.floor((x-radius-MAX_SETTLEMENT_RADIUS)/SETTLEMENT_CELL),
    maxX=Math.floor((x+radius+MAX_SETTLEMENT_RADIUS)/SETTLEMENT_CELL),
    minY=Math.floor((y-radius-MAX_SETTLEMENT_RADIUS)/SETTLEMENT_CELL),
    maxY=Math.floor((y+radius+MAX_SETTLEMENT_RADIUS)/SETTLEMENT_CELL);
   const result=[];
   for(let gy=minY;gy<=maxY;gy++)for(let gx=minX;gx<=maxX;gx++){
    const site=settlementCell(gx,gy);
    if(site&&Math.hypot(x-site.x,y-site.y)<=site.radius+radius)result.push(site);
   }
   return Object.freeze(result.sort(ordered));
  }
  function siteAt(x,y,candidates){
   const sites=candidates||settlementsNear(x,y);
   for(const site of sites){
    if(Math.hypot(x-site.x,y-site.y)<=site.radius)return site;
   }
   return null;
  }
  function isRoad(x,y,site){
   if(!site||!finiteTile(x)||!finiteTile(y))return false;
   const dx=x-site.x,dy=y-site.y;
   if(Math.hypot(dx,dy)>site.radius)return false;
   // Each settlement has seed-relative, continuous through-roads. Village
   // gets one crossing; towns/cities receive more streets on a stable grid.
   if(Math.abs(dx)<=1||Math.abs(dy)<=1)return true;
   const cell=site.type==='city'?7:site.type==='town'?9:0;
   return !!cell&&(Math.abs(((dx%cell)+cell)%cell)<=1||
    Math.abs(((dy%cell)+cell)%cell)<=1);
  }
  function buildingsFor(site){
   if(!site)return Object.freeze([]);
   const buildings=[],max=Math.ceil(site.radius/6);
   const [sx,sy]=site.id.split(':').slice(-2).map(Number);
   for(let gy=-max;gy<=max;gy++)for(let gx=-max;gx<=max;gx++){
    const centerX=site.x+gx*6+Math.floor((unit(styleSeed,sx+gx,sy+gy,1)-.5)*2),
     centerY=site.y+gy*6+Math.floor((unit(styleSeed,sx+gx,sy+gy,2)-.5)*2);
    if(Math.hypot(centerX-site.x,centerY-site.y)>site.radius-4||
       Math.abs(centerX-site.x)<3||Math.abs(centerY-site.y)<3||
       unit(styleSeed,sx+gx,sy+gy,3)<.22)continue;
    const width=2+Math.floor(unit(styleSeed,sx+gx,sy+gy,4)*2);
    const depth=2+Math.floor(unit(styleSeed,sx+gx,sy+gy,5)*2);
    const role=unit(styleSeed,sx+gx,sy+gy,6);
    const kind=role>.87?'market':role>.75?'workshop':role>.66?'inn':role>.56?'farm':'home';
    buildings.push(Object.freeze({id:site.id+':building:'+gx+':'+gy,settlementId:site.id,
     x:centerX-Math.floor(width/2),y:centerY-Math.floor(depth/2),
     w:width,h:depth,kind,stories:site.type==='city'?1+Math.floor(unit(styleSeed,sx+gx,sy+gy,7)*4):1}));
   }
   return Object.freeze(buildings.sort(ordered));
  }
  function spawnAt(){
   if(terrainOnly){
    const x=Math.floor(unit(numericSeed,1,7)*33)-16;
    const y=Math.floor(unit(numericSeed,2,9)*33)-16;
    return Object.freeze({x,y,z:biomeAt(x,y).height+STEP,seedHash:numericSeed});
   }
   // A new world begins at a seed-selected safe town/village crossing; no
   // hard-coded fortress, old saved coordinates, or fixed tutorial town.
   const candidates=[];
   for(let gy=-4;gy<=4;gy++)for(let gx=-4;gx<=4;gx++){
    const site=settlementCell(gx,gy);
    if(site)candidates.push(site);
   }
   candidates.sort((a,b)=>Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y)||ordered(a,b));
   const choice=candidates[0];
   if(!choice)throw Error('No safe settlement spawn for this world seed');
   const ground=biomeAt(choice.x,choice.y);
   return Object.freeze({
    x:choice.x,y:choice.y,z:ground.height+STEP,
    settlementId:choice.id,settlementName:choice.name,seedHash:numericSeed
   });
  }
  function chunkAt(cx,cy){
   if(!finiteTile(cx)||!finiteTile(cy)||Math.abs(cx)>1000000||Math.abs(cy)>1000000)return null;
   const left=cx*CHUNK_SIZE,top=cy*CHUNK_SIZE;
   const centerX=left+CHUNK_SIZE/2,centerY=top+CHUNK_SIZE/2;
   const sites=terrainOnly?Object.freeze([]):settlementsNear(centerX,centerY,CHUNK_SIZE*1.1);
   const surface=[];
   for(let dy=0;dy<CHUNK_SIZE;dy++)for(let dx=0;dx<CHUNK_SIZE;dx++){
    const x=left+dx,y=top+dy,b=biomeAt(x,y),site=siteAt(x,y,sites);
    const road=!terrainOnly&&isRoad(x,y,site);
    surface.push(Object.freeze({x,y,height:b.height,biome:b.id,
     material:road?'packed-road':b.surface,road,settlementId:site?.id||null}));
   }
   const structures=(terrainOnly?[]:sites.flatMap(s=>buildingsFor(s))).filter(p=>
    p.x<left+CHUNK_SIZE&&p.x+p.w>left&&p.y<top+CHUNK_SIZE&&p.y+p.h>top);
   const uniq=[...new Map(structures.map(x=>[x.id,x])).values()].sort(ordered);
   return Object.freeze({id:'chunk:'+numericSeed.toString(16)+':'+cx+':'+cy,
    cx,cy,seed:numericSeed,tiles:Object.freeze(surface),
    sites,structures:Object.freeze(uniq)});
  }
  function blockAt(x,y,z){
   if(!finiteTile(x)||!finiteTile(y)||!Number.isInteger(z)||z<MIN_HEIGHT||z>MAX_HEIGHT||z%STEP!==0)return null;
   const b=biomeAt(x,y),depth=b.height-z;
   if(z===MIN_HEIGHT)return Object.freeze({x,y,z,material:'bedrock',solid:true,mineable:false});
   if(z>b.height)return Object.freeze({x,y,z,material:'air',solid:false,mineable:false});
   // Caves must vary across XYZ and cross chunk boundaries with no seams.
   const cavern=depth>=24&&valueNoise3(caveSeed,x/21,y/21,z/20)>.43;
   if(cavern)return Object.freeze({x,y,z,material:'air',solid:false,mineable:false,cave:true});
   const mineral=unit(oreSeed,x,y,z);
   let material=depth<16?b.surface:depth<48?'stone':'deepstone';
   if(depth>=24&&mineral>.969)material=depth>72?'crystal':'copper';
   else if(depth>=40&&mineral>.934)material=depth>96?'gold':'iron';
   else if(depth>=16&&mineral>.91)material='coal';
   return Object.freeze({x,y,z,material,solid:true,mineable:true});
  }
  function sliceAt(cx,cy,z){
   if(!finiteTile(cx)||!finiteTile(cy)||!Number.isInteger(z)||z%STEP||z<MIN_HEIGHT||z>MAX_HEIGHT)return null;
   const tiles=[];
   for(let dy=0;dy<CHUNK_SIZE;dy++)for(let dx=0;dx<CHUNK_SIZE;dx++){
    const b=blockAt(cx*CHUNK_SIZE+dx,cy*CHUNK_SIZE+dy,z);
    if(!b)return null;
    tiles.push(b);
   }
   return Object.freeze({id:'slice:'+numericSeed.toString(16)+':'+cx+':'+cy+':'+z,
    cx,cy,z,tiles:Object.freeze(tiles)});
  }
  return Object.freeze({
   seed:String(seed),seedHash:numericSeed,terrainOnly,CHUNK_SIZE,TILE_SIZE,MIN_HEIGHT,MAX_HEIGHT,STEP,
   BIOMES,SETTLEMENT_TYPES,climateAt,biomeAt,settlementCell,settlementsNear,
   spawnAt,chunkAt,blockAt,sliceAt
  });
 }
 root.CityWorldgen=Object.freeze({createWorld,BIOMES,CHUNK_SIZE,TILE_SIZE,MIN_HEIGHT,MAX_HEIGHT,STEP});
})(typeof window==='undefined'?globalThis:window);
