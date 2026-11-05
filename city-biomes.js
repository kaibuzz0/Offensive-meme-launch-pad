/* Non-destructive, deterministic greenbelt biomes in canonical Center City.
 * Cosmetic scenery only: no new collisions, saves, server actions or game world.
 */
'use strict';
(function(root){
 const C=root.MemeCityCore;
 if(!C?.WORLD)throw Error('Original MemeCityCore required before city-biomes.js');
 const materials=Object.freeze({
  urban:Object.freeze({id:'urban',name:'Pavement and greenbelt',footing:'mixed',color:'#263d3c',walkable:true,buildable:false}),
  forest:Object.freeze({id:'forest',name:'Forest loam',footing:'soil',color:'#33564b',walkable:true,buildable:false}),
  wasteland:Object.freeze({id:'wasteland',name:'Broken gravel',footing:'rubble',color:'#66534c',walkable:true,buildable:false}),
  highlands:Object.freeze({id:'highlands',name:'Stone and scrub',footing:'stone',color:'#696b65',walkable:true,buildable:false})
 });
 // Quadrants contain no authored roads, structures, services or holder lots.
 const regions=Object.freeze([
  Object.freeze({id:'forest',name:'Pinewood Forest',short:'FOREST',x:160,y:2360,w:800,h:800,seed:1847,material:'forest',color:'#477963',entry:Object.freeze({x:560,y:2760})}),
  Object.freeze({id:'wasteland',name:'Ashfall Dead Zone',short:'DEAD ZONE',x:160,y:6860,w:800,h:800,seed:2903,material:'wasteland',color:'#98705a',entry:Object.freeze({x:560,y:7260})}),
  Object.freeze({id:'highlands',name:'Stonebreak Highlands',short:'HIGHLANDS',x:9030,y:6850,w:810,h:790,seed:5417,material:'highlands',color:'#a1a494',entry:Object.freeze({x:9435,y:7245})})
 ]);
 function hash(n){n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return ((n^(n>>>16))>>>0)/4294967296;}
 function smooth(t){return t*t*(3-2*t);}
 function noise(x,y,seed=0){
  if(!Number.isFinite(x)||!Number.isFinite(y))return 0;
  const ix=Math.floor(x),iy=Math.floor(y),tx=smooth(x-ix),ty=smooth(y-iy);
  const h=(a,b)=>hash(Math.imul(a,73856093)^Math.imul(b,19349663)^seed);
  return 2*((h(ix,iy)*(1-tx)+h(ix+1,iy)*tx)*(1-ty)+(h(ix,iy+1)*(1-tx)+h(ix+1,iy+1)*tx)*ty)-1;
 }
 function regionAt(x,y){return Number.isFinite(x)&&Number.isFinite(y)?regions.find(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h)||null:null;}
 function terrainAt(x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>C.WORLD.width||y>C.WORLD.height)return null;
  const r=regionAt(x,y),m=materials[r?.material||'urban'];
  return {id:r?.id||'urban',regionId:r?.id||null,material:m.id,footing:m.footing,walkable:true,buildable:false,roughness:r?noise(x/190,y/190,r.seed):0};
 }
 // Hard cap: <=96 pure decorative objects in this fixed test world.
 const props=Object.freeze(regions.flatMap(r=>{
  const list=[];
  for(let i=0;i<32;i++){
   const x=r.x+46+hash(r.seed+i*11)*(r.w-92),y=r.y+52+hash(r.seed+i*17+821)*(r.h-104);
   if(Math.hypot(x-r.entry.x,y-r.entry.y)<95)continue;
   list.push(Object.freeze({id:r.id+'-decor-'+i,region:r.id,x,y,
    kind:r.id==='forest'?(i%4===0?'brush':'pine'):r.id==='wasteland'?(i%5===0?'snag':'debris'):(i%4===0?'tuft':'boulder'),
    size:.7+hash(i*19+r.seed)*.58}));
  }
  return list;
 }));
 const cache=new Map();
 function texture(r){
  if(cache.has(r.id))return cache.get(r.id);
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=420;canvas.height=420;
  const g=canvas.getContext('2d');if(!g)return null;
  g.fillStyle=materials[r.material].color;g.fillRect(0,0,420,420);
  const bright=r.id==='forest'?'#81ae80':r.id==='wasteland'?'#be9578':'#bdc3b3';
  const dark=r.id==='forest'?'#173f39':r.id==='wasteland'?'#443c39':'#444b4b';
  // Baked once on first visibility; no per-frame procedural speck loops.
  for(let i=0;i<155;i++){
   const x=hash(r.seed+i*177)*420,y=hash(r.seed+i*127+9)*420;
   const n=noise(x/56,y/56,r.seed),size=3+hash(r.seed+i*31)*17;
   g.fillStyle=n>0?bright:dark;g.globalAlpha=.12+Math.abs(n)*.16;
   g.beginPath();g.ellipse(x,y,size*(1+Math.abs(n)),size*.55,hash(i+r.seed)*3,0,Math.PI*2);g.fill();
  }
  for(let i=0;i<42;i++){
   const x=hash(r.seed+i*97+100)*420,y=hash(r.seed+i*43+400)*420;
   g.fillStyle=i%2?bright:dark;g.globalAlpha=i%2?.28:.21;g.fillRect(x,y,r.id==='highlands'?18:5,2);
  }
  g.globalAlpha=1;cache.set(r.id,canvas);return canvas;
 }
 function drawGround(c,visible){
  let painted=0;
  for(const r of regions){
   if(visible&&!visible(r.x,r.y,r.w,r.h))continue;
   const image=texture(r);
   c.save();c.beginPath();c.roundRect(r.x,r.y,r.w,r.h,90);c.clip();
   if(image)c.drawImage(image,r.x,r.y,r.w,r.h);
   else{c.fillStyle=materials[r.material].color;c.fillRect(r.x,r.y,r.w,r.h);}
   c.restore();c.strokeStyle=r.color+'bb';c.lineWidth=7;
   c.beginPath();c.roundRect(r.x,r.y,r.w,r.h,90);c.stroke();painted++;
  }
  return painted;
 }
 function drawProp(c,p){
  c.save();c.translate(p.x,p.y);c.scale(p.size,p.size);
  c.fillStyle='#0c1c235e';c.beginPath();c.ellipse(6,3,39,14,0,0,Math.PI*2);c.fill();
  if(p.kind==='pine'){
   c.fillStyle='#655241';c.fillRect(-5,-37,10,41);
   for(let i=0;i<3;i++){const y=-116+i*27,w=29+i*12;
    c.fillStyle=i%2?'#326a55':'#4b8564';c.beginPath();
    c.moveTo(0,y);c.lineTo(-w,y+68);c.lineTo(w,y+68);c.closePath();c.fill();}
  }else if(p.kind==='brush'||p.kind==='tuft'){
   c.fillStyle=p.kind==='brush'?'#6b9f66':'#bdba88';
   for(let i=0;i<5;i++){c.beginPath();c.ellipse((i-2)*8,-8-(i%2)*7,12,11,.2,0,Math.PI*2);c.fill();}
  }else if(p.kind==='snag'){
   c.strokeStyle='#55443c';c.lineWidth=10;c.lineCap='round';c.beginPath();
   c.moveTo(0,0);c.lineTo(-6,-86);c.lineTo(-35,-108);c.moveTo(-5,-56);c.lineTo(23,-91);c.stroke();
  }else if(p.kind==='debris'){
   c.fillStyle='#7a7065';c.fillRect(-25,-13,43,16);c.fillStyle='#b4967b';c.fillRect(-17,-20,22,9);
   c.strokeStyle='#483d37';c.lineWidth=5;c.beginPath();c.moveTo(12,-7);c.lineTo(36,-34);c.stroke();
  }else if(p.kind==='boulder'){
   c.fillStyle='#858d86';c.beginPath();c.moveTo(-38,0);c.lineTo(-32,-30);c.lineTo(-4,-48);c.lineTo(32,-36);c.lineTo(44,-5);c.closePath();c.fill();
   c.fillStyle='#a6aea4';c.beginPath();c.moveTo(-32,-30);c.lineTo(-4,-48);c.lineTo(10,-20);c.lineTo(-13,-17);c.closePath();c.fill();
   c.strokeStyle='#58625c';c.lineWidth=3;c.beginPath();c.moveTo(10,-20);c.lineTo(24,-7);c.stroke();
  }
  c.restore();
 }
 function scenery(c,visible){
  const layers=[];
  for(const p of props)if(!visible||visible(p.x-75,p.y-160,150,180))layers.push({y:p.y,draw:()=>drawProp(c,p)});
  return layers;
 }
 function drawMap(c,sx,sy,ox=0,oy=0,compact=false){
  for(const r of regions){
   c.fillStyle=r.color+'c9';c.fillRect(ox+r.x*sx,oy+r.y*sy,r.w*sx,r.h*sy);
   c.strokeStyle=r.color;c.lineWidth=compact?1:2;
   c.strokeRect(ox+r.x*sx,oy+r.y*sy,r.w*sx,r.h*sy);
   if(!compact){c.fillStyle='#fff6e1';c.font='bold 9px Arial';c.textAlign='center';
    c.fillText(r.short,ox+(r.x+r.w/2)*sx,oy+(r.y+r.h/2)*sy);}
  }
 }
 root.CityBiomes=Object.freeze({materials,regions,props,noise,regionAt,terrainAt,drawGround,scenery,drawMap});
})(typeof window==='undefined'?globalThis:window);
