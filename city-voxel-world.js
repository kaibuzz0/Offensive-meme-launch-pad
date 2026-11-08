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
 // One graded approach and a gatehouse in the existing seeded landscape.
 function buildGateRoad(spawn,column,seed){
  const {x,z}=spawn;
  const heights=[];
  const bend=(seed&1)?3:-3;
  function center(t){return x+Math.round(bend*Math.sin(Math.PI*clamp(t,0,46)/46));}
  let grade=Math.max(SEA_LEVEL+1,spawn.y-1);
  for(let t=-4;t<=54;t++){
   if(t>0&&t<31)grade=Math.max(SEA_LEVEL+1,grade+clamp(column(center(t),z+t).height-grade,-1,1));
   heights[t+4]=grade;
  }
  const stone=[.39,.46,.53],trim=[.58,.64,.68],slate=[.15,.23,.32];
  const bronze=[.56,.29,.13],amber=[1,.73,.27],cloth=[.68,.12,.16];
  const parts=[];
  const gateZ=z+36,base=heights[40]+1;
  function part(dx,dz,dy,w,h,d,color,solid=true){
   parts.push({x:x+dx,z:gateZ+dz,y:base+dy,w,h,d,color,solid});
  }
  for(const side of [-1,1]){
   const tower=side<0?-14:5;
   part(tower,-1,-2,9,25,10,stone);
   part(tower-.5,-1.5,20,10,2,11,trim);
   part(tower-1,-2,23,11,2,12,slate);
   for(const dx of [0,3,7]){
    part(tower+dx,-1,25,2,3,2,trim);
    part(tower+dx,7,25,2,3,2,trim);
   }
   for(const dy of [6,15])part(tower+3,-1.2,dy,2,3,.3,amber,false);
   part(tower+1,-1.4,11,2,7,.3,cloth,false);
   // Low outer walls frame the taller gate towers.
   part(side<0?-23:14,3,-2,9,12,4,stone);
   for(let j=0;j<3;j++)part((side<0?-23:14)+3*j,3,10,2,3,3,trim);
  }
  part(-5,0,12,10,4,7,stone);
  part(-5,-.4,15,10,1,8,trim);
  part(-2,-.6,12,4,3,.4,cloth,false);
  for(const dx of [-5,4]){
   part(dx,-2,0,1,7,1,bronze);
   part(dx-.4,-2.4,7,1.8,2,1.8,amber);
  }
  // A reachable roadside supply crate is the first playable salvage stop.
  // Use the same graded road height and seed-relative coordinates as the gate.
  // Keep it nonblocking so desktop and touch players can walk past it.
  const supplies=Object.freeze({x:center(14)+5,z:z+14,y:heights[18]+1});
  parts.push({x:supplies.x,z:supplies.z,y:supplies.y,w:3,h:2,d:3,color:[.43,.26,.13],solid:false});
  parts.push({x:supplies.x-.15,z:supplies.z-.15,y:supplies.y+2,w:3.3,h:.5,d:3.3,color:trim,solid:false});
  parts.push({x:supplies.x+1.3,z:supplies.z+1.1,y:supplies.y+2.5,w:.35,h:8,d:.35,color:stone,solid:false});
  parts.push({x:supplies.x+1.6,z:supplies.z+1.1,y:supplies.y+7,w:4,h:2.8,d:.22,color:amber,solid:false});
  function foundation(px,pz){
   const t=pz-z;
   if(t< -4||t>54)return null;
   const distance=Math.abs(px-center(t));
   if(distance>(t>=31&&t<=47?24:6))return null;
   return {height:heights[t+4],road:distance<=4,edge:distance===4};
  }
  function obstructs(px,py,pz,height,radius){
   if(Math.abs(px-x)>25||Math.abs(pz-gateZ)>12)return false;
   return parts.some(p=>p.solid&&px+radius>p.x&&px-radius<p.x+p.w&&
    pz+radius>p.z&&pz-radius<p.z+p.d&&py+height>p.y&&py<p.y+p.h);
  }
  return {x,z,gateX:x,gateZ,base,parts,foundation,obstructs,supplies};
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
   const mx=cx*MOUTH_CELL+24+Math.floor(random(sinkSeed,cx,cz,5)*(MOUTH_CELL-48));
   const mz=cz*MOUTH_CELL+24+Math.floor(random(sinkSeed,cx,cz,6)*(MOUTH_CELL-48));
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
  let gateRoad=null;
  function surfaceAt(x,z){
   if(!Number.isSafeInteger(x)||!Number.isSafeInteger(z)||Math.abs(x)>1000000||Math.abs(z)>1000000)return null;
   const key=x+','+z;
   if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
   const natural=rawColumn(x,z),pad=gateRoad?.foundation(x,z);
   const value=pad?Object.freeze({...natural,height:pad.height,water:false,waterLevel:null,
    river:false,mouth:false,mouthDepth:0,mouthId:null,sinkhole:false,slope:1,road:pad.road,curb:pad.edge}):natural;
   cache.set(key,value);if(cache.size>CACHE_LIMIT)cache.delete(cache.keys().next().value);
   return value;
  }
  // A single seeded cave complex has an entrance, a sloped approach and
  // TWO joined chambers; all lie within the same finite region and share the
  // exact surface X/Z and block Y coordinate system (no teleport scene).
  // Keep the original 112-cell entrances/18.5-voxel galleries stable for saves.
  const caveCells=new Map(),CAVE_CELL_LIMIT=256;
  function caveCell(cx,cz){
   const key=cx+':'+cz;
   if(caveCells.has(key))return caveCells.get(key);
   let result=null;
   if(random(sinkSeed^0x4caf,cx,cz,9)>=.79){
    const mx=cx*MOUTH_CELL+24+Math.floor(random(sinkSeed,cx,cz,5)*(MOUTH_CELL-48));
    const mz=cz*MOUTH_CELL+24+Math.floor(random(sinkSeed,cx,cz,6)*(MOUTH_CELL-48));
    const angle=random(sinkSeed^0x1dad,cx,cz,11)*Math.PI*2;
    const dx=Math.cos(angle),dz=Math.sin(angle);
    const ax=clamp(mx+dx*29,cx*MOUTH_CELL+15,(cx+1)*MOUTH_CELL-16);
    const az=clamp(mz+dz*29,cz*MOUTH_CELL+15,(cz+1)*MOUTH_CELL-16);
    const side=(random(sinkSeed,cx,cz,12)>.5?1:-1);
    const bx=clamp(ax-dz*side*16+dx*7,cx*MOUTH_CELL+14,(cx+1)*MOUTH_CELL-15);
    const bz=clamp(az+dx*side*16+dz*7,cz*MOUTH_CELL+14,(cz+1)*MOUTH_CELL-15);
    const ar=7.2+random(sinkSeed,cx,cz,13)*2.5;
    const br=6.5+random(sinkSeed,cx,cz,14)*2.5;
    result=Object.freeze({id:key,cx,cz,mx,mz,dx,dz,angle,
     ax,az,bx,bz,ar,br,
     mouthHeight:surfaceAt(mx,mz).height+1});
   }
   caveCells.set(key,result);
   if(caveCells.size>CAVE_CELL_LIMIT)caveCells.delete(caveCells.keys().next().value);
   return result;
  }
  function segmentDistance(x,z,x0,z0,x1,z1){
   const dx=x1-x0,dz=z1-z0,size=dx*dx+dz*dz||1;
   const t=clamp(((x-x0)*dx+(z-z0)*dz)/size,0,1);
   const bx=x0+t*dx,bz=z0+t*dz;
   return {distance:Math.hypot(x-bx,z-bz),t};
  }
  function caveRoomAt(x,z){
   if(!Number.isSafeInteger(x)||!Number.isSafeInteger(z))return null;
   const cx=Math.floor(x/MOUTH_CELL),cz=Math.floor(z/MOUTH_CELL);
   const m=caveCell(cx,cz);if(!m)return null;
   const ox=x+.5-m.mx,oz=z+.5-m.mz;
   const t=ox*m.dx+oz*m.dz,side=Math.abs(ox*-m.dz+oz*m.dx);
   const main=t>=-.8&&t<=18.5&&side<=2.3+Math.min(3.1,Math.max(0,t-9)*.4);
   const approach=segmentDistance(x+.5,z+.5,m.mx+m.dx*12,m.mz+m.dz*12,m.ax,m.az);
   const connector=segmentDistance(x+.5,z+.5,m.ax,m.az,m.bx,m.bz);
   const distA=Math.hypot(x+.5-m.ax,z+.5-m.az),distB=Math.hypot(x+.5-m.bx,z+.5-m.bz);
   const inA=distA<=m.ar,inB=distB<=m.br;
   const inApproach=approach.distance<=2.7;
   const inConnector=connector.distance<=3.1;
   if(!(main||inA||inB||inApproach||inConnector))return null;
   let kind='gallery',span=Math.max(0,t),height=8+Math.floor(Math.max(0,t)*.22);
   if(inB){kind='chamber-b';span=Math.max(0,Math.hypot(m.ax-m.mx,m.az-m.mz)+connector.t*7);height=17;}
   else if(inA){kind='chamber-a';span=Math.max(0,Math.hypot(m.ax-m.mx,m.az-m.mz));height=15;}
   else if(inConnector){kind='connector';span=Math.max(0,Math.hypot(m.ax-m.mx,m.az-m.mz)+connector.t*7);height=11;}
   else if(inApproach&&!main){kind='approach';span=Math.max(12,t);height=10;}
   const floor=m.mouthHeight-Math.floor(span*.23);
   const ceiling=floor+height;
   const outer=surfaceAt(x,z);
   if(gateRoad?.foundation(x,z)&&ceiling>=outer.height)return null;
   const exposed=!!outer.mouth&&outer.height+1<=ceiling;
   return Object.freeze({id:m.id,kind,x,z,t,side,width:kind==='gallery'?2.3:kind==='connector'?3.1:kind==='approach'?2.7:kind==='chamber-a'?m.ar:m.br,
    floor,ceiling,exposed,mouthX:m.mx,mouthZ:m.mz,angle:m.angle});
  }
  function caveAt(x,y,z){
   if(!Number.isInteger(y)||y<MIN_HEIGHT||y>MAX_HEIGHT)return false;
   const col=surfaceAt(x,z);
   if(!col||y<MIN_HEIGHT+4)return false;
   const gallery=caveRoomAt(x,z);
   if(gallery&&y>=gallery.floor&&y<gallery.ceiling)return true;
   if(y>col.height-5)return false;
   const large=noise3(caveSeed,x/21,y/14,z/21);
   const narrow=noise3(caveSeed^0x4441,x/13,y/17,z/13);
   return large>.25&&narrow>-.22;
  }
  // Sample the occupied cell at the controller's continuous world position.
  function isWaterAt(x,y,z){
   const cellY=Math.floor(y);
   if(!Number.isFinite(cellY)||cellY<MIN_HEIGHT||cellY>SEA_LEVEL)return false;
   const column=surfaceAt(Math.floor(x),Math.floor(z));
   return !!column?.water && cellY>column.height;
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
   if(gateRoad){
    // Structures own their footprint. Check before decorative road planting:
    // otherwise roadside trees can appear inside lodge walls or doorways.
    if(gateRoad.foundation(x,z))return null;
    const t=z-gateRoad.z;
    if(t>=4&&t<=28&&(t-4)%8===0&&Math.abs(x-gateRoad.x)===8){
     const ground=surfaceAt(x,z);
     if(!ground.water&&!ground.mouth&&ground.slope<=18){
      const type=ground.group==='desert'||ground.group==='salt'?'cactus':
       ground.group==='fungal'?'mushroom':ground.group==='tropical'?'palm':
       ground.group==='evergreen'||ground.group==='tundra'||ground.group==='alpine'?'pine':'tree';
      return Object.freeze({type,height:13+(t%5),color:.4});
     }
    }
   }
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
  function spawnAt(){
   const base=atlas.spawnAt();
   // Find accessible footing close to the saved seed-specific starting area.
   // Prevent first-person starts on steep cliffs, under water or in cave shafts.
   function safe(x,z){
    const mid=surfaceAt(x,z);
    if(!mid||mid.water||mid.mouth||mid.slope>13)return false;
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2]]){
     const n=surfaceAt(x+dx,z+dz);
     if(!n||n.water||n.mouth||Math.abs(n.height-mid.height)>2)return false;
    }
    return true;
   }
   for(let radius=0;radius<=80;radius+=2){
    const pts=radius===0?[[base.x,base.y]]:
     [[base.x+radius,base.y],[base.x,base.y+radius],
      [base.x-radius,base.y],[base.x,base.y-radius]];
    for(const [x,z] of pts)if(safe(x,z))return Object.freeze({x,z,y:surfaceAt(x,z).height+1});
   }
   const mid=surfaceAt(base.x,base.y);
   return Object.freeze({x:base.x,z:base.y,y:mid.height+1});
  }
  // Resolve seeded actor sites once per world, not once per streamed chunk.
  // Fixed search order and stable IDs preserve positions across reloads.
  function actorSite(dx,dz,maxSlope,avoidRoad,excludedSite){
   const ax=gateRoad.supplies.x+dx,az=gateRoad.supplies.z+dz;
   // Sample the reference grade once; terrain queries are costly during startup.
   const referenceHeight=surfaceAt(ax,az).height;
   const offsets=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2],
    [3,0],[-3,0],[0,3],[0,-3],[4,0],[-4,0],[0,4],[0,-4]];
   for(const [ox,oz] of offsets){
    const x=ax+ox,z=az+oz,ground=surfaceAt(x,z);
    // Separate independently generated populations without a second actor simulation.
    if(excludedSite&&Math.hypot(x-excludedSite.x,z-excludedSite.z)<4)continue;
    if(!ground||ground.water||ground.mouth||ground.slope>maxSlope||
       (avoidRoad&&(ground.road||gateRoad.foundation(x,z))))continue;
    if(Math.abs(ground.height-referenceHeight)>3)continue;
    // Avoid spawning actors inside tall biome foliage. Sample the same
    // deterministic vegetation contract consumed by streamed chunks.
    // Short grass and flowers remain valid underfoot.
    if([[0,0],[1,0],[0,1],[1,1]].some(([fx,fz])=>{
     const vegetation=featureAt(x+fx,z+fz);
     return vegetation&&vegetation.height>=6;
    }))continue;
    // Shared physics uses the original fortress boxes, not streamed mesh fragments.
    // Do not seed a character inside a solid tower, wall or gate post.
    // Check the full standing footprint against fortress collision, not only
    // its center; corner overlap can otherwise embed actors in gate posts.
    if([[.25,.25],[.75,.25],[.25,.75],[.75,.75]].some(([fx,fz])=>
     gateRoad.obstructs(x+fx,ground.height+1,z+fz,PLAYER_HEIGHT,.35)))continue;
    // A standing actor needs a stable 2x2 footprint, not merely one dry tile.
    const footprint=[[1,0],[0,1],[1,1]].every(([ox2,oz2])=>{
     const neighbor=surfaceAt(x+ox2,z+oz2);
     return neighbor&&!neighbor.water&&!neighbor.mouth&&
      Math.abs(neighbor.height-ground.height)<=2;
    });
    if(!footprint)continue;
    return Object.freeze({x,z,y:ground.height+1,group:ground.group});
   }
   return null;
  }
  function chunkAt(cx,cz){
   if(!Number.isSafeInteger(cx)||!Number.isSafeInteger(cz)||Math.abs(cx)>62500||Math.abs(cz)>62500)return null;
   const tiles=[],plants=[],roads=[];
   for(let z=cz*CHUNK_SIZE;z<(cz+1)*CHUNK_SIZE;z++)
    for(let x=cx*CHUNK_SIZE;x<(cx+1)*CHUNK_SIZE;x++){
     const tile=surfaceAt(x,z),plant=featureAt(x,z);
     tiles.push(tile);
     if(tile.road)roads.push(tile);
     if(plant)plants.push(Object.freeze({id:'plant:'+seed+':'+x+':'+z,x,z,y:tile.height+1,...plant}));
    }
   // Each seed-stable descriptor belongs to exactly one floor-divided chunk.
   // Distant populations remain declarative until the shared actor runtime activates them.
   const npc=[];
   if(traderSite&&Math.floor(traderSite.x/CHUNK_SIZE)===cx&&Math.floor(traderSite.z/CHUNK_SIZE)===cz){
    npc.push(Object.freeze({id:'starter-trader:'+seed,kind:'trader',
     role:'supplies',faction:'starter-settlement',rig:'shared-humanoid',
     x:traderSite.x,z:traderSite.z,y:traderSite.y,heading:Math.PI,
     homeId:'starter-fortress:'+seed,behavior:'idle-trade'}));
   }
   if(wildlifeSite&&Math.floor(wildlifeSite.x/CHUNK_SIZE)===cx&&Math.floor(wildlifeSite.z/CHUNK_SIZE)===cz){
    const species=wildlifeSite.group==='desert'||wildlifeSite.group==='salt'?'lizard':
     wildlifeSite.group==='tundra'||wildlifeSite.group==='alpine'?'hare':'deer';
    npc.push(Object.freeze({id:'starter-wildlife:'+seed,kind:'wildlife',
     species,role:'forager',faction:'wild',rig:'shared-creature',
     x:wildlifeSite.x,z:wildlifeSite.z,y:wildlifeSite.y,
     heading:random(plantSeed,wildlifeSite.x,wildlifeSite.z)*Math.PI*2,
     homeId:'starter-fortress:'+seed,behavior:'graze-flee'}));
   }
   return Object.freeze({cx,cz,seed,tiles:Object.freeze(tiles),plants:Object.freeze(plants),
    structures:Object.freeze(gateParts(cx,cz)),npc:Object.freeze(npc),roads:Object.freeze(roads)});
  }
  const naturalSpawn=spawnAt();
  gateRoad=buildGateRoad(naturalSpawn,rawColumn,seed);
  // Actor sites require the initialized road and collision geometry.
  const traderSite=actorSite(4,2,18,false);
  const wildlifeSite=actorSite(-8,7,12,true,traderSite);
  cache.clear();
  // Emit each structure fragment in every intersected chunk. Keep the source
  // gateRoad.parts unchanged: collision uses those original world-space boxes.
  function gateParts(cx,cz){
   const minX=cx*CHUNK_SIZE,maxX=minX+CHUNK_SIZE;
   const minZ=cz*CHUNK_SIZE,maxZ=minZ+CHUNK_SIZE;
   const fragments=[];
   for(let i=0;i<gateRoad.parts.length;i++){
    const p=gateRoad.parts[i];
    const x=Math.max(p.x,minX),z=Math.max(p.z,minZ);
    const w=Math.min(p.x+p.w,maxX)-x,d=Math.min(p.z+p.d,maxZ)-z;
    if(w<=0||d<=0)continue;
    fragments.push(Object.freeze({...p,x,z,w,d,
     id:'starter-gate:'+seed+':'+i,
     fragmentId:'starter-gate:'+seed+':'+i+':'+cx+':'+cz,
     structureId:'starter-fortress:'+seed}));
   }
   return fragments;
  }
  return Object.freeze({seed,atlas,gateRoad,gateParts,VOXEL_METERS,PLAYER_HEIGHT,EYE_HEIGHT,MIN_HEIGHT,MAX_HEIGHT,
   SEA_LEVEL,CHUNK_SIZE,biomeAt:atlas.biomeAt,surfaceAt,caveMouthAt,caveRoomAt,caveAt,blockAt,isWaterAt,featureAt,chunkAt,
   cacheSize:()=>cache.size,caveCacheSize:()=>caveCells.size,spawnAt:()=>({...naturalSpawn,y:surfaceAt(naturalSpawn.x,naturalSpawn.z).height+1})});
 }
 root.CityVoxelWorld=Object.freeze({createVoxelWorld,VOXEL_METERS,PLAYER_HEIGHT,EYE_HEIGHT,
  MIN_HEIGHT,MAX_HEIGHT,SEA_LEVEL,CHUNK_SIZE,noise2,noise3});
})(typeof window==='undefined'?globalThis:window);
