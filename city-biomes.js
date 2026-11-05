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
 // Each outline is built once and reused by the terrain query, game Canvas
 // and map, so the visible boundaries agree with future material checks.
 function perimeter(r){
  const p=[],n=10,L=r.x+38,R=r.x+r.w-38,T=r.y+38,B=r.y+r.h-38;
  for(let i=0;i<=n;i++){const x=L+(R-L)*i/n;p.push(Object.freeze([x,T+noise(x/145,r.y/145,r.seed)*22]));}
  for(let i=1;i<=n;i++){const y=T+(B-T)*i/n;p.push(Object.freeze([R+noise((r.x+r.w)/145,y/145,r.seed)*22,y]));}
  for(let i=1;i<=n;i++){const x=R-(R-L)*i/n;p.push(Object.freeze([x,B+noise(x/145,(r.y+r.h)/145,r.seed)*22]));}
  for(let i=1;i<n;i++){const y=B-(B-T)*i/n;p.push(Object.freeze([L+noise(r.x/145,y/145,r.seed)*22,y]));}
  return Object.freeze(p);
 }
 const outlines=Object.freeze(Object.fromEntries(regions.map(r=>[r.id,perimeter(r)])));
 function contains(r,x,y){
  if(x<r.x||x>=r.x+r.w||y<r.y||y>=r.y+r.h)return false;
  const points=outlines[r.id];let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
   const a=points[i],b=points[j];
   if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
 }
 function path(c,r,sx=1,sy=1,ox=0,oy=0){
  c.beginPath();for(const [i,p]of outlines[r.id].entries()){
   const x=ox+p[0]*sx,y=oy+p[1]*sy;
   if(i)c.lineTo(x,y);else c.moveTo(x,y);
  }
  c.closePath();
 }
 function regionAt(x,y){return Number.isFinite(x)&&Number.isFinite(y)?regions.find(r=>contains(r,x,y))||null:null;}
 const notes=Object.freeze({
  forest:Object.freeze({name:'Old-Growth Survey Post',note:'Tree cover is thick; the loam is soft and roots cover the trail. This survey is observational—no resources were collected.'}),
  wasteland:Object.freeze({name:'Ashfall Survey Post',note:'Loose gravel, burnt timber and old salvage mark this dead zone. The debris is scenery, not salvageable inventory.'}),
  highlands:Object.freeze({name:'Stonebreak Survey Post',note:'Exposed stone and wind-scoured scrub make this a defensible vantage point. Construction is not yet enabled here.'})
 });
 const sites=Object.freeze(regions.map(r=>Object.freeze({
  id:'biome-survey:'+r.id,regionId:r.id,name:notes[r.id].name,
  x:r.entry.x,y:r.entry.y,color:r.color,note:notes[r.id].note
 })));
 function nearbySite(p,radius=115){
  if(!p||p.room||!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(radius)||radius<=0)return null;
  return sites.find(s=>Math.hypot(s.x-p.x,s.y-p.y)<=radius)||null;
 }
 function terrainAt(x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>C.WORLD.width||y>C.WORLD.height)return null;
  const r=regionAt(x,y),m=materials[r?.material||'urban'];
  return {id:r?.id||'urban',regionId:r?.id||null,material:m.id,footing:m.footing,walkable:true,buildable:false,roughness:r?noise(x/190,y/190,r.seed):0};
 }
 // Hard cap: <=144 pure decorative props, plus three survey markers.
 const props=Object.freeze(regions.flatMap(r=>{
  const list=[];
  for(let i=0;i<48;i++){
   const x=r.x+46+hash(r.seed+i*11)*(r.w-92),y=r.y+52+hash(r.seed+i*17+821)*(r.h-104);
   if(Math.hypot(x-r.entry.x,y-r.entry.y)<110||!contains(r,x,y))continue;
   list.push(Object.freeze({id:r.id+'-decor-'+i,region:r.id,x,y,
    kind:r.id==='forest'?(['pine','fern','pine','brush','flowers','stump'][i%6]):
     r.id==='wasteland'?(['debris','snag','shards','debris','scrap'][i%5]):(['boulder','tuft','shale','boulder','tuft'][i%5]),
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
  g.globalAlpha=1;
  // A few material-specific scratches and contours are baked exactly once.
  for(let i=0;i<20;i++){
   const x=hash(r.seed+i*19+200)*420,y=hash(r.seed+i*43+500)*420;
   g.strokeStyle=r.id==='forest'?'#aad3a02f':r.id==='wasteland'?'#d6aa804a':'#cad3c34a';
   g.lineWidth=r.id==='highlands'?2.3:1.3;g.beginPath();g.moveTo(x-13,y);
   g.lineTo(x+(r.id==='wasteland'?16:28),y+(i%2?5:-9));
   if(r.id==='highlands')g.lineTo(x+39,y+3);
   g.stroke();
  }
  cache.set(r.id,canvas);return canvas;
 }
 function drawGround(c,visible){
  let painted=0;
  for(const r of regions){
   if(visible&&!visible(r.x,r.y,r.w,r.h))continue;
   const image=texture(r);
   c.save();path(c,r);c.clip();
   if(image)c.drawImage(image,r.x,r.y,r.w,r.h);
   else{c.fillStyle=materials[r.material].color;c.fillRect(r.x,r.y,r.w,r.h);}
   c.restore();c.strokeStyle=r.color+'66';c.lineWidth=5;
   path(c,r);c.stroke();painted++;
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
  }else if(p.kind==='fern'){
   c.strokeStyle='#6da67c';c.lineWidth=3;c.beginPath();c.moveTo(0,0);c.lineTo(0,-42);c.stroke();
   for(let i=0;i<5;i++){const y=-8-i*7,w=15+(4-i)*2;
    c.strokeStyle=i%2?'#92ba77':'#4c926f';c.lineWidth=5;
    c.beginPath();c.moveTo(0,y);c.lineTo(-w,y-10);c.moveTo(0,y-2);c.lineTo(w,y-11);c.stroke();}
  }else if(p.kind==='flowers'){
   c.strokeStyle='#4c7b56';c.lineWidth=3;c.beginPath();c.moveTo(0,0);c.lineTo(0,-25);c.stroke();
   for(let i=0;i<5;i++){const a=i*Math.PI*2/5;c.fillStyle='#d6b4dd';c.beginPath();
    c.ellipse(Math.cos(a)*8,-27+Math.sin(a)*8,6,5,a,0,Math.PI*2);c.fill();}
   c.fillStyle='#efd28e';c.beginPath();c.arc(0,-27,4,0,Math.PI*2);c.fill();
  }else if(p.kind==='stump'){
   c.fillStyle='#76624d';c.fillRect(-18,-18,36,19);
   c.fillStyle='#b59c76';c.beginPath();c.ellipse(0,-17,20,8,0,0,Math.PI*2);c.fill();
   c.strokeStyle='#685137';c.lineWidth=2;c.beginPath();c.ellipse(0,-17,12,5,0,0,Math.PI*2);c.stroke();
  }else if(p.kind==='brush'||p.kind==='tuft'){
   c.fillStyle=p.kind==='brush'?'#6b9f66':'#bdba88';
   for(let i=0;i<5;i++){c.beginPath();c.ellipse((i-2)*8,-8-(i%2)*7,12,11,.2,0,Math.PI*2);c.fill();}
  }else if(p.kind==='snag'){
   c.strokeStyle='#55443c';c.lineWidth=10;c.lineCap='round';c.beginPath();
   c.moveTo(0,0);c.lineTo(-6,-86);c.lineTo(-35,-108);c.moveTo(-5,-56);c.lineTo(23,-91);c.stroke();
  }else if(p.kind==='debris'){
   c.fillStyle='#7a7065';c.fillRect(-25,-13,43,16);c.fillStyle='#b4967b';c.fillRect(-17,-20,22,9);
   c.strokeStyle='#483d37';c.lineWidth=5;c.beginPath();c.moveTo(12,-7);c.lineTo(36,-34);c.stroke();
  }else if(p.kind==='scrap'){
   c.fillStyle='#685750';c.fillRect(-24,-17,32,14);
   c.fillStyle='#b6906d';c.fillRect(-14,-32,37,11);
   c.strokeStyle='#4c4d4a';c.lineWidth=5;c.beginPath();c.moveTo(-20,-21);c.lineTo(25,-44);c.stroke();
  }else if(p.kind==='shards'){
   c.fillStyle='#8b7770';c.beginPath();c.moveTo(-34,0);c.lineTo(-12,-26);c.lineTo(7,-7);c.lineTo(22,-21);c.lineTo(37,2);c.closePath();c.fill();
  }else if(p.kind==='shale'){
   for(let i=0;i<3;i++){c.fillStyle=i===1?'#a2a89e':'#747e78';c.beginPath();
    c.ellipse((i-1)*20,-i*3,21,10,-.4,0,Math.PI*2);c.fill();}
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
 function drawSite(c,s){
  c.save();c.translate(s.x,s.y);
  c.fillStyle='#0c1c23aa';c.beginPath();c.ellipse(0,0,59,22,0,0,Math.PI*2);c.fill();
  c.strokeStyle=s.color;c.lineWidth=3;c.beginPath();c.ellipse(0,0,48,17,0,0,Math.PI*2);c.stroke();
  c.fillStyle='#85918c';c.fillRect(-4,-77,8,76);
  c.fillStyle='#13252b';c.fillRect(-65,-108,130,39);
  c.fillStyle=s.color;c.fillRect(-65,-108,130,5);
  c.fillStyle='#eef6ed';c.font='bold 13px Arial';c.textAlign='center';
  c.fillText('E / SURVEY',0,-84);
  c.restore();
 }
 function siteLayers(c,visible){
  const layers=[];
  for(const s of sites)if(!visible||visible(s.x-70,s.y-130,140,155))
   layers.push({y:s.y,draw:()=>drawSite(c,s)});
  return layers;
 }
 function drawMap(c,sx,sy,ox=0,oy=0,compact=false){
  for(const r of regions){
   c.fillStyle=r.color+'c9';path(c,r,sx,sy,ox,oy);c.fill();
   c.strokeStyle=r.color;c.lineWidth=compact?1:2;path(c,r,sx,sy,ox,oy);c.stroke();
   if(!compact){c.fillStyle='#fff6e1';c.font='bold 9px Arial';c.textAlign='center';
    c.fillText(r.short,ox+(r.x+r.w/2)*sx,oy+(r.y+r.h/2)*sy);}
  }
  if(!compact)for(const s of sites){
   c.fillStyle='#eef9ee';c.beginPath();c.arc(ox+s.x*sx,oy+s.y*sy,3,0,Math.PI*2);c.fill();
  }
 }
 root.CityBiomes=Object.freeze({materials,regions,props,sites,noise,regionAt,terrainAt,nearbySite,drawGround,scenery,siteLayers,drawMap});
})(typeof window==='undefined'?globalThis:window);
