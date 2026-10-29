/* Cutaway arcade interiors. Furniture and actors share a single foot-depth queue. */
'use strict';
(function(root){
 const I=root.CityInteriors,cache=new Map();
 function box(c,x,y,w,h,color,r=0){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
 function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
 function text(c,s,x,y,size,color){c.fillStyle=color;c.font=`700 ${size}px Arial`;c.textAlign='center';c.fillText(s,x,y);}
 function gradient(c,x,y,w,h,a,b){const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,a);g.addColorStop(1,b);return g;}
 function floor(c,r,art){
  const key=r.theme+'|'+r.accent+'|'+[...art.values()].filter(i=>i.complete&&i.naturalWidth).length;let surface=cache.get(key);
  if(!surface){surface=document.createElement('canvas');surface.width=1200;surface.height=900;const g=surface.getContext('2d'),warm=['cafe','lounge','home'].includes(r.theme);
   box(g,60,65,1090,735,'#050e1b',18);poly(g,[[90,145],[1110,145],[1110,765],[90,765]],'#263c4e');
   box(g,100,170,1000,590,warm?'#5c534d':'#304751',4);
   for(let y=175;y<760;y+=warm?24:48)for(let x=105+(Math.floor(y/48)%2)*28;x<1100;x+=warm?112:64){box(g,x,y,(warm?110:62),(warm?22:46),((x+y)%5)?'#d9e5de0a':'#020b1915',1);}
   // Raised rear and side walls, dado rails, pilasters and warm inset lighting.
   box(g,85,70,1030,105,gradient(g,0,70,0,105,'#25374b','#475666'),5);box(g,85,166,1030,9,r.accent,1);box(g,85,70,1030,7,'#8fa9b5',2);
   for(let x=110;x<1100;x+=190){box(g,x,84,12,73,'#172d40',2);box(g,x+3,85,3,69,'#adc7c226',1);}
   poly(g,[[70,90],[100,170],[100,765],[70,800]],'#1e3448');poly(g,[[1100,170],[1130,90],[1130,800],[1100,765]],'#293e51');
   for(const x of [84,1113]){box(g,x,165,3,590,r.accent+'66',1);}
   const images=[...art.values()].filter(img=>img.complete&&img.naturalWidth);
   for(let i=0;i<4;i++){const x=200+i*245;box(g,x-43,79,86,78,'#081a2d',4);if(images.length)g.drawImage(images[i%images.length],x-35,85,70,64);box(g,x-46,153,92,3,r.accent,1);}
   if(['club','arcade'].includes(r.theme)){
    box(g,450,405,300,220,'#12283a',4);for(let y=410;y<620;y+=30)for(let x=455;x<745;x+=30){box(g,x,y,26,26,((x+y)/30|0)%2?r.accent+'40':'#7e9cd22b',3);}
   }else{box(g,450,430,300,150,warm?'#7d5f61':'#254650',9);g.strokeStyle=r.accent+'44';g.lineWidth=2;g.strokeRect(460,440,280,130);text(g,r.theme==='home'?'HOME TURF':'OFFENSIVE / '+r.name.toUpperCase(),600,510,14,r.accent);}
   box(g,525,742,150,27,'#1a4b48',5);text(g,'EXIT TO STREET ↓',600,761,12,'#c6f6d3');cache.set(key,surface);if(cache.size>5)cache.delete(cache.keys().next().value);
  }c.drawImage(surface,0,0);
 }
 function furniture(c,o,r,art){
  const {x,y,w,h,kind}=o,z=kind==='cabinet'?100:kind==='rack'?92:kind==='sofa'?42:kind==='display'?48:kind==='lift'?28:52,face=y+h;
  poly(c,[[x,y+h],[x+w,y+h],[x+w+30,y+h+18],[x+30,y+h+18]],'#050d1950');
  box(c,x,y-z,w,h+z,gradient(c,x,y-z,w,h+z,'#617782','#233c4e'),5);box(c,x+4,y-z+4,w-8,h-4,'#243d4d',3);box(c,x+3,face-18,w-6,18,'#152a3b',2);
  if(kind==='sofa'){box(c,x-5,y-25,w+10,h+20,'#253d4a',9);box(c,x+6,y-22,w-12,25,r.accent+'99',6);for(let i=0;i<3;i++)box(c,x+12+i*(w-25)/3,y+6,(w-31)/3,h-20,gradient(c,x,y,0,h,r.accent+'cc','#405967'),5);for(const xx of [x-1,x+w-13])box(c,xx,y-12,14,h-2,'#82979e',5);}
  else if(kind==='cabinet'){box(c,x+8,y-90,w-16,63,'#071324',4);box(c,x+13,y-85,w-26,48,r.accent+'70',3);text(c,'o!',x+w/2,y-52,28,'#e8ffd9');box(c,x+8,y-23,w-16,25,'#55657d',3);for(let i=0;i<3;i++)box(c,x+18+i*23,y-16,9,9,i%2?'#edabcf':'#c3f5ad',5);}
  else if(kind==='rack'){for(let i=0;i<4;i++){const xx=x+15+i*(w-27)/4;box(c,xx,y-67,7,60,r.accent,3);box(c,xx-5,y-52,18,28,['#a2c6a1','#9e8eb8','#779ab4','#d3b07f'][i],3);}box(c,x+7,y-78,w-14,5,'#aec3c4',2);}
  else if(kind==='display'){const img=art.values().next().value;box(c,x+10,y-33,w-20,h-15,'#91b8bc66',4);if(img?.complete&&img.naturalWidth)c.drawImage(img,x+w/2-26,y-24,52,52);box(c,x+5,face-24,w-10,5,r.accent,1);}
  else if(kind==='table'){box(c,x-4,y-12,w+8,h+4,gradient(c,x,y,w,h,'#9d8b73','#695e5b'),8);for(const xx of [x+20,x+w-30]){box(c,xx,y+15,14,19,'#d2d5c8',3);box(c,xx+4,y+16,8,9,'#453f3c',2);} }
  else if(kind==='lift'){box(c,x+15,y+5,w-30,h-15,'#192d3d',20);box(c,x+30,y+45,w-60,26,r.accent,13);box(c,x+40,y+43,w-80,5,'#d2f5e1',2);for(const xx of [x-3,x+w-10])box(c,xx,y-35,13,h+18,'#c9b578',2);}
  else if(kind==='decks'){box(c,x+8,y-26,w-16,h-5,'#142a3a',3);for(const xx of [x+35,x+w-35]){c.fillStyle='#86cbd4';c.beginPath();c.ellipse(xx,y+15,20,16,0,0,7);c.fill();c.fillStyle='#213f52';c.beginPath();c.ellipse(xx,y+15,10,8,0,0,7);c.fill();}}
  else if(kind==='printer'){box(c,x+12,y-30,w-24,h,'#b6c8c5',5);box(c,x+22,y-15,w-44,15,'#233e51',2);box(c,x+30,y+10,w-60,40,'#ebe4d1',2);text(c,'MEME',x+w/2,y+36,9,'#4f6070');}
  else{for(let i=0;i<3;i++)box(c,x+14+i*(w-30)/3,y-25,(w-45)/3,25,['#aac1a1','#a19eb8','#d9bb88'][i],4);}
  c.strokeStyle='#d2e9df22';c.lineWidth=1;c.strokeRect(x+2,y-z+2,w-4,h+z-4);
 }
 function draw(c,p,time,art,renderPlayer,peerPlayers=[],renderPeer=()=>{}){
  const r=p.room;if(!r)return;floor(c,r,art);
  const layers=I.furniture(r.theme).map(o=>({y:o.y+o.h,draw:()=>furniture(c,o,r,art)}));
  // The terminal provides the building's actual city activity, rather than an empty backdrop.
  const a=I.ROOM.activity;layers.push({y:a.y+8,draw:()=>{box(c,a.x-36,a.y-76,72,80,'#1c3346',5);box(c,a.x-30,a.y-70,60,39,r.accent+'66',3);text(c,'ACTIVITY',a.x,a.y-46,9,'#e5f6dc');box(c,a.x-31,a.y-22,62,7,r.accent,2);text(c,'E / INTERACT',a.x,a.y+30,9,r.accent);}});
  const npc={x:430,y:345};layers.push({y:npc.y,draw:()=>root.CityVisuals.person(c,{id:'room-host-'+r.id,x:npc.x,y:npc.y,role:'civilian',color:r.accent,style:{skin:2,hair:1,pants:2},aim:{x:.6,y:1}},time)});
  layers.push({y:r.y,draw:()=>renderPlayer(r.x,r.y)});
  for(const peer of peerPlayers)layers.push({y:peer.room.y,draw:()=>renderPeer(peer)});
  for(const l of layers.sort((a,b)=>a.y-b.y))l.draw();
  if(!p.places.souvenirs.includes(r.id)){const s=I.ROOM.souvenir,bob=Math.sin(time/450)*4;c.save();c.translate(s.x,s.y-28+bob);c.fillStyle='#ffe0a3';c.beginPath();c.moveTo(0,-14);c.lineTo(12,0);c.lineTo(0,14);c.lineTo(-12,0);c.closePath();c.fill();text(c,'ROOM MEMENTO',0,-27,9,'#ffe7b7');c.restore();}
  // Near wall has an open doorway; side wings cover feet when walking behind them.
  box(c,85,765,440,30,'#223c4edb',3);box(c,675,765,440,30,'#223c4edb',3);box(c,85,762,440,4,r.accent+'66',1);box(c,675,762,440,4,r.accent+'66',1);
  const glow=c.createRadialGradient(600,750,0,600,750,90);glow.addColorStop(0,'#b6f4cd20');glow.addColorStop(1,'#b6f4cd00');c.fillStyle=glow;c.fillRect(510,660,180,180);
 }
 function doors(c,p,time){for(const b of I.buildings(p)){const d=I.door(b),distance=Math.hypot(d.x-p.x,d.y-p.y);if(distance>1000)continue;c.save();c.strokeStyle=b.accent;c.lineWidth=2;c.beginPath();c.ellipse(d.x,d.y,24,11,0,0,7);c.stroke();if(distance<200){text(c,'E / ENTER',d.x,d.y+30,10,b.accent);text(c,'↓',d.x,d.y-12+Math.sin(time/400)*3,20,b.accent);}c.restore();}}
 root.CityRoomVisuals=Object.freeze({draw,doors});
})(window);
