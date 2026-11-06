/* Meme City voxel landscape — original seed-stable, no external assets.
 * Every terrain tile is a 0.25m cube (quarter of a standard 1m voxel edge).
 * Height, water, caves and flora share exactly the same signed X/Z coordinates.
 * Pure data, independent of DOM/WebGL, legacy gameplay and wallet state.
 */
'use strict';
(function(root){
 const VOXEL_METERS=.25,PLAYER_HEIGHT=7.2,EYE_HEIGHT=6.4;
 const MIN_HEIGHT=-256,MAX_HEIGHT=2048,SEA_LEVEL=112,CHUNK_SIZE=16;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),fade=t=>t*t*(3-2*t);
 const lerp=(a,b,t)=>a+(b-a)*t;
 function hash(seed,x,y,z=0){
  let h=(seed^Math.imul(x|0,0x9e3779b1)^Math.imul(y|0,0x85ebca77)^Math.imul(z|0,0xc2b2ae3d))|0;
  h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);
  return (h^(h>>>16))>>>0;
 }
 function random(seed,x,y,z=0){return hash(seed,x,y,z)/4294967296;}
 function noise2(seed,x,z){
  const ix=Math.floor(x),iz=Math.floor(z),tx=fade(x-ix),tz=fade(z-iz);
  const n=(a,b)=>random(seed,a,b)*2-1;
  return lerp(lerp(n(ix,iz),n(ix+1,iz),tx),lerp(n(ix,iz+1),n(ix+1,iz+1),tx),tz);
 }
 function noise3(seed,x,y,z){
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
  const tx=fade(x-ix),ty=fade(y-iy),tz=fade(z-iz);
  const n=(a,b,c)=>random(seed,a,b,c)*2-1;
  const a=lerp(lerp(n(ix,iy,iz),n(ix+1,iy,iz),tx),lerp(n(ix,iy+1,iz),n(ix+1,iy+1,iz),tx),ty);
  const b=lerp(lerp(n(ix,iy,iz+1),n(ix+1,iy,iz+1),tx),lerp(n(ix,iy+1,iz+1),n(ix+1,iy+1,iz+1),tx),ty);
  return lerp(a,b,tz);
 }
 function fbm(seed,x,z,octaves=4){
  let sum=0,amp=1,total=0;
  for(let i=0;i<octaves;i++){sum+=noise2(seed+i*13007,x,z)*amp;total+=amp; amp*=.5;x*=2;z*=2;}
  return sum/total;
 }
 function createVoxelWorld(atlas){
  if(!atlas?.seedHash||typeof atlas.biomeAt!=='function')throw Error('Seeded 132-biome atlas required');
  const seed=atlas.seedHash;
  const elevationSeed=hash(seed,9,77),riverSeed=hash(seed,10,78),
        detailSeed=hash(seed,11,79),caveSeed=hash(seed,12,80),
        plantSeed=hash(seed,13,81),sinkSeed=hash(seed,14,82);
  // Store sampled columns only. A bounded cache keeps traversal safe on low-RAM phones.
  const cache=new Map(),CACHE_LIMIT=22528;
  const MOUTH_CELL=112;
  // Mouth centers always sit >=16 voxels inside their 112-voxel cell,
  // so a single O(1) cell lookup replaces searching nine neighbors/tile.
  function caveMouthAt(x,z){
   if(!Number.isSafeInteger(x)||!Number.isSafeInteger(z))return null;
   const cx=Math.floor(x/MOUTH_CELL),cz=Math.floor(z/MOUTH_CELL);
   if(random(sinkSeed^0x4caf,cx,cz,9)<.79)return null;
   const mx=cx*MOUTH_CELL+16+Math.floor(random(sinkSeed,cx,cz,5)*(MOUTH_CELL-32));
   const mz=cz*MOUTH_CELL+16+Math.floor(random(sinkSeed,cx,cz,6)*(MOUTH_CELL-32));
   const radius=3+random(sinkSeed,cx,cz,7)*2.2;
   const distance=Math.hypot(x+.5-mx,z+.5-mz);
   if(distance>=radius+3)return null;
   const cut=Math.round(23*Math.max(0,1-distance/(radius+2)));
   return Object.freeze({id:cx+':'+cz,x:mx,z:mz,radius,cut,inside:distance<radius});
  }
  function surfaceMaterial(group,h,slope,wet){
   if(wet&&h<=SEA_LEVEL+5)return 'shore';
   if(h>SEA_LEVEL+410)return 'snow';
   if(slope>9)return group==='volcanic'?'basalt':'cliff';
   if(group==='volcanic')return 'basalt';
   if(group==='alpine'||group==='crystal')return 'stone';
   if(group==='tundra')return 'snow';
   if(group==='desert'||group==='salt')return 'sand';
   if(group==='wetland')return 'mud';
   if(group==='fungal')return 'mycelium';
   return 'soil';
  }
  function rawColumn(x,z){
   const biome=atlas.biomeAt(x,z);
   const group=biome.group;
   const continent=fbm(elevationSeed,x/420,z/420,5);
   const hills=fbm(detailSeed,x/86,z/86,4);
   const pebbles=fbm(detailSeed^0x3ac1,x/19,z/19,3);
   const ridge=Math.pow(1-Math.abs(noise2(elevationSeed^0x5d11,x/118,z/118)),2);
   let height=122+continent*180+hills*54+pebbles*12;
   if(group==='alpine')height+=ridge*550+110+Math.abs(pebbles)*80;
   else if(group==='volcanic')height+=ridge*290+48;
   else if(group==='crystal')height+=ridge*195+28;
   else if(group==='tundra')height+=ridge*90;
   else if(group==='wetland')height=112+continent*38+hills*9+pebbles*4;
   else if(group==='salt')height=119+continent*47+hills*14;
   else if(group==='grassland')height=140+continent*70+hills*28+pebbles*5;
   const riverField=Math.abs(noise2(riverSeed,x/164,z/164)+.35*noise2(riverSeed^0x5418,x/48,z/48));
   const river=riverField<.10;
   if(river)height-=(.10-riverField)*800;
   // Independent seed-positioned sinkholes expose ravines; the underground
   // cave test is 3D, but tunnel exploration awaits voxel collision/mining.
   const gx=Math.floor(x/88),gz=Math.floor(z/88);
   const sx=gx*88+18+Math.floor(random(sinkSeed,gx,gz,1)*51);
   const sz=gz*88+18+Math.floor(random(sinkSeed,gx,gz,2)*51);
   const sinkAllowed=random(sinkSeed,gx,gz,3)>.79;
   const dist=Math.hypot(x-sx,z-sz);
   const sinkhole=sinkAllowed&&dist<6;
   if(sinkhole)height-=Math.max(0,6-dist)*6.5;
   const mouth=caveMouthAt(x,z);
   const cut=mouth?.cut||0;
   const h=clamp(Math.round(height-cut),6,MAX_HEIGHT-8);
   const water=h<SEA_LEVEL;
   // Lightweight slope cue calculated from coherent nearby noise only;
   // this is not a recursive surfaceAt call.
   const gradient=Math.abs(pebbles)*4+Math.abs(hills)*8+ridge*(group==='alpine'?17:5);
   const wet=water||river||Math.abs(h-SEA_LEVEL)<=4;
   const material=mouth?.inside?'cave-rock':surfaceMaterial(group,h,gradient,wet);
   return Object.freeze({x,z,height:h,water,river,waterLevel:water?SEA_LEVEL:null,
    sinkhole:sinkhole||!!mouth?.inside,mouth:!!mouth?.inside,
    mouthId:mouth?.id||null,mouthDepth:cut,material,
    slope:Math.round(gradient*10)/10,
    biomeId:biome.id,biomeName:biome.name,group,
    hue:biome.hue,sat:biome.sat,light:biome.light,
    moisture:biome.moisture,temperature:biome.temperature});
  }
  function surfaceAt(x,z){
   if(!Number.isSafeInteger(x)||!Number.isSafeInteger(z)||Math.abs(x)>1000000||Math.abs(z)>1000000)return null;
   const key=x+','+z;
   if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
   const value=rawColumn(x,z);
   cache.set(key,value);if(cache.size>CACHE_LIMIT)cache.delete(cache.keys().next().value);
   return value;
  }
  function caveAt(x,y,z){
   if(!Number.isInteger(y)||y<MIN_HEIGHT||y>MAX_HEIGHT)return false;
   const col=surfaceAt(x,z);
   if(!col||y>col.height-5||y<MIN_HEIGHT+4)return false;
   const large=noise3(caveSeed,x/21,y/14,z/21);
   const narrow=noise3(caveSeed^0x4441,x/13,y/17,z/13);
   return large>.25&&narrow>-.22;
  }
  function blockAt(x,y,z){
   if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y)||!Number.isSafeInteger(z)||y<MIN_HEIGHT||y>MAX_HEIGHT)return null;
   const col=surfaceAt(x,z);if(!col)return null;
   if(y===MIN_HEIGHT)return Object.freeze({material:'bedrock',solid:true,mineable:false});
   if(y>col.height)return Object.freeze({material:y<=SEA_LEVEL&&col.water?'water':'air',solid:false,mineable:false});
   if(caveAt(x,y,z))return Object.freeze({material:'air',solid:false,mineable:false,cave:true});
   const depth=col.height-y;
   const mineral=random(detailSeed,x,z,y);
   let material=depth===0?col.material:
       depth<5?'dirt':depth<48?'stone':'deepstone';
   if(depth>12&&mineral>.989)material='crystal-ore';
   else if(depth>20&&mineral>.974)material='iron-ore';
   return Object.freeze({material,solid:true,mineable:true});
  }
  function featureAt(x,z){
   const c=surfaceAt(x,z);if(!c||c.water||c.mouth||c.slope>18||c.river&&c.height<SEA_LEVEL+2)return null;
   const r=random(plantSeed,x,z),r2=random(plantSeed^0x91a3,x,z);
   const g=c.group;
   const forest=g==='evergreen'||g==='tropical'||g==='fungal';
   const treeRate=forest?(g==='tropical'?.085:g==='fungal'?.075:.080):g==='grassland'?.029:g==='wetland'?.024:.005;
   if(r<treeRate){
    const type=g==='desert'?'cactus':g==='fungal'?'mushroom':g==='tropical'?'palm':g==='tundra'||g==='evergreen'?'pine':'tree';
    return Object.freeze({type,height:7+Math.floor(r2*9),color:r2});
   }
   if(r<treeRate+(g==='desert'?.025:g==='grassland'?.23:forest?.19:.095)){
    const type=g==='crystal'?'crystal':g==='volcanic'||g==='alpine'?'rock':
      g==='desert'||g==='salt'?'shrub':g==='wetland'?'reed':
      g==='fungal'?'mushroom':r2<.21?'flower':'grass';
    return Object.freeze({type,height:1+Math.floor(r2*4),color:r2});
   }
   return null;
  }
  function chunkAt(cx,cz){
   if(!Number.isSafeInteger(cx)||!Number.isSafeInteger(cz)||Math.abs(cx)>62500||Math.abs(cz)>62500)return null;
   const tiles=[],plants=[];
   for(let z=cz*CHUNK_SIZE;z<(cz+1)*CHUNK_SIZE;z++)
    for(let x=cx*CHUNK_SIZE;x<(cx+1)*CHUNK_SIZE;x++){
     const tile=surfaceAt(x,z),plant=featureAt(x,z);
     tiles.push(tile);
     if(plant)plants.push(Object.freeze({x,z,y:tile.height+1,...plant}));
    }
   return Object.freeze({cx,cz,seed,tiles:Object.freeze(tiles),plants:Object.freeze(plants),
    structures:Object.freeze([]),npc:Object.freeze([]),roads:Object.freeze([])});
  }
  return Object.freeze({seed,atlas,VOXEL_METERS,PLAYER_HEIGHT,EYE_HEIGHT,MIN_HEIGHT,MAX_HEIGHT,
   SEA_LEVEL,CHUNK_SIZE,biomeAt:atlas.biomeAt,surfaceAt,caveMouthAt,caveAt,blockAt,featureAt,chunkAt,
   cacheSize:()=>cache.size,spawnAt:atlas.spawnAt});
 }
 root.CityVoxelWorld=Object.freeze({createVoxelWorld,VOXEL_METERS,PLAYER_HEIGHT,EYE_HEIGHT,
  MIN_HEIGHT,MAX_HEIGHT,SEA_LEVEL,CHUNK_SIZE,noise2,noise3});
})(typeof window==='undefined'?globalThis:window);
