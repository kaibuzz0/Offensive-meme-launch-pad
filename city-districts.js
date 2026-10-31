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
 function building(c,b,image){
  const x=b.x,y=b.y,w=b.w,h=b.h,face=y+h-85,accent=b.hue||'#829491';c.save();
  poly(c,[[x+15,y+h],[x+w+15,y+h],[x+w+65,y+h+45],[x+65,y+h+45]],'#040c154a');
  // Stepped roof, masonry side returns and a full-height shopfront.
  box(c,x,y-54,w,h-31,grad(c,x,y,w,h,'#57646b','#293c48'),4);
  box(c,x+8,y-46,w-16,h-47,grad(c,x,y,w,h,'#263b47','#1a2b37'),2);
  for(let yy=y-32;yy<face-14;yy+=16){c.strokeStyle='#cfdae018';c.lineWidth=.7;c.beginPath();c.moveTo(x+10,yy);c.lineTo(x+w-10,yy);c.stroke();for(let xx=x+12+(Math.floor(yy/16)%2)*24;xx<x+w-14;xx+=48){c.beginPath();c.moveTo(xx,yy);c.lineTo(xx,yy+15);c.stroke();}}
  box(c,x+15,y-36,w-30,h-100,grad(c,x,y,w,h,'#43555e','#253846'),3);
  // Rooftop planters, ventilation and skylights read at game scale.
  for(let i=0;i<3;i++){const xx=x+30+i*53;box(c,xx,y-18,43,30,'#152832',3);box(c,xx+2,y-20,39,24,'#7b8d92',2);c.strokeStyle='#30434e';for(let j=0;j<4;j++){c.beginPath();c.moveTo(xx+6+j*8,y-16);c.lineTo(xx+6+j*8,y);c.stroke();}}
  box(c,x+w-93,y-25,66,48,'#172831',3);box(c,x+w-89,y-29,58,44,'#667c83',3);c.strokeStyle='#263b45';for(let j=0;j<4;j++){c.beginPath();c.ellipse(x+w-60,y-7,7+j*4,5+j*3,0,0,7);c.stroke();}
  if(image?.complete&&image.naturalWidth){c.save();c.beginPath();c.roundRect(x+w/2-46,y+28,92,80,5);c.clip();c.drawImage(image,x+w/2-46,y+22,92,92);c.fillStyle='#182c4328';c.fillRect(x+w/2-46,y+22,92,92);c.restore();box(c,x+w/2-48,y+108,96,4,accent,1);}
  box(c,x,face,w,85,grad(c,0,face,0,85,'#52616a','#233340'));
  // Architectural piers divide reflective glazing into bays.
  for(let xx=x+14;xx<x+w-30;xx+=54){box(c,xx,face+8,42,59,'#0a1c29',2);box(c,xx+3,face+11,36,51,grad(c,xx,face,36,50,'#93acb1','#2d5362'));poly(c,[[xx+5,face+12],[xx+23,face+12],[xx+5,face+43]],'#eaf1e51b');box(c,xx+19,face+11,2,51,'#203b49');box(c,xx+3,face+35,36,2,'#203b49');}
  box(c,x+w/2-29,face+12,58,73,'#10222e',2);box(c,x+w/2-24,face+17,48,63,grad(c,0,face,0,73,'#6b909d','#1c3e51'));box(c,x+w/2,face+17,2,63,'#a6b3ae');box(c,x+w/2+17,face+48,2,10,'#e0d0a6');
  box(c,x-4,face-35,w+8,35,grad(c,x,0,w,0,'#152b38','#233c48'),3);box(c,x-4,face-35,w+8,3,accent,1);
  text(c,b.label,x+w/2,face-12,Math.min(18,w/19),'#f0eee4');
  box(c,x-6,y-58,w+12,9,'#a1aea9',2);box(c,x-6,y-49,w+12,4,'#122834');box(c,x,y+h-5,w,6,'#9caaa5');
  for(const xx of [x+9,x+w-16]){box(c,xx,face+3,7,75,'#8b9b9e');lamp(c,xx+4,y+h+10);}
  const wash=c.createLinearGradient(0,y+h,0,y+h+65);wash.addColorStop(0,accent+'35');wash.addColorStop(1,accent+'00');c.fillStyle=wash;c.fillRect(x+15,y+h+6,w-30,65);
  // Lit shopfront glass and a canopy give every building a clearer street-level entrance.
  const neon=b.hue||'#a5cfca';box(c,x+w/2-40,face+3,80,5,neon,2);box(c,x+w/2-36,face+8,72,3,'#e0f4de88',1);
  c.strokeStyle=neon+'77';c.lineWidth=1.5;c.strokeRect(x+w/2-28,face+14,56,67);
  text(c,'OPEN',x+w-43,face+49,8,'#d9f7ce');
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
 function districtProps(c,area,player,art,catalog,time){
  const token=catalog.get(player.avatar),image=art.get(player.avatar);const layers=[];
  if(area==='fortress')for(const o of player.plot||[])layers.push({y:P.y+o.row*64+58,draw:()=>piece(c,o,image,token.ticker)});
  else{
   for(const b of C.districtBlocks(area))layers.push({y:b.y+b.h,draw:()=>building(c,b,image)});
   if(area==='creator'){let i=0;for(const t of catalog.values()){const xx=400+i*280;layers.push({y:1060,draw:()=>{box(c,xx-47,1000,94,18,'#142b3a',3);box(c,xx-45,907,90,96,'#a4b2ac',3);box(c,xx-39,913,78,78,'#1c3448',2);const img=art.get(t.id);if(img?.complete&&img.naturalWidth)c.drawImage(img,xx-35,917,70,70);text(c,'$'+t.ticker,xx,1036,11,'#d6c8eb');}});i++;}}
   if(area==='social')for(let i=0;i<4;i++){const x=490+i*125,y=1045+Math.sin(time/1700+i)*8;layers.push({y,draw:()=>root.CityVisuals.person(c,{id:'boardwalk-'+i,x,y,role:'civilian',style:{skin:i+1,hair:i,pants:i},color:['#927b87','#708b82','#8c9272','#6d7b98'][i],moving:true,phase:i,scale:.85},time)});}
   if(area==='social'){for(let i=0;i<5;i++)layers.push({y:1040+i*12,draw:()=>{const xx=1500+(i%3)*100,yy=1000+i*15;c.fillStyle='#1b3448';c.beginPath();c.ellipse(xx,yy,33,17,0,0,7);c.fill();box(c,xx-3,yy,6,35,'#a0aaa3');box(c,xx-25,yy-10,50,8,'#b2b6a6',3);}});}
  }
  return layers;
 }
 root.CityDistricts=Object.freeze({land,car,building,hubGround,floor,piece,districtProps,scenery,tree,lamp});
})(window);
