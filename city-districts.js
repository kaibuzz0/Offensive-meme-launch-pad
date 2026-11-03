/* District architecture and private construction: all original canvas geometry. */
'use strict';
(function(root){
 const C=root.MemeCityCore,W=C.WORLD,fort=C.DISTRICTS.find(d=>d.id==='fortress'),P={...C.PLOT,x:C.PLOT.x-fort.ox,y:C.PLOT.y-fort.oy},cache=new Map(),pieceCache=new Map();
 function box(c,x,y,w,h,color,r=0){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
 function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
 function grad(c,x,y,w,h,a,b){const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,a);g.addColorStop(1,b);return g;}
 function text(c,s,x,y,size,color='#e1e7df'){c.font=`600 ${size}px Arial`;c.fillStyle=color;c.textAlign='center';c.fillText(s,x,y);}
 function tree(c,x,y,scale=1,variant=0){
  c.save();c.translate(x,y);c.scale(scale,scale);
  const shadow=c.createRadialGradient(15,5,3,15,5,58);shadow.addColorStop(0,'#030e1870');shadow.addColorStop(1,'#030e1800');c.fillStyle=shadow;c.beginPath();c.ellipse(15,6,60,22,-.1,0,7);c.fill();
  box(c,-6,-65,12,69,grad(c,-6,0,12,0,'#94775b','#3c3c37'),4);c.strokeStyle='#405343';c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(0,-42);c.lineTo(-24,-69);c.moveTo(0,-35);c.lineTo(23,-62);c.stroke();
  if(variant===1){for(let i=0;i<4;i++){const yy=-112+i*20,ww=21+i*9;poly(c,[[-ww,yy+34],[0,yy-12],[ww,yy+34]],grad(c,-ww,yy,ww*2,40,'#92ae78','#32594d'));poly(c,[[0,yy-12],[ww,yy+34],[5,yy+29]],'#214b4344');}}
  else{for(const [xx,yy,rx,ry]of [[-23,-72,31,33],[24,-74,32,35],[0,-100,32,35],[-16,-98,27,28],[19,-100,26,28],[0,-70,37,31]]){
   c.fillStyle=grad(c,xx-rx,yy-ry,rx*2,ry*2,variant===2?'#8baf90':'#8fb18a','#315e54');c.beginPath();c.ellipse(xx,yy,rx,ry,-.15,0,7);c.fill();
   c.strokeStyle='#d6e5a926';c.lineWidth=1.5;c.beginPath();c.ellipse(xx-5,yy-7,rx*.65,ry*.6,-.2,Math.PI,Math.PI*1.8);c.stroke();
  }}
  c.fillStyle='#d4e4b51f';for(let i=0;i<19;i++){const xx=Math.sin(i*2.4)*35,yy=-84+Math.cos(i*1.7)*30;c.beginPath();c.ellipse(xx,yy,4,2.5,i,0,7);c.fill();}c.restore();
 }
 function lamp(c,x,y,on=true){c.save();if(on){const g=c.createRadialGradient(x,y,0,x,y,140);g.addColorStop(0,'#ffda9a1c');g.addColorStop(1,'#ffda9a00');c.fillStyle=g;c.fillRect(x-140,y-140,280,280);}poly(c,[[x-3,y],[x+3,y],[x+29,y+7],[x+19,y+10]],'#050e1566');box(c,x-4,y-100,8,102,grad(c,x-4,0,8,0,'#52626c','#182b36'),3);box(c,x-16,y-108,32,10,'#182b37',3);box(c,x-12,y-106,24,4,on?'#ffe1aa':'#9da89e',2);c.restore();}
 function land(c){
  c.save();c.fillStyle='#263d3c';c.fillRect(0,0,W.width,W.height);
  for(const y of [1120,3360,5600,7840,10080]){box(c,0,y-95,W.width,190,'#75858a');box(c,0,y-65,W.width,130,'#243a47');c.strokeStyle='#c4c7a25c';c.lineWidth=2;c.setLineDash([20,32]);c.beginPath();c.moveTo(0,y);c.lineTo(W.width,y);c.stroke();c.setLineDash([]);}
  for(const x of [1120,3360,5600,7840,10080]){box(c,x-95,0,190,W.height,'#738588');box(c,x-65,0,130,W.height,'#243a47');c.strokeStyle='#c4c7a25c';c.lineWidth=2;c.setLineDash([20,32]);c.beginPath();c.moveTo(x,0);c.lineTo(x,W.height);c.stroke();c.setLineDash([]);}
  for(const n of C.NEIGHBORHOODS){
   box(c,n.ox+160,n.oy+130,1920,610,'#60747a',20);box(c,n.ox+170,n.oy+140,1900,590,'#344b58',16);
   box(c,n.ox+160,n.oy+1000,1920,530,'#60747a',20);box(c,n.ox+170,n.oy+1010,1900,510,'#344b58',16);
   box(c,n.x-94,n.oy,188,1660,'#79888b');box(c,n.x-65,n.oy,130,1660,'#243a47');
   for(let yy=n.oy+60;yy<n.oy+1660;yy+=110)box(c,n.x-1,yy,2,35,'#d5d3a766');
   // Crosswalks, district-colored curb marks and painted plaza mosaics.
   for(const side of [-1,1]){for(let i=-3;i<=3;i++)box(c,n.x+side*105-20,n.y+i*16-4,40,7,'#d6dfca99');for(let i=0;i<8;i++)box(c,n.ox+190+i*230,n.oy+1020,100,4,n.color+'77');}
   for(let i=0;i<5;i++){c.strokeStyle=n.color+'30';c.lineWidth=2;c.beginPath();c.arc(n.x-410,n.y+40,20+i*13,0,Math.PI*2);c.stroke();}
   text(c,n.clan.toUpperCase(),n.x-410,n.y+45,13,n.color);
   // Every clan owns a visibly distinct HQ compound with an open south
   // entrance; this is a painted territorial boundary, not impassable walls.
   c.save();c.strokeStyle=n.color;c.lineWidth=5;c.setLineDash([32,16]);
   c.beginPath();c.moveTo(n.ox+204,n.oy+187);
   c.lineTo(n.ox+826,n.oy+187);c.lineTo(n.ox+826,n.oy+625);
   c.moveTo(n.ox+705,n.oy+625);c.lineTo(n.ox+204,n.oy+625);
   c.lineTo(n.ox+204,n.oy+187);c.stroke();c.setLineDash([]);
   box(c,n.ox+253,n.oy+210,523,34,'#102734',3);
   text(c,n.clan.toUpperCase()+' / HQ',n.ox+515,n.oy+233,16,n.color);
   box(c,n.ox+653,n.oy+584,164,26,'#152b3c',3);
   text(c,'OPEN ACCESS',n.ox+735,n.oy+602,9,'#d7f0e0');
   c.restore();
   text(c,n.name,n.x,n.oy+100,30,n.color);text(c,n.clan.toUpperCase()+' / WALKABLE COMMUNITY BLOCK',n.x,n.oy+960,13,n.color);
   box(c,n.x-115,n.y-48,230,96,'#122833',14);text(c,'CLAN TERMINAL',n.x,n.y-10,15,n.color);text(c,'E / JOBS & MEMBERSHIP',n.x,n.y+14,10,'#dce8e5');
  }
  text(c,'FORTRESS COMMONS / CENTER',fort.x,fort.oy-65,15,'#d3e2b9');text(c,'CLAN TERRITORIES / OUTER RING',W.width/2,W.height-100,14,'#d8c5eb');
  text(c,'ARENA DISTRICT / WEST',C.DISTRICTS.find(d=>d.id==='arena').x,C.DISTRICTS.find(d=>d.id==='arena').oy+1630,13,'#e1bc98');text(c,'SOCIAL BOARDWALK / EAST',C.DISTRICTS.find(d=>d.id==='social').x,C.DISTRICTS.find(d=>d.id==='social').oy+1630,13,'#afd7df');
  c.restore();
 }
 function car(c,x,y,color,reverse){
  c.save();c.translate(x,y);if(reverse)c.rotate(Math.PI);
  c.fillStyle='#08172548';c.beginPath();c.ellipse(3,5,44,18,0,0,7);c.fill();
  for(const xx of [-23,19]){box(c,xx,-18,11,8,'#101c27',2);box(c,xx,11,11,8,'#101c27',2);}
  box(c,-37,-15,74,30,grad(c,-37,-15,74,30,color,'#304450'),9);box(c,-17,-13,37,26,grad(c,-17,-13,37,26,'#263c4a','#142936'),6);box(c,-12,-10,24,20,color,5);
  poly(c,[[13,-10],[21,-8],[21,8],[13,10]],'#9cbdc0');poly(c,[[-13,-10],[-20,-8],[-20,8],[-13,10]],'#587c90');
  c.strokeStyle='#c8d4c666';c.lineWidth=.7;c.beginPath();c.moveTo(-31,-11);c.lineTo(31,-11);c.moveTo(-31,11);c.lineTo(31,11);c.stroke();
  box(c,30,-10,5,5,'#e8e4c2',1);box(c,30,5,5,5,'#e8e4c2',1);box(c,-36,-10,3,5,'#bb6978',1);box(c,-36,5,3,5,'#bb6978',1);box(c,35,-6,2,12,'#879b9e',1);
  const beam=c.createLinearGradient(35,0,100,0);beam.addColorStop(0,'#fff0c417');beam.addColorStop(1,'#fff0c400');poly(c,[[35,-10],[100,-27],[100,27],[35,10]],beam);c.restore();
 }

 // The architecture is paint-only. Building footprints, door coordinates,
 // navigation, occlusion ordering and every saved player plot remain unchanged.
 // Details are baked once into offscreen canvases, not rebuilt every frame.
 const ARCHITECTURE=Object.freeze({
  headquarters:{wall:'#45525c',shadow:'#192a35',roof:'#344751',trim:'#b4c6c4',glass:'#315769',glassLit:'#b8f0d1',metal:'#889fa7',title:'COMMAND'},
  arcade:{wall:'#47415e',shadow:'#211a37',roof:'#37334f',trim:'#b7a1ce',glass:'#292b55',glassLit:'#e4a4ff',metal:'#9688ac',title:'ARCADE'},
  nightlife:{wall:'#4e425b',shadow:'#211e34',roof:'#352c48',trim:'#bca5c1',glass:'#34315c',glassLit:'#f2acdf',metal:'#a991ba',title:'AFTER DARK'},
  industrial:{wall:'#555f62',shadow:'#273840',roof:'#40565f',trim:'#afc0bb',glass:'#2e4b58',glassLit:'#b7e4dc',metal:'#8ca0a2',title:'WORKS'},
  market:{wall:'#4a5862',shadow:'#1c303b',roof:'#334955',trim:'#a8c5ca',glass:'#315d69',glassLit:'#ebd7a3',metal:'#8daeb2',title:'EXCHANGE'},
  medical:{wall:'#4b6164',shadow:'#173d46',roof:'#355b60',trim:'#c1dfd9',glass:'#376b71',glassLit:'#b8ffe4',metal:'#a2d4cb',title:'MEDICAL'},
  creative:{wall:'#594d65',shadow:'#28233a',roof:'#453a52',trim:'#c7b8cf',glass:'#405168',glassLit:'#dcc6fa',metal:'#a8a1bc',title:'CREATIVE'},
  cafe:{wall:'#665951',shadow:'#42362e',roof:'#53443e',trim:'#d8c7a6',glass:'#536c67',glassLit:'#ffe0a6',metal:'#b7a58d',title:'SOCIAL'},
  arena:{wall:'#596269',shadow:'#293d43',roof:'#414e54',trim:'#b9c3b8',glass:'#334f5e',glassLit:'#ffcf9b',metal:'#97a9ad',title:'ARENA'},
  generic:{wall:'#4b5964',shadow:'#20333e',roof:'#394c56',trim:'#b2c8c9',glass:'#315465',glassLit:'#c3e9e2',metal:'#8da6a8',title:'CITY'}
 });
 function buildingProfile(b){
  const name=(b.id+' '+(b.label||'')+' '+(b.activity||'')+' '+(b.theme||'')).toLowerCase();
  let kind='generic';
  if(/proving ground|arena|stadium/.test(name))kind='arena';
  else if(/medic|clinic|medical|hospital/.test(name))kind='medical';
  else if(/arcade|game center/.test(name))kind='arcade';
  else if(/club|unfiltered|nightlife/.test(name))kind='nightlife';
  else if(/hq|headquarter|fortress|command|launch/.test(name))kind='headquarters';
  else if(/garage|motors|workshop|factory|supply|outfitters/.test(name))kind='industrial';
  else if(/market|exchange|trading|insider|token/.test(name))kind='market';
  else if(/gallery|studio|print|creator|art/.test(name))kind='creative';
  else if(/cafe|lounge|common room|boardwalk/.test(name))kind='cafe';
  return {kind,...ARCHITECTURE[kind],accent:b.hue||'#90c7be'};
 }
 // Window patterns are deterministic across Solo and Together, and never use
 // Math.random(), Date.now() or high-cost per-frame shader effects.
 function buildingSeed(b){let seed=2166136261;for(const ch of String(b.id||b.label||'city-building'))seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;return seed;}
 function building(c,b,image){
  const {x,y,w,h}=b,p=buildingProfile(b),accent=p.accent,ground=y+h,
   top=y-57,shopTop=ground-94,upper=Math.max(35,shopTop-top-10),seed=buildingSeed(b),
   cols=Math.max(2,Math.min(15,Math.floor((w-50)/62))),rows=Math.max(1,Math.min(5,Math.floor(upper/48))),
   bay=(w-44)/cols; // Visual width only: never changes collision geometry.
  c.save();
  // Contact shadow and two offset silhouettes make buildings sit in the scene.
  const shadow=c.createRadialGradient(x+w/2,ground+12,15,x+w/2,ground+12,w*.73);
  shadow.addColorStop(0,'#020c17a8');shadow.addColorStop(1,'#020c1700');
  c.fillStyle=shadow;c.fillRect(x-w*.24,ground-35,w*1.5,115);
  poly(c,[[x+12,ground-1],[x+w+12,ground-1],[x+w+49,ground+35],[x+48,ground+35]],'#06131d63');
  // West/south/east structure: roof projects forward, with an actual return wall.
  poly(c,[[x+w-6,top],[x+w+29,top+25],[x+w+29,ground-6],[x+w-6,ground]],p.shadow);
  box(c,x+1,top,w-3,ground-top,grad(c,x,top,w,ground-top,p.wall,p.shadow),3);
  box(c,x+11,top+10,w-23,shopTop-top-9,
    grad(c,x+10,top+6,w,Math.max(20,shopTop-top),p.wall,p.shadow),1);
  box(c,x+10,top+4,w-21,4,p.trim+'99',1);
  // Material detail: masonry courses, seams, and high vertical pilasters.
  const course=p.kind==='industrial'||p.kind==='arena'?16:28;
  c.save();c.beginPath();c.rect(x+12,top+13,w-26,Math.max(0,shopTop-top-13));c.clip();
  for(let yy=top+14;yy<shopTop-2;yy+=course){
   c.strokeStyle=p.kind==='industrial'?'#c1d6d51b':'#dce6e51a';c.lineWidth=1;
   c.beginPath();c.moveTo(x+14,yy);c.lineTo(x+w-14,yy);c.stroke();
   if(p.kind==='industrial')for(let xx=x+19;xx<x+w-16;xx+=22)box(c,xx,yy+2,1,course-3,'#050e1b25');
  }
  for(let i=0;i<Math.min(18,Math.ceil(w/80));i++){
   const xx=x+18+(i*83)%Math.max(20,w-36),yy=top+13+((i*57)%Math.max(14,shopTop-top-22));
   box(c,xx,yy,9,2,i%2?'#eff9f311':'#07182425',1);
  }
  c.restore();
  // Full-depth floor-to-ceiling glazing: layered glass, heavy mullions,
  // interior light, blinds, and angled reflections.
  const windowArea=Math.max(28,shopTop-top-28),rowH=Math.min(52,windowArea/rows);
  for(let floor=0;floor<rows;floor++)for(let i=0;i<cols;i++){
   const wx=x+22+bay*i+4,wy=top+16+floor*rowH,
    ww=Math.max(15,bay-13),wh=Math.max(13,rowH-8),
    lit=((seed+i*17+floor*29)>>>0)%5!==0;
   box(c,wx-3,wy-3,ww+6,wh+6,'#152531',2);
   box(c,wx,wy,ww,wh,grad(c,wx,wy,ww,wh,lit?p.glassLit:p.glass,p.glass),1);
   box(c,wx+2,wy+2,ww*.31,wh*.7,'#f4fff122',1);
   poly(c,[[wx+ww*.55,wy],[wx+ww*.83,wy],[wx+ww*.38,wy+wh],[wx+ww*.1,wy+wh]],'#e5f8f21d');
   box(c,wx+ww*.47,wy,2,wh,p.metal,0);
   box(c,wx,wy+wh*.56,ww,1.4,p.metal+'b8');
   if(lit){box(c,wx+ww*.05,wy+wh-4,ww*.9,2,accent+'66');}
   if(p.kind==='nightlife'||p.kind==='arcade')box(c,wx+2,wy+wh-2,ww-4,2,accent+'bb');
  }
  for(let i=0;i<=cols;i++){const xx=x+16+i*(w-32)/cols;box(c,xx,top+7,3,shopTop-top-4,p.metal+'96');}
  // 2.5D roof: visible pitched slab, parapet lip, side return, coping
  // highlights and HVAC equipment. All remain inside the cached sprite.
  poly(c,[[x-6,top-7],[x+w-6,top-7],[x+w+25,top+23],[x+25,top+23]],p.roof);
  poly(c,[[x-6,top-7],[x+w-6,top-7],[x+w-6,top+1],[x-6,top+1]],p.trim);
  poly(c,[[x+w-6,top-7],[x+w+25,top+23],[x+w+25,top+30],[x+w-6,top+1]],p.shadow);
  c.strokeStyle='#f5fcf54a';c.lineWidth=1.5;c.beginPath();c.moveTo(x+20,top+19);c.lineTo(x+w+16,top+19);c.stroke();
  // Vents, fans, solar panels, roof access and safety rails vary by footprint.
  for(let i=0;i<Math.min(5,Math.max(1,Math.floor(w/180)));i++){
   const xx=x+35+i*((w-85)/Math.max(1,Math.min(5,Math.floor(w/180))));
   box(c,xx,top-28,Math.min(42,w/9),21,'#142a35',3);
   box(c,xx+3,top-29,Math.min(35,w/10),10,p.metal,1);
   c.strokeStyle='#142d35';c.lineWidth=1;
   for(let j=0;j<4;j++){c.beginPath();c.moveTo(xx+6+j*7,top-27);c.lineTo(xx+6+j*7,top-21);c.stroke();}
  }
  if(['headquarters','arena'].includes(p.kind)){
   // Fortified merlons and broad roof spotlights.
   for(let xx=x+20;xx<x+w-20;xx+=55)box(c,xx,top-24,25,18,p.metal,2);
   for(const xx of [x+23,x+w-28]){
    box(c,xx,top-48,5,28,p.trim,1);box(c,xx-8,top-52,22,10,'#d3d6ce',2);
    poly(c,[[xx-10,top-43],[xx+10,top-43],[xx+66,top+42],[xx-66,top+42]],'#fff3c00d');
   }
  }else if(p.kind==='industrial'){
   for(let i=0;i<2;i++){const xx=x+w*.7+i*35;
    box(c,xx,top-57,20,46,'#344852',3);box(c,xx-3,top-60,26,6,p.trim,2);
    c.strokeStyle='#b5c4c049';c.lineWidth=3;c.beginPath();c.moveTo(xx+4,top-52);c.lineTo(xx+4,top-21);c.stroke();
   }
  }else{
   box(c,x+w*.76,top-34,Math.min(72,w*.15),24,'#1a3543',2);
   box(c,x+w*.76+4,top-30,Math.min(64,w*.14),16,'#5f8290',1);
  }
  // Ground floor uses deep recessed glass with realistic entrance framing.
  box(c,x-3,shopTop,w+6,94,grad(c,x,shopTop,w,94,p.wall,p.shadow),2);
  box(c,x-6,shopTop-11,w+12,13,p.roof,2);
  box(c,x-6,shopTop-11,w+12,3,p.trim,1);
  const doorW=Math.max(52,Math.min(80,w*.23)),doorX=x+w/2-doorW/2,doorY=shopTop+10;
  for(let i=0;i<Math.min(10,Math.floor((w-32)/56));i++){
   const wx=x+18+i*((w-36)/Math.min(10,Math.floor((w-32)/56))),ww=Math.max(23,(w-36)/Math.min(10,Math.floor((w-32)/56))-7);
   if(wx+ww>doorX-7&&wx<doorX+doorW+7)continue;
   box(c,wx-2,shopTop+9,ww+4,65,'#142635',2);
   box(c,wx,shopTop+12,ww,58,grad(c,wx,shopTop,ww,58,p.glassLit,p.glass),1);
   poly(c,[[wx+4,shopTop+13],[wx+ww*.45,shopTop+13],[wx+4,shopTop+46]],'#f4fbf431');
   box(c,wx+ww*.5,shopTop+12,2,58,p.trim+'9c');
  }
  // Door is visually centered exactly above CityInteriors.door(b).
  box(c,doorX-9,doorY-5,doorW+18,78,'#10222d',3);
  box(c,doorX-4,doorY,doorW+8,69,p.metal,2);
  box(c,doorX,doorY+4,doorW,61,grad(c,doorX,doorY,doorW,62,p.glassLit,p.glass),1);
  box(c,doorX+doorW/2-1,doorY+4,2,61,'#c9d3cd');
  for(const side of [-1,1])box(c,doorX+doorW/2+side*(doorW*.28),doorY+35,2.4,13,'#e9dbb1',1);
  poly(c,[[doorX+3,doorY+7],[doorX+doorW*.45,doorY+7],[doorX+4,doorY+52]],'#fffbe633');
  box(c,doorX-14,ground-3,doorW+28,6,p.trim,1);
  // A real layered marquee replaces the old flat text strip.
  box(c,x+13,shopTop-32,w-26,28,'#0c1c2bdc',4);
  box(c,x+17,shopTop-28,w-34,20,grad(c,x+17,shopTop-28,w-34,20,p.roof,p.shadow),2);
  box(c,x+15,shopTop-33,w-30,2.5,accent,1);
  box(c,x+17,shopTop-8,w-34,2,accent+'bf',1);
  c.font=`800 ${Math.min(17,Math.max(10,w/24))}px Arial`;
  c.fillStyle='#f1f6ed';c.textAlign='center';c.textBaseline='alphabetic';
  c.fillText((b.label||p.title).toUpperCase(),x+w/2,shopTop-12,w-56);
  // Venue-specific authored street architecture, not just hue swaps.
  if(p.kind==='arcade'||p.kind==='nightlife'){
   for(const xx of [x+11,x+w-16]){box(c,xx,shopTop-31,6,109,'#13182d');
    for(let j=0;j<9;j++)box(c,xx+1,shopTop-26+j*11,4,7,j%2?accent:p.glassLit,2);}
   for(let i=0;i<Math.min(9,Math.floor(w/42));i++)box(c,x+26+i*(w-52)/Math.max(1,Math.min(9,Math.floor(w/42))-1||1),shopTop-10,6,3,'#f3fff1',1);
  }else if(p.kind==='cafe'){
   poly(c,[[x+15,shopTop+3],[x+w-15,shopTop+3],[x+w-27,shopTop+31],[x+29,shopTop+31]],'#d3c09e');
   for(let i=0;i<8;i++)poly(c,[[x+15+i*(w-30)/8,shopTop+4],[x+15+(i+1)*(w-30)/8,shopTop+4],
    [x+29+(i+1)*(w-58)/8,shopTop+31],[x+29+i*(w-58)/8,shopTop+31]],i%2?'#e9d1b2':accent);
  }else if(p.kind==='industrial'){
   for(const xx of [x+21,x+w-90]){box(c,xx,shopTop+16,65,59,'#1b323e',2);
    for(let j=0;j<6;j++)box(c,xx+3,shopTop+21+j*9,59,2,p.metal+'91');
   }
  }else if(p.kind==='medical'){
   const xx=x+w-41,yy=shopTop+39;
   box(c,xx-14,yy-5,28,10,'#e5fff2',2);box(c,xx-5,yy-14,10,28,'#e5fff2',2);
  }else if(p.kind==='headquarters'){
   for(const xx of [x+20,x+w-25]){box(c,xx,shopTop+8,10,73,p.metal,2);
    box(c,xx-6,shopTop+9,22,7,'#d9cdb1',1);}
  }else if(p.kind==='creative'){
   for(let i=0;i<5;i++){const xx=x+26+i*(w-52)/5;if(xx>doorX-30&&xx<doorX+doorW+15)continue;
    box(c,xx,shopTop+31,26,26,['#d5b3df','#a1d8cd','#efceaa','#b4c6e5','#e0b2cb'][i],3);}
  }else if(p.kind==='market'){
   box(c,x+w-77,shopTop+33,47,22,'#122c38',3);
   c.font='700 13px Arial';c.fillStyle='#cbf5ca';c.fillText('▲',x+w-53,shopTop+48);
  }
  // Identity decal, subtle neon tubes, wall lights and a lit footpath.
  if(image?.complete&&image.naturalWidth){
   const badge=Math.min(73,Math.max(32,w*.17)),bx=x+w-15-badge,by=top+32;
   box(c,bx-6,by-6,badge+12,badge+12,'#132835',7);
   box(c,bx-4,by-4,badge+8,badge+8,accent+'65',6);
   c.save();c.beginPath();c.roundRect(bx,by,badge,badge,4);c.clip();c.drawImage(image,bx,by,badge,badge);c.restore();
   box(c,bx-4,by+badge+3,badge+8,3,accent,2);
  }
  for(const xx of [x+10,x+w-12]){
   box(c,xx,shopTop+6,7,44,p.metal,2);box(c,xx-5,shopTop+9,17,11,'#ffe7b9',3);
   const glow=c.createRadialGradient(xx+3,shopTop+18,1,xx+3,shopTop+18,50);
   glow.addColorStop(0,'#ffe6b730');glow.addColorStop(1,'#ffe6b700');
   c.fillStyle=glow;c.fillRect(xx-46,shopTop-30,100,100);
  }
  box(c,x-5,ground-5,w+10,7,p.trim,1);
  box(c,x+8,ground+4,w-16,4,accent+'88',1);
  const wash=c.createLinearGradient(0,ground,0,ground+50);
  wash.addColorStop(0,accent+'31');wash.addColorStop(1,accent+'00');
  c.fillStyle=wash;c.fillRect(x+12,ground+6,w-24,50);
  // Plaques / bollards are drawn beside, never across, the entry.
  for(const xx of [x+16,x+w-23]){
   box(c,xx,ground+5,7,15,'#7e8e8a',3);box(c,xx-1,ground+4,9,4,'#c2d7c9',2);
  }
  c.restore();
 }
 function buildingFX(c,b,time,reduced=false){
  // Lightweight screen-space lighting, applied only when a building is near
  // the camera. No expensive geometry or dynamic light maps per frame.
  if(reduced)return;
  const p=buildingProfile(b),phase=1+Math.sin(time/430+buildingSeed(b)%11)*.14;
  const x=b.x+b.w/2,y=b.y+b.h-96;
  c.save();c.globalAlpha=Math.max(.2,Math.min(.75,phase*.55));
  c.strokeStyle=p.accent;c.lineWidth=2;
  c.beginPath();c.moveTo(x-b.w*.29,y-36);c.lineTo(x+b.w*.29,y-36);c.stroke();
  if(['nightlife','arcade','market'].includes(p.kind)){
   c.fillStyle=p.accent+'33';c.fillRect(x-b.w*.29,y-38,b.w*.58,4);
  }
  c.restore();
 }
 function hubGround(c){
  c.save();
  // Replace the flat plaza with large slate slabs, planted beds and layered coping.
  box(c,743,612,604,275,'#172a34',14);box(c,752,620,586,257,'#a0aba4',10);box(c,760,628,570,241,grad(c,760,628,570,240,'#71818a','#4e626e'),7);
  for(let yy=630;yy<868;yy+=24)for(let xx=760+((yy/24|0)%2)*24;xx<1330;xx+=48){box(c,xx+1,yy+1,46,22,((xx+yy)%5)?'#b0c0c608':'#182c3d18',1);c.strokeStyle='#1c344a33';c.lineWidth=.7;c.strokeRect(xx,yy,48,24);}
  box(c,972,672,148,122,'#132832',21);box(c,977,668,138,118,'#bac4b9',20);box(c,986,678,120,99,'#233f4a',17);box(c,991,683,110,87,grad(c,991,683,110,87,'#6dafb8','#245c75'),15);
  c.strokeStyle='#c4f3eb66';c.lineWidth=1;for(let i=0;i<5;i++){c.beginPath();c.ellipse(1046,724,16+i*8,9+i*5,0,0,7);c.stroke();}box(c,1040,703,13,36,'#becbc1',3);c.fillStyle='#d9f4e7';c.beginPath();c.ellipse(1046,703,17,8,0,0,7);c.fill();
  for(const [x,y]of [[775,640],[1303,640],[775,830],[1303,830]]){box(c,x-18,y-8,36,27,'#172b33',4);box(c,x-20,y-11,40,22,'#83938a',4);}
  text(c,'FOUNDER SQUARE',1045,850,13,'#e3e8df');
  // These signs point to the new surrounding districts, not the retired map gates.
   for(const [title,hint,x,y,color] of [
    ['PLAYER FORTRESS','SOUTH / CENTER',1120,1490,'#b6cd8c'],
    ['CREATOR QUARTER','EAST',1930,860,'#c5a2e2'],
    ['OFFENDED COMMONS','WEST',300,860,'#b6e87a'],
    ['SIX CLAN HQs','EXPLORE THE RING',1120,205,'#83b8ed']
   ]){box(c,x-100,y-48,200,84,'#152735',12);box(c,x-95,y-52,190,75,grad(c,x-95,y-52,190,75,'#405965','#223a49'),9);box(c,x-83,y-43,166,4,color,1);text(c,title,x,y-13,13,color);text(c,hint,x,y+12,10,'#d8e2df');}

  c.restore();
 }
 function floor(c,area){
  if(cache.has(area)){c.drawImage(cache.get(area),0,0);return;}
  const surface=document.createElement('canvas');surface.width=2240;surface.height=1660;const g=surface.getContext('2d'),theme=C.DISTRICTS.find(d=>d.id===area);
  g.fillStyle=grad(g,0,0,2240,1660,'#273c48','#112635');g.fillRect(0,0,2240,1660);
  // Waterfront district is an island of terraced stone amid evening water.
  box(g,160,210,1920,1340,'#142e3a',35);box(g,177,226,1886,1305,'#8b9c9c',27);box(g,185,234,1870,1290,'#526773',22);
  for(let yy=240;yy<1520;yy+=32)for(let xx=190;xx<2050;xx+=64){box(g,xx+1,yy+1,62,30,(Math.floor(xx/64+yy/32)%5)?'#cad8d609':'#142c3e1c',1);}
  box(g,950,650,340,880,'#243c4d',0);for(let yy=670;yy<1500;yy+=25){box(g,956,yy,328,1,'#adc1be18');}box(g,185,790,1870,160,'#263e4c');
  g.setLineDash([12,18]);g.strokeStyle='#d0d2b141';g.lineWidth=2;g.beginPath();g.moveTo(200,870);g.lineTo(2040,870);g.stroke();g.setLineDash([]);
  for(const [x,y]of [[280,690],[1950,690],[280,1180],[1950,1180],[830,1130],[1400,1130]]){box(g,x-34,y-12,68,40,'#223f42',4);box(g,x-32,y-17,64,35,'#80968a',4);}
  text(g,theme.name.toUpperCase(),1120,285,44,'#e5e9de');text(g,theme.tag,1120,315,12,theme.color);
  if(area==='fortress'){
   box(g,P.x-17,P.y-17,P.cols*64+34,P.rows*64+34,'#162f3c',12);box(g,P.x-8,P.y-8,P.cols*64+16,P.rows*64+16,'#87968b',8);box(g,P.x,P.y,P.cols*64,P.rows*64,'#455d53');
   for(let row=0;row<P.rows;row++)for(let col=0;col<P.cols;col++){g.fillStyle=(row+col)%2?'#7795790c':'#172d3510';g.fillRect(P.x+col*64,P.y+row*64,64,64);g.strokeStyle='#acc5a424';g.lineWidth=.7;g.strokeRect(P.x+col*64,P.y+row*64,64,64);}
   text(g,'YOUR PRIVATE PLOT / 16 × 10',1120,402,13,'#c7ddb7');text(g,'OPEN BUILD TO SHAPE YOUR CITY',1120,1160,12,'#c7ddb7');
    // A visual central base landmark, at the open entrance near player spawn.
    // It is a paint-only decoration; collision and walking paths are unchanged.
    g.save();g.translate(1120,1315);
    g.fillStyle='#152e3a';g.beginPath();g.ellipse(0,0,250,126,0,0,Math.PI*2);g.fill();
    g.strokeStyle='#b6e87a';g.lineWidth=7;g.beginPath();g.ellipse(0,0,238,117,0,0,Math.PI*2);g.stroke();
    g.strokeStyle='#8eb7b570';g.lineWidth=3;g.beginPath();g.moveTo(-210,0);g.lineTo(210,0);g.moveTo(0,-96);g.lineTo(0,96);g.stroke();
    text(g,'CENTER CITY',0,-32,27,'#d8f4c0');
    text(g,'YOUR FORTRESS HQ',0,6,19,'#b6e87a');
    text(g,'SIX CLAN TERRITORIES · SHOPS ALL AROUND',0,38,11,'#c0d2cc');
    g.restore();
    text(g,'↑ FOUNDER SQUARE',1120,1118,14,'#b6e87a');
    text(g,'CENTER CITY / PLAYER SPAWN',1120,1570,15,'#d8ead1');
  }
  if(area==='social'){
   box(g,185,1110,740,415,'#23495e',0);for(let i=0;i<45;i++){const x=210+(i*197)%690,y=1130+(i*71)%360;g.strokeStyle='#97c9d324';g.beginPath();g.moveTo(x,y);g.lineTo(x+25+i%30,y);g.stroke();}
   box(g,250,1125,650,110,'#766f62',2);for(let x=254;x<900;x+=13)box(g,x,1125,2,110,'#353b3f66');
   for(let x=270;x<900;x+=90){box(g,x,1109,5,18,'#b7b8a0',1);box(g,x,1235,5,16,'#b7b8a0',1);}box(g,260,1110,640,3,'#a7b6ac');
  }
  if(area==='arena'){box(g,540,985,300,240,'#394c56',8);for(let x=560;x<820;x+=56)box(g,x,1008,34,190,'#d1a47c16',2);text(g,'TRAIN · THEN TAKE A CONTRACT',690,1250,11,'#dfb89b');}
  // Grain is baked once per district, not recalculated every frame.
  let seed=1761;for(let i=0;i<18000;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;const x=(seed>>>0)%2240;seed=(Math.imul(seed,1664525)+1013904223)|0;const y=(seed>>>0)%1660;g.fillStyle=i%2?'#e4e9e807':'#07172613';g.fillRect(x,y,1.4,.8);}
  cache.set(area,surface);if(cache.size>3)cache.delete(cache.keys().next().value);c.drawImage(surface,0,0);
 }
 function paintPiece(c,o,image,ticker,alpha=1){
  const x=P.x+o.col*64,y=P.y+o.row*64;c.save();c.globalAlpha=alpha;
  poly(c,[[x+5,y+57],[x+57,y+57],[x+80,y+72],[x+27,y+72]],'#07131c55');
  if(o.kind==='floor'){box(c,x+1,y+1,62,62,grad(c,x,y,64,64,'#9ba9a8','#657b85'),2);c.strokeStyle='#28425088';c.strokeRect(x+4,y+4,56,56);}
  if(o.kind==='wall'){
   const wide=o.rotation%2===0;const w=wide?62:20,h=wide?20:62,xx=x+(64-w)/2,yy=y+(64-h)/2;
   box(c,xx,yy-34,w,h+34,grad(c,xx,yy,w,h+34,'#80959f','#3b5669'),2);box(c,xx-2,yy-38,w+4,h,'#b2bdb6',2);for(let line=yy-10;line<yy+h;line+=12){c.strokeStyle='#d4ddd526';c.beginPath();c.moveTo(xx,line);c.lineTo(xx+w,line);c.stroke();}
  }
  if(o.kind==='tower'||o.kind==='home'){
   const tower=o.kind==='tower',lift=tower?108:62;box(c,x+5,y-lift+8,54,lift+50,grad(c,x,y,60,90,'#8498a2','#304e61'),3);box(c,x+1,y-lift,62,31,'#a8b6ae',3);box(c,x+7,y-lift+5,50,19,'#253f51',2);
   for(let sy=y-lift+33;sy<y+48;sy+=12){c.strokeStyle='#e2ece51c';c.lineWidth=.8;c.beginPath();c.moveTo(x+7,sy);c.lineTo(x+57,sy);c.stroke();}if(!tower){poly(c,[[x-2,y-lift+4],[x+32,y-lift-19],[x+66,y-lift+4]],'#536b76');poly(c,[[x+32,y-lift-19],[x+66,y-lift+4],[x+32,y-lift+4]],'#324e63');box(c,x+42,y-lift-20,8,18,'#a1b5ad',1);}if(tower){for(const xx of [8,46])box(c,x+xx,y-lift-7,10,13,'#a9b9b0',1);box(c,x+16,y-44,31,20,'#142c3c');box(c,x+18,y-42,27,15,'#b7c3a8');}else{box(c,x+16,y+21,30,35,'#18384b',1);box(c,x+20,y+25,22,27,'#72969e',1);}
   if(image?.complete&&image.naturalWidth){c.drawImage(image,x+16,y-lift+36,32,30);box(c,x+14,y-lift+68,36,3,'#bdcf9f');}
  }
  if(o.kind==='tree')tree(c,x+32,y+48,.75);
  if(o.kind==='lamp')lamp(c,x+32,y+50);
  if(o.kind==='banner'){box(c,x+28,y-38,5,95,'#a7b6b6',2);box(c,x+3,y-39,58,4,'#bcc5b6',1);box(c,x+7,y-35,50,56,'#263b50',2);if(image?.complete&&image.naturalWidth)c.drawImage(image,x+10,y-32,44,43);text(c,'$'+ticker,x+32,y+19,6,'#e9f0dc');}
  c.restore();
 }
 function piece(c,o,image,ticker,alpha=1){
  const key=[o.kind,o.rotation||0,ticker,!!image?.complete&&!!image.naturalWidth].join('|');let sprite=pieceCache.get(key);
  if(!sprite){sprite=document.createElement('canvas');sprite.width=256;sprite.height=320;const g=sprite.getContext('2d');g.translate(80-P.x,170-P.y);paintPiece(g,{...o,col:0,row:0},image,ticker);pieceCache.set(key,sprite);if(pieceCache.size>96)pieceCache.delete(pieceCache.keys().next().value);}
  c.save();c.globalAlpha=alpha;c.drawImage(sprite,P.x+o.col*64-80,P.y+o.row*64-170);c.restore();
 }
 const sceneryCache=new Map();
 function scenery(c,p,view){return C.SCENERY.filter(o=>!view||view(o.x-100,o.y-160,200,200)).map(o=>({y:o.y,draw:()=>{
  const variant=Math.abs(Math.round(o.x+o.y))%3,key=[o.kind,o.scale,variant].join('|');let sprite=sceneryCache.get(key);
  if(!sprite){sprite=document.createElement('canvas');sprite.width=220;sprite.height=260;const g=sprite.getContext('2d');g.translate(100,210);
   if(o.kind==='tree')tree(g,0,0,o.scale,variant);else if(o.kind==='lamp')lamp(g,0,0);else{poly(g,[[0,0],[90,0],[108,10],[18,10]],'#030c1844');box(g,0,-32,90,9,'#718a8a',3);box(g,0,-21,90,11,'#a39b7e',3);for(const xx of [8,75])box(g,xx,-12,6,16,'#253c49',2);}
   sceneryCache.set(key,sprite);
  }c.drawImage(sprite,o.x-100,o.y-210);
 }}));}
 // Previously district landmark buildings rebuilt their entire facade every
 // animation frame. Bake them once like the 47 real storefront buildings.
 const landmarkSprites=new Map();
 function landmarkBuilding(c,b,image){
  const ready=!!image?.complete&&!!image.naturalWidth;
  const key=(b.label||b.id)+'|'+b.w+'|'+b.h+'|'+(ready?image.src:'');
  let sprite=landmarkSprites.get(key);
  if(!sprite){
   const canvas=document.createElement('canvas');
   canvas.width=b.w+180;canvas.height=b.h+240;
   const g=canvas.getContext('2d');g.translate(65-b.x,120-b.y);
   building(g,b,image);sprite=canvas;landmarkSprites.set(key,sprite);
   if(landmarkSprites.size>8)landmarkSprites.delete(landmarkSprites.keys().next().value);
  }
  c.drawImage(sprite,b.x-65,b.y-120);
 }
 function districtProps(c,area,player,art,catalog,time){
  const token=catalog.get(player.avatar),image=art.get(player.avatar);const layers=[];
  if(area==='fortress')for(const o of player.plot||[])layers.push({y:P.y+o.row*64+58,draw:()=>piece(c,o,image,token.ticker)});
  else{
   for(const b of C.districtBlocks(area))layers.push({y:b.y+b.h,draw:()=>{landmarkBuilding(c,b,image);buildingFX(c,b,time);}});
   if(area==='creator'){let i=0;for(const t of catalog.values()){const xx=400+i*280;layers.push({y:1060,draw:()=>{box(c,xx-47,1000,94,18,'#142b3a',3);box(c,xx-45,907,90,96,'#a4b2ac',3);box(c,xx-39,913,78,78,'#1c3448',2);const img=art.get(t.id);if(img?.complete&&img.naturalWidth)c.drawImage(img,xx-35,917,70,70);text(c,'$'+t.ticker,xx,1036,11,'#d6c8eb');}});i++;}}
   if(area==='social')for(let i=0;i<4;i++){const x=490+i*125,y=1045+Math.sin(time/1700+i)*8;layers.push({y,draw:()=>root.CityVisuals.person(c,{id:'boardwalk-'+i,x,y,role:'civilian',style:{skin:i+1,hair:i,pants:i},color:['#927b87','#708b82','#8c9272','#6d7b98'][i],moving:true,phase:i,scale:.85},time)});}
   if(area==='social'){for(let i=0;i<5;i++)layers.push({y:1040+i*12,draw:()=>{const xx=1500+(i%3)*100,yy=1000+i*15;c.fillStyle='#1b3448';c.beginPath();c.ellipse(xx,yy,33,17,0,0,7);c.fill();box(c,xx-3,yy,6,35,'#a0aaa3');box(c,xx-25,yy-10,50,8,'#b2b6a6',3);}});}
  }
  return layers;
 }
 root.CityDistricts=Object.freeze({land,car,building,buildingFX,buildingProfile,hubGround,floor,piece,districtProps,scenery,tree,lamp});
})(window);
