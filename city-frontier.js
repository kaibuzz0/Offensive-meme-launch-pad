/* Additive, original JavaScript frontier inspired by bareiron/irongingot architecture.
 * Fixed seed + chunk-derived terrain + bounded LRU canvases + a versioned edit
 * journal. No GPL source imported; gameplay/physics remain in MemeCityCore.
 */
'use strict';
(function(root){
 const C=root.MemeCityCore,B=root.CityBiomes;
 if(!C?.WORLD||!B?.noise||C.WORLD.width!==24400||C.WORLD.height!==14400)
  throw Error('Center City frontier needs the expanded original world and CityBiomes');
 const BASE=11200,SIZE=1200,COLS=11,ROWS=12,SEED=0x43e7b621;
 const SAVE_KEY='offensive-meme-city-v1-frontier-journal';
 // Every entry names a genuinely different terrain: eleven local ecologies
 // within each of twelve major environments. Each owns its deterministic
 // palette, elevation, moisture, footing, foliage and survey description.
 const families=Object.freeze([
  ['evergreen','Evergreen Wilds',129,48,34,'forest soil',24,72,'pine,fern,stump','Evergreen canopy and deep humus',
   'Twilight Cedar|Cloudpine Vale|Needlefall Grove|Blackbark Hollow|Silver Fir Ridge|Moss Lanterns|Cold Spruce Reach|Copper Cone Forest|Oldroot Thicket|Fogbound Timber|Rainwood Sanctuary'],
  ['desert','Dune Sea',40,48,48,'sand',40,7,'cactus,scrub,shale','Wind-shaped sand and exposed dry rock',
   'Amber Dunes|Rustwind Basin|Citrine Expanse|Bleached Flats|Saffron Sands|Mirage Crossing|Scorpion Wash|Glasswind Wastes|Sunscorch Reach|Red Mesa Drifts|Oasis Rim'],
  ['tundra','Frozen North',207,31,67,'packed snow',-22,24,'ice,shale,scrub','Permafrost, ice crystals and fragile snow crust',
   'Frostbite Plain|White Howl|Blue Ice Shelf|Snowglint Meadow|Glacier Toe|Polar Lantern|Rime Hollow|Frozen Heath|Hoarfrost Valley|Nightwinter Basin|Winterglass Ridge'],
  ['wetland','River Marsh',161,40,33,'mud',18,95,'reed,fern,stump','Saturated reed beds and slow dark water',
   'Mistfen|Siltwater Pools|Heron Reach|Moorlight Bog|Whispering Reeds|Blackwater Slough|Peatroot Mire|Thornmarsh|Fogmoss Delta|Rushbank|Marshfire Hollow'],
  ['volcanic','Volcanic Field',6,51,27,'basalt',47,4,'magma,shale,boulder','Ash, cooled lava and hot fractured basalt',
   'Cinderfall|Obsidian Steps|Ember Crater|Charcoal Ridge|Sootspire|Flameglass Fields|Pyre Basin|Ashmouth|Lava Tooth|Brimstone Expanse|Smokewind Caldera'],
  ['alpine','High Altitudes',228,23,55,'shattered stone',-4,36,'boulder,shale,ice','Thin air, talus, steep exposed bedrock',
   'Eagle Crest|Cloudbreak Summit|Slatefinger|Granite Crown|Stonehorn Pass|Windknife Ridge|Skyreach Crags|High Scree|Blue Summit|Thunder Peak|Summit Garden'],
  ['tropical','Tropical Canopy',112,55,38,'jungle soil',31,97,'palm,fern,flowers','Humid canopy with dense fast-growing undergrowth',
   'Emerald Canopy|Monsoon Hollow|Palmglass Cove|Orchid Vale|Parrot Jungle|Banyan Depths|Warm Rain Forest|Vine Cathedral|Jade Thicket|Sunleaf Basin|Hummingbird Glade'],
  ['grassland','Open Grassland',86,37,48,'loam',17,54,'grass,flowers,scrub','Open waving grasses and wildflowers',
   'Golden Prairie|Foxglove Field|Tallgrass Reach|Bison Run|Windflower Meadow|Larkspur Steppe|Sunrise Pasture|Clover Crossing|Honeygrass|Buffalo Plain|Summergreen Expanse'],
  ['salt','Salt Expanse',50,25,72,'salt crust',32,1,'salt,shale,scrub','Cracked evaporite, pale salt and mineral pans',
   'Chalkbright Pan|White Salt Lake|Alabaster Basin|Pearl Flats|Mineral Mirror|Dry Tide|Ivory Expanse|Soda Bed|Gypsum Crossing|Glitter Crust|Saltwind Hollow'],
  ['crystal','Crystal Outcrop',275,42,43,'quartz scree',8,25,'crystal,boulder,shale','Glassy quartz and translucent mineral towers',
   'Amethyst Spine|Violet Prism|Rose Quartz Gorge|Azure Geode|Opal Steps|Moonstone Basin|Echo Crystal|Glitter Cavern Rim|Celestite Peaks|Prismatic Reach|Shimmering Scar'],
  ['fungal','Fungal Lowlands',287,37,30,'mycelium',22,88,'mushroom,fern,stump','Spore-rich fungal soil and enormous caps',
   'Sporewood|Glowcap Glade|Mycelial Mire|Ghostshroom Woods|Giant Toadstool|Lichen Cathedral|Puffball Flats|Mushroom Hollow|Violet Rot Forest|Nightcap Vale|Biolume Gardens'],
  ['ruins','Rustbelt Ruins',25,27,38,'rubble',29,13,'scrap,wreck,shale','Weathered scrap heaps and abandoned infrastructure',
   'Ironfall|Collapsed Works|Old Rail Yard|Rustwater|Cracked Foundry|Silent Refinery|Ashen Warehouse|Pipe Maze|Forgotten Depot|Concrete Maze|Wreckfield']
 ].map(([id,label,hue,sat,light,footing,temp,moisture,kinds,note,names])=>
  Object.freeze({id,label,hue,sat,light,footing,temp,moisture,kinds:Object.freeze(kinds.split(',')),note,
   names:Object.freeze(names.split('|'))})));
 if(families.length!==ROWS||families.some(f=>f.names.length!==COLS))throw Error('132 biome definitions required');
 const safeNum=n=>Number.isFinite(n);
 const h=(n)=>{n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return((n^(n>>>16))>>>0)/4294967296;};
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const color=(r,dl=0,ds=0)=>'hsl('+r.hue+' '+clamp(r.sat+ds,10,95)+'% '+clamp(r.light+dl,12,88)+'%)';
 const regions=Object.freeze(families.flatMap((f,row)=>f.names.map((name,col)=>{
  const x=BASE+col*SIZE+24,y=row*SIZE+24,id='frontier-'+f.id+'-'+(col+1);
  return Object.freeze({id,name,short:name,group:f.id,family:f.label,
   material:f.footing,footing:f.footing,temperature:f.temp+(col-5)*1.1,
   moisture:clamp(f.moisture+(col%5-2)*4,0,100),elevation:(row+col)%7,
   hue:(f.hue+col*3)%360,sat:f.sat+(col%3-1)*3,light:f.light+(col%5-2)*2,
   x,y,w:SIZE-48,h:SIZE-48,seed:(SEED^Math.imul(row+1,8839)^Math.imul(col+5,1619))>>>0,
   entry:Object.freeze({x:x+(SIZE-48)/2,y:y+(SIZE-48)/2})});
 })));
 const byId=new Map(regions.map(r=>[r.id,r]));
 const siteIndex=new Map();
 const sites=Object.freeze(regions.map(r=>{
  const f=families.find(f=>f.id===r.group);
  const s=Object.freeze({id:'frontier-survey:'+r.id,regionId:r.id,name:r.name+' survey',
   x:r.entry.x,y:r.entry.y,note:f.note+'. Conditions: '+r.temperature.toFixed(1)+'°C and '+r.moisture+'% relative moisture. Recorded for exploration only.'});
  siteIndex.set(r.id,s);return s;
 }));
 const outlines=new Map();
 function perimeter(r){
  if(outlines.has(r.id))return outlines.get(r.id);
  const p=[],n=9,L=r.x+28,R=r.x+r.w-28,T=r.y+28,D=r.y+r.h-28;
  for(let i=0;i<=n;i++){const x=L+(R-L)*i/n;p.push([x,T+B.noise(x/170,T/170,r.seed)*23]);}
  for(let i=1;i<=n;i++){const y=T+(D-T)*i/n;p.push([R+B.noise(R/170,y/170,r.seed)*23,y]);}
  for(let i=1;i<=n;i++){const x=R-(R-L)*i/n;p.push([x,D+B.noise(x/170,D/170,r.seed)*23]);}
  for(let i=1;i<n;i++){const y=D-(D-T)*i/n;p.push([L+B.noise(L/170,y/170,r.seed)*23,y]);}
  outlines.set(r.id,p);return p;
 }
 function contains(r,x,y){
  if(!r||x<r.x||x>=r.x+r.w||y<r.y||y>=r.y+r.h)return false;
  const pts=perimeter(r);let inside=false;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++){
   const a=pts[i],b=pts[j];
   if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }return inside;
 }
 function path(ctx,r,sx=1,sy=1){
  const pts=perimeter(r);ctx.beginPath();for(let i=0;i<pts.length;i++){
   if(i===0)ctx.moveTo(pts[i][0]*sx,pts[i][1]*sy);
   else ctx.lineTo(pts[i][0]*sx,pts[i][1]*sy);
  }ctx.closePath();
 }
 function regionAt(x,y){
  if(!safeNum(x)||!safeNum(y)||x<BASE||y<0)return null;
  const col=Math.floor((x-BASE)/SIZE),row=Math.floor(y/SIZE);
  if(col<0||col>=COLS||row<0||row>=ROWS)return null;
  const r=regions[row*COLS+col];return contains(r,x,y)?r:null;
 }
 function terrainAt(x,y){
  if(!safeNum(x)||!safeNum(y)||x<0||y<0||x>=C.WORLD.width||y>=C.WORLD.height)return null;
  const r=regionAt(x,y);if(!r)return null;
  return {id:r.id,regionId:r.id,family:r.group,material:r.material,footing:r.footing,
   roughness:B.noise(x/140,y/140,r.seed),temperature:r.temperature,moisture:r.moisture,
   walkable:true,buildable:false};
 }
 function nearbySite(p,radius=125){
  if(!p||p.room||!safeNum(p.x)||!safeNum(p.y)||!safeNum(radius)||radius<=0)return null;
  const r=regionAt(p.x,p.y),s=r&&siteIndex.get(r.id);
  return s&&Math.hypot(p.x-s.x,p.y-s.y)<=radius?s:null;
 }
 // Exactly twelve recyclable Canvas textures maximum: no unbounded map memory.
 const textures=new Map(),propsCache=new Map(),CACHE_LIMIT=12,PROP_LIMIT=16;
 function touch(cache,key,value,max){
  if(cache.has(key))cache.delete(key);
  cache.set(key,value);if(cache.size>max)cache.delete(cache.keys().next().value);
  return value;
 }
 function texture(r){
  const old=textures.get(r.id);if(old)return touch(textures,r.id,old,CACHE_LIMIT);
  if(typeof document==='undefined')return null;
  const cv=document.createElement('canvas');cv.width=cv.height=192;
  const g=cv.getContext('2d');if(!g)return null;
  g.fillStyle=color(r);g.fillRect(0,0,192,192);
  for(let i=0;i<95;i++){
   const x=h(r.seed+i*51)*192,y=h(r.seed+i*97+19)*192,
    k=B.noise(x/31,y/31,r.seed),sz=2+h(r.seed+i*17)*13;
   g.globalAlpha=.10+Math.abs(k)*.21;
   g.fillStyle=color(r,k>0?22:-19,k>0?10:-8);
   g.beginPath();g.ellipse(x,y,sz*(r.group==='salt'?1.8:1),sz*(r.group==='alpine'?.4:.8),h(i+r.seed)*Math.PI,0,Math.PI*2);g.fill();
  }
  g.globalAlpha=1;return touch(textures,r.id,cv,CACHE_LIMIT);
 }
 function visibleRegions(visible){return regions.filter(r=>!visible||visible(r.x,r.y,r.w,r.h));}
 function drawGround(ctx,visible){
  let drawn=0;for(const r of visibleRegions(visible)){
   const cv=texture(r);ctx.save();path(ctx,r);ctx.clip();
   if(cv)ctx.drawImage(cv,r.x,r.y,r.w,r.h);
   else{ctx.fillStyle=color(r);ctx.fillRect(r.x,r.y,r.w,r.h);}
   ctx.restore();drawn++;
  }return drawn;
 }
 function propsFor(r){
  if(propsCache.has(r.id))return touch(propsCache,r.id,propsCache.get(r.id),PROP_LIMIT);
  const types=families.find(f=>f.id===r.group).kinds,list=[];
  for(let i=0;i<24;i++){
   const x=r.x+80+h(r.seed+i*31+41)*(r.w-160),
    y=r.y+80+h(r.seed+i*67+93)*(r.h-160);
   if(Math.hypot(x-r.entry.x,y-r.entry.y)<160||!contains(r,x,y))continue;
   list.push(Object.freeze({x,y,kind:types[i%types.length],
    seed:r.seed+i,size:.7+h(r.seed+i*41)*.6,
    hue:r.hue,sat:r.sat,light:r.light}));
  }
  return touch(propsCache,r.id,Object.freeze(list),PROP_LIMIT);
 }
 function drawProp(ctx,p){
  ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.size,p.size);
  const c=(dl,ds)=>'hsl('+p.hue+' '+clamp(p.sat+(ds||0),8,90)+'% '+clamp(p.light+dl,10,90)+'%)';
  ctx.fillStyle='#07101c55';ctx.beginPath();ctx.ellipse(5,2,32,12,0,0,Math.PI*2);ctx.fill();
  const kind=p.kind;
  if(['pine','palm','stump','wreck','scrap','reed','cactus','mushroom'].includes(kind)){
   ctx.fillStyle=kind==='scrap'||kind==='wreck'?'#6e6760':'#5c4e3d';
   ctx.fillRect(-6,-44,12,47);
  }
  if(kind==='pine'||kind==='palm'){
   for(let i=0;i<3;i++){const y=-95+i*25,w=22+i*12;ctx.fillStyle=c(15+i*4,16);
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(-w,y+57);ctx.lineTo(w,y+57);ctx.closePath();ctx.fill();}
  }else if(kind==='cactus'){
   ctx.fillStyle=c(16,35);ctx.fillRect(-13,-85,26,85);ctx.fillRect(-32,-55,22,13);ctx.fillRect(10,-35,25,14);
  }else if(kind==='mushroom'){
   ctx.fillStyle='#e3c7b5';ctx.fillRect(-8,-60,16,62);ctx.fillStyle=c(28,24);
   ctx.beginPath();ctx.ellipse(0,-63,40,21,0,Math.PI,Math.PI*2);ctx.closePath();ctx.fill();
  }else if(kind==='crystal'||kind==='ice'||kind==='magma'){
   ctx.fillStyle=kind==='ice'?'#b5eaff':kind==='magma'?'#ed704e':c(28,25);
   ctx.beginPath();ctx.moveTo(-28,0);ctx.lineTo(-22,-45);ctx.lineTo(-2,-79);ctx.lineTo(15,-31);
   ctx.lineTo(34,-18);ctx.lineTo(25,0);ctx.closePath();ctx.fill();
   ctx.strokeStyle=kind==='magma'?'#ffe07f':'#d2f9ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-2,-79);ctx.lineTo(-3,-24);ctx.lineTo(25,0);ctx.stroke();
  }else if(['boulder','shale','salt'].includes(kind)){
   ctx.fillStyle=c(17,-12);ctx.beginPath();ctx.moveTo(-36,0);ctx.lineTo(-25,-32);ctx.lineTo(5,-48);ctx.lineTo(37,-11);ctx.lineTo(40,0);ctx.closePath();ctx.fill();
   ctx.fillStyle=c(29,-20);ctx.beginPath();ctx.moveTo(-25,-32);ctx.lineTo(5,-48);ctx.lineTo(9,-23);ctx.closePath();ctx.fill();
  }else if(kind==='wreck'||kind==='scrap'){
   ctx.fillStyle='#958378';ctx.fillRect(-35,-28,65,27);ctx.strokeStyle='#433d3d';ctx.lineWidth=7;
   ctx.beginPath();ctx.moveTo(-25,-22);ctx.lineTo(36,-52);ctx.stroke();
  }else{
   ctx.fillStyle=c(20,20);
   for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse((i-2)*11,-10-(i%2)*11,12,16,(i-2)*.2,0,Math.PI*2);ctx.fill();}
  }
  ctx.restore();
 }
 function scenery(ctx,visible){
  const layers=[];for(const r of visibleRegions(visible))for(const p of propsFor(r))
   if(!visible||visible(p.x-80,p.y-150,160,175))layers.push({y:p.y,draw:()=>drawProp(ctx,p)});
  return layers;
 }
 function drawSign(ctx,s){
  ctx.save();ctx.translate(s.x,s.y);
  ctx.fillStyle='#091a255e';ctx.beginPath();ctx.ellipse(0,0,52,15,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#788f8d';ctx.fillRect(-4,-80,8,81);
  ctx.fillStyle='#182935';ctx.fillRect(-74,-108,148,35);
  ctx.fillStyle='#c6d1e0';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.fillText('E / SURVEY',0,-86);
  ctx.restore();
 }
 function siteLayers(ctx,visible){
  const layers=[];for(const r of visibleRegions(visible)){
   const s=siteIndex.get(r.id);
   if(!visible||visible(s.x-80,s.y-125,160,150))layers.push({y:s.y,draw:()=>drawSign(ctx,s)});
  }return layers;
 }
 function drawMap(ctx,sx,sy){
  for(const r of regions){ctx.fillStyle=color(r);path(ctx,r,sx,sy);ctx.fill();}
  // Colored group labels once per row; 132 tiny individual captions would
  // completely obscure the destination markers on a mobile world map.
  ctx.fillStyle='#f3f6f2';ctx.font='bold 9px Arial';ctx.textAlign='left';
  for(let i=0;i<ROWS;i++)ctx.fillText(families[i].label,(BASE+95)*sx,(i*SIZE+130)*sy);
 }
 function createJournal(storage){
  let disabled=false,lastRaw=null;const seen=new Set();
  try{
   const raw=storage?.getItem(SAVE_KEY);
   lastRaw=raw??null;
   if(raw!==null&&raw!==undefined){
    const obj=JSON.parse(raw);
    if(!obj||obj.version!==1||obj.seed!==SEED||!Array.isArray(obj.visited)||obj.visited.length>regions.length
       ||new Set(obj.visited).size!==obj.visited.length
       ||obj.visited.some(id=>typeof id!=='string'||!byId.has(id)))disabled=true;
    else for(const id of obj.visited)seen.add(id);
   }
  }catch{disabled=true;}
  return Object.freeze({
   key:SAVE_KEY,disabled:()=>disabled,has:id=>seen.has(id),count:()=>seen.size,
   list:()=>Array.from(seen),
   discover:id=>{
    if(disabled||!byId.has(id)||seen.has(id))return false;
    try{if(!storage||typeof storage.setItem!=='function')return false;
     // Fail closed if another tab wrote a newer journal; never clobber it.
     if((storage.getItem(SAVE_KEY)??null)!==lastRaw)return false;
     const next=Array.from(seen);next.push(id);
     const encoded=JSON.stringify({version:1,seed:SEED,visited:next});
     storage.setItem(SAVE_KEY,encoded);lastRaw=encoded;
     seen.add(id);return true;
    }catch{return false;}
   }
  });
 }
 root.CityFrontier=Object.freeze({BASE,SIZE,COLS,ROWS,SEED,SAVE_KEY,regions,families,sites,
  byId,regionAt,terrainAt,nearbySite,perimeter,propsFor,drawGround,scenery,siteLayers,
  drawMap,createJournal,cacheStats:()=>({textures:textures.size,props:propsCache.size})});
})(typeof window==='undefined'?globalThis:window);
