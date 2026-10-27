/* Streetwear character art and environment finishing, rendered locally in canvas. */
'use strict';
(function(root){
 const cache=new Map();
 const skin=['#c38f6c','#e5b898','#8d583e','#5b382b','#d3a17d','#a4775c'];
 const hair=['#242329','#4d352d','#171e25','#9b7750'];
 const denim=['#27394f','#363b43','#4c5345','#466079'];
 function rounded(c,x,y,w,h,r,fill){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
 function gradient(c,x,y,w,h,a,b){const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,a);g.addColorStop(1,b);return g;}
 function text(c,value,x,y,size,color,weight='700'){c.fillStyle=color;c.font=`${weight} ${size}px Arial`;c.textAlign='center';c.fillText(value,x,y);}
 function drawBody(c,o,pose){
  const style=o.style||{},role=o.role||'player',cop=role==='cop',gang=role==='gang',civilian=role==='civilian',back=!!o.back;
  const tone=skin[style.skin||0],hairColor=hair[style.hair||0],pants=denim[style.pants||0],gear=o.gear||{};
  const accent=cop?'#8db9e4':gang?'#c56d83':o.color||'#b7ef84';
  const coat=cop?'#324c68':gang?'#4b293c':gear.outfit?'#5e7654':civilian?(o.color||'#647d8d'):'#303e4d';
  c.translate(65,132);
  // Articulated legs: shaped denim panels, stitching, knees, cuffs, and soles.
  for(const side of [-1,1]){
   const legX=side<0?-14:2,step=pose*side;
   rounded(c,legX-1,-40,14,34+step,5,gradient(c,legX,-40,16,37,pants,'#17232e'));
   c.strokeStyle='#8492a546';c.lineWidth=.7;c.beginPath();c.moveTo(legX+2,-36);c.lineTo(legX+2,-10+step);c.stroke();
   rounded(c,legX+1,-23+step*.4,10,9,2,'#9cabbe12');
   rounded(c,legX-2,-8+step,17,9,3,gear.feet?'#375c66':'#20242d');
   rounded(c,legX-2,-2+step,17,3,1,gear.feet?'#8de0d4':'#94a0ab');
   for(let n=0;n<3;n++){c.strokeStyle='#b9c5cd88';c.lineWidth=.7;c.beginPath();c.moveTo(legX+3,-6+step+n*1.5);c.lineTo(legX+10,-6+step+n*1.5);c.stroke();}
  }
  // Ticker on the trouser leg stays text, independent of the image print.
  if(!civilian&&!cop&&!gang){
   if(style.print===1&&o.image?.complete&&o.image.naturalWidth){
    for(const side of [-1,1]){const x=side<0?-14:2,step=pose*side;c.save();c.beginPath();c.roundRect(x,-38,12,28+step,3);c.clip();for(let y=-38;y<-10+step;y+=8)for(let px=x;px<x+12;px+=7){c.globalAlpha=.68;c.drawImage(o.image,px,y,6,6);}c.globalAlpha=1;c.fillStyle='#1522343c';c.fillRect(x,-38,12,31);c.restore();}
   }else if(style.print===2){
    rounded(c,-13,-35,25,9,1,'#a4b1b727');c.fillStyle='#e4ebee';c.font='700 4px Arial';c.textAlign='center';c.fillText((o.coinName||o.ticker||'MEME').toUpperCase(),0,-29,24);
    c.save();c.translate(-8,-25);c.rotate(Math.PI/2);text(c,`$${o.ticker||'MEME'}`,6,0,4,'#dbe7ed');c.restore();
   }else{c.save();c.translate(10,-36);c.rotate(Math.PI/2);text(c,`$${o.ticker||'MEME'}`,11,0,4.5,'#dbe7ed');c.restore();}
  }
  rounded(c,-15,-44,31,8,3,'#25303b');rounded(c,-14,-43,29,3,1,'#667784');rounded(c,-3,-43,6,4,1,'#afb9bd');
  // Arms and sleeves have fabric folds, shoulder seams, and visible hands.
  for(const side of [-1,1]){
   const x=side<0?-24:16,arm=pose*side*.65;
   if(o.gesture&&side===1){rounded(c,17,-94,9,27,4,coat);rounded(c,18,-111,7,20,3,tone);rounded(c,17,-116,9,10,3,tone);continue;}
   rounded(c,x,-74,9,24+arm,4,gradient(c,x,-74,10,27,coat,'#1b2836'));
   rounded(c,x+1,-54+arm,7,13,3,gradient(c,x,-53,9,12,tone,'#79503c'));
   rounded(c,x+.2,-44+arm,8,7,3,tone);
   c.strokeStyle='#c4d1d22b';c.lineWidth=.7;c.beginPath();c.moveTo(x+2,-67);c.lineTo(x+6,-67);c.stroke();
  }
  c.fillStyle=gradient(c,-20,-78,40,40,coat,'#1a2633');c.beginPath();c.moveTo(-14,-78);c.quadraticCurveTo(-22,-75,-20,-65);c.lineTo(-16,-42);c.quadraticCurveTo(0,-38,17,-42);c.lineTo(20,-65);c.quadraticCurveTo(19,-75,13,-78);c.closePath();c.fill();
  c.strokeStyle='#d4e3ef22';c.lineWidth=.8;c.beginPath();c.moveTo(-16,-70);c.lineTo(-13,-45);c.moveTo(16,-70);c.lineTo(13,-45);c.stroke();
  rounded(c,-10,-81,21,7,3,'#172432');
  if(gear.outfit){
   c.fillStyle=gradient(c,-18,-77,36,36,'#b5d178','#6f985c');
   c.beginPath();c.moveTo(-14,-77);c.lineTo(-7,-73);c.lineTo(-9,-43);c.lineTo(-17,-43);c.lineTo(-20,-68);c.closePath();c.fill();
   c.beginPath();c.moveTo(14,-77);c.lineTo(8,-73);c.lineTo(10,-43);c.lineTo(17,-43);c.lineTo(20,-68);c.closePath();c.fill();
   c.strokeStyle='#e9f6bc77';c.lineWidth=.8;c.beginPath();c.moveTo(-14,-73);c.lineTo(-12,-46);c.moveTo(14,-73);c.lineTo(13,-46);c.stroke();
  }
  if(cop){
   rounded(c,-15,-72,31,26,3,'#253b54');
   if(back)text(c,'POLICE',0,-57,6,'#e8f0f6');else{rounded(c,-11,-67,8,9,2,'#c9b678');rounded(c,4,-67,9,2,0,'#b9cfe1');text(c,'CITY',0,-47,4,'#bacddb');}
   rounded(c,-19,-44,38,5,2,'#111c28');rounded(c,-17,-46,7,9,2,'#263443');
  }else if(gang){text(c,back?'RUG CREW':'RUG',0,-58,back?5.5:8,'#d8b0bc');text(c,'NO REFUNDS',0,-49,3.6,'#c194a5');}
  else if(!civilian){
   const image=o.image,printW=back?29:24,printH=back?25:23,printY=back?-73:-71;
   c.save();c.beginPath();c.roundRect(-printW/2,printY,printW,printH,1.4);c.clip();
   if(image?.complete&&image.naturalWidth)c.drawImage(image,-printW/2,printY,printW,printH);
   else{c.fillStyle=accent;c.fillRect(-printW/2,printY,printW,printH);text(c,'o!',0,printY+17,16,'#182536');}
   const glaze=c.createLinearGradient(-12,0,12,0);glaze.addColorStop(0,'#ffffff17');glaze.addColorStop(.5,'#ffffff00');glaze.addColorStop(1,'#00000027');c.fillStyle=glaze;c.fillRect(-15,printY,30,printH);c.restore();
   text(c,`$${o.ticker||'MEME'}`,0,back?-76:-43.5,back?4.6:5,'#e7edf0');
  }else{
   c.strokeStyle='#dbe6ed44';c.lineWidth=1;c.beginPath();c.moveTo(-13,-61);c.lineTo(13,-61);c.stroke();
  }
  // A human head: ears, neck, jaw, hair volume, facial planes and expressions.
  c.save();c.translate(0,-80);c.scale(.78,.78);c.translate(0,80);
  rounded(c,-5,-86,10,10,3,gradient(c,-5,-86,10,10,tone,'#8c624a'));
  rounded(c,-12,-100,24,14,6,tone);
  c.fillStyle=gradient(c,-10,-107,21,27,'#efd0af',tone);c.beginPath();c.ellipse(0,-95,10.5,14,0,0,Math.PI*2);c.fill();
  c.fillStyle=tone;c.beginPath();c.ellipse(0,-94,10,13,0,0,Math.PI*2);c.fill();
  c.fillStyle='#3d28362b';c.beginPath();c.ellipse(4,-91,6,10,-.15,0,Math.PI*2);c.fill();
  if(back){rounded(c,-10,-106,20,22,7,hairColor);rounded(c,-7,-86,14,4,1,tone);}
  else{
   c.strokeStyle='#33272b';c.lineWidth=.85;c.beginPath();c.moveTo(-7,-97);c.lineTo(-3,-97.5);c.moveTo(3,-97.5);c.lineTo(7,-97);c.stroke();
   c.fillStyle='#f0dfc2';c.fillRect(-6.5,-95.5,4,1.6);c.fillRect(3,-95.5,4,1.6);c.fillStyle='#252a32';c.fillRect(-4.5,-95.5,1.4,1.7);c.fillRect(4,-95.5,1.4,1.7);
   c.strokeStyle='#845642';c.lineWidth=.7;c.beginPath();c.moveTo(0,-94);c.lineTo(-1,-90);c.lineTo(1,-89.5);c.moveTo(-3,-86);c.quadraticCurveTo(0,-84.5,3,-86);c.stroke();
   c.fillStyle=hairColor;c.beginPath();c.moveTo(-10,-96);c.quadraticCurveTo(-14,-109,-2,-110);c.quadraticCurveTo(13,-113,11,-99);c.lineTo(6,-101);c.lineTo(2,-105);c.quadraticCurveTo(-4,-100,-9,-101);c.closePath();c.fill();
  }
  if(style.hair===1&&!cop&&!gang){for(let i=-2;i<=2;i++){c.fillStyle=hairColor;c.beginPath();c.ellipse(i*4,-108-Math.cos(i)*2,4,5,0,0,Math.PI*2);c.fill();}}
  if(style.hair===2&&!cop&&!gang){for(let i=-2;i<=2;i++)rounded(c,i*4-2,-108,3,back?26:10+Math.abs(i)*3,1,'#1c2228');}
  if(style.hair===3&&!cop&&!gang){rounded(c,-12,-110,24,10,5,'#44576a');rounded(c,-13,-102,29,3,1,'#8195a2');}
  if(cop){rounded(c,-13,-111,26,10,4,'#324f73');rounded(c,-15,-103,30,4,1,'#172b40');rounded(c,-2,-108,5,4,1,'#ccb77a');}
  if(gang){c.strokeStyle='#735267';c.lineWidth=4;c.beginPath();c.arc(0,-95,13,Math.PI*.9,Math.PI*2.1);c.stroke();if(!back)rounded(c,-9,-91,18,7,2,'#654256');}
  if(gear.head&&!back){rounded(c,-12,-99,24,7,3,gradient(c,-12,-99,24,7,'#c4a3ff','#5b4c8f'));c.fillStyle='#e8ddff9c';c.fillRect(-7,-98,7,1.4);}
  c.restore();
 }
 function person(c,o,time=0){
  const pose=o.moving?Math.round(Math.sin(time/95+(o.phase||0))*3):0;
  const ready=!!o.image?.complete&&!!o.image?.naturalWidth,style=o.style||{},gear=o.gear||{};
  const key=[o.role||'player',o.ticker||'',o.color||'',style.skin||0,style.hair||0,style.pants||0,style.print||0,o.coinName||'',gear.outfit||'',gear.head||'',gear.feet||'',!!o.back,!!o.gesture,pose,ready].join('|');
  let sprite=cache.get(key);
  if(!sprite){const surface=document.createElement('canvas');surface.width=260;surface.height=288;const g=surface.getContext('2d');g.scale(2,2);drawBody(g,o,pose);sprite=surface;cache.set(key,sprite);if(cache.size>96)cache.delete(cache.keys().next().value);}
  const scale=o.scale||1;c.save();c.translate(o.x,o.y);c.scale(scale,scale);
  const shadow=c.createRadialGradient(0,2,2,0,2,24);shadow.addColorStop(0,'#03081080');shadow.addColorStop(1,'#03081000');c.save();c.scale(1,.4);c.fillStyle=shadow;c.beginPath();c.arc(0,5,24,0,Math.PI*2);c.fill();c.restore();
  if(scale>=2){c.save();c.translate(-65,-132);drawBody(c,o,pose);c.restore();}else c.drawImage(sprite,-65,-132,130,144);c.restore();
 }
 function weapon(c,o){
  c.save();c.translate(o.x,o.y);c.rotate(o.angle||0);c.scale(o.scale||1,o.scale||1);
  rounded(c,10,-5,28,9,2,gradient(c,10,-5,28,9,o.upgraded?'#ad9bc4':'#a1adb6','#354554'));
  rounded(c,22,3,7,10,2,'#2c3440');rounded(c,32,-3,9,5,1,'#1e2935');rounded(c,14,-3,12,2,1,o.upgraded?'#d7b5ff':'#9dd9dc');
  c.strokeStyle='#d3dce466';c.lineWidth=.6;for(let x=29;x<35;x+=2){c.beginPath();c.moveTo(x,-4);c.lineTo(x,-1);c.stroke();}
  if(o.flash){c.fillStyle='#ffefb8';c.beginPath();c.moveTo(41,0);c.lineTo(56,-6);c.lineTo(51,0);c.lineTo(56,6);c.closePath();c.fill();}c.restore();
 }
 function groundFinish(c,W){
  // Fixed seed produces stable asphalt grain; this is baked into the cached ground.
  let seed=731;function noise(){seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;}
  c.save();for(let i=0;i<10000;i++){const x=noise()*W.width,y=noise()*W.height;c.fillStyle=i%2?'#e3edf606':'#0208150c';c.fillRect(x,y,noise()*2+.5,noise()*1.4+.3);}
  c.strokeStyle='#bacbd118';c.lineWidth=.7;
  for(const b of W.buildings){for(let x=b.x-25;x<b.x+b.w+25;x+=24){c.beginPath();c.moveTo(x,b.y+b.h+27);c.lineTo(x+11,b.y+b.h+40);c.stroke();}}
  // Water reflections, wet tarmac, marked parking and curb drains.
  for(const [x,y,w,h]of [[400,483,85,22],[1320,983,125,19],[1720,504,90,16],[720,985,72,18]]){
   const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#94b5d803');g.addColorStop(.5,'#83abc126');g.addColorStop(1,'#2f527f05');c.fillStyle=g;c.beginPath();c.ellipse(x,y,w/2,h/2,-.08,0,Math.PI*2);c.fill();
   c.strokeStyle='#c7d7e51c';c.beginPath();c.moveTo(x-w/3,y+1);c.lineTo(x+w/4,y+1);c.stroke();
  }
  for(const [x,y]of [[645,510],[1445,1015],[645,1050],[1445,470]]){c.fillStyle='#182630';c.beginPath();c.ellipse(x,y,11,6,0,0,Math.PI*2);c.fill();c.strokeStyle='#72879555';c.lineWidth=1;c.stroke();}
  const water=c.createLinearGradient(991,690,1100,775);water.addColorStop(0,'#82d6ce');water.addColorStop(.45,'#3d8b96');water.addColorStop(1,'#1f495f');rounded(c,991,690,109,85,25,water);c.strokeStyle='#c9f6ef55';c.lineWidth=1;
  for(let i=0;i<4;i++){c.beginPath();c.ellipse(1045,733,20+i*9,12+i*5,0,0,Math.PI*2);c.stroke();}
  c.restore();
 }
 function architecture(c,b){
  c.save();
  const frontY=b.y+b.h-47;
  const facade=c.createLinearGradient(0,frontY,0,b.y+b.h);facade.addColorStop(0,'#17253544');facade.addColorStop(1,'#080f21aa');c.fillStyle=facade;c.fillRect(b.x,frontY,b.w,47);
  for(let x=b.x+18;x<b.x+b.w-20;x+=49){
   rounded(c,x,frontY+7,29,23,2,'#101c2b');c.fillStyle=c.createLinearGradient(x,frontY,x+30,frontY+30);c.fillStyle=gradient(c,x,frontY,30,30,'#cbb88c','#5d6675');c.fillRect(x+2,frontY+9,25,18);c.fillStyle='#263743';c.fillRect(x+13,frontY+9,2,18);c.fillRect(x+2,frontY+17,25,2);c.fillStyle='#d0e4e033';c.fillRect(x+3,frontY+9,3,14);
  }
  // Street-level entrance reads as a door, rather than a flat black rectangle.
  rounded(c,b.x+b.w/2-27,b.y+b.h-37,54,37,2,'#0d1826');rounded(c,b.x+b.w/2-22,b.y+b.h-34,44,33,1,gradient(c,0,b.y+b.h-34,0,33,'#426271','#152836'));c.fillStyle='#abc3d5';c.fillRect(b.x+b.w/2+14,b.y+b.h-19,2,6);
  c.strokeStyle='#a4c3d440';c.lineWidth=1;c.strokeRect(b.x+3,b.y-46,b.w-6,b.h-4);
  c.strokeStyle='#0c17297a';c.lineWidth=1;for(let x=b.x+35;x<b.x+b.w-20;x+=43){c.beginPath();c.moveTo(x,b.y+125);c.lineTo(x,b.y+b.h-83);c.stroke();}
  rounded(c,b.x+b.w-110,b.y+b.h-79,72,16,2,'#1a2b3a');text(c,b.id==='garage'?'SERVICE':b.id==='shop'?'STREETWEAR':'OPEN LATE',b.x+b.w-74,b.y+b.h-68,5.5,'#c7d0cc');
  c.restore();
 }
 root.CityVisuals=Object.freeze({person,weapon,groundFinish,architecture});
})(window);
