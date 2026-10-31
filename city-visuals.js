/* Streetwear character art and environment finishing, rendered locally in canvas. */
'use strict';
(function(root){
 const cache=new Map(),logoCache=new WeakMap(),W=root.MemeCityCore.WEAPON,NPC_SCALE=.9;
 const skin=['#c38f6c','#e5b898','#8d583e','#5b382b','#d3a17d','#a4775c'];
  // Six cosmetic outfits mapped to the artwork. Same character rig and animations.
  const CLAN_FITS=Object.freeze({
   redacted:{coat:'#452453',pants:'#2b1b39',trim:'#b957e6',hair:'#382334',tone:'#d39b78',tie:'#ad5ae4'},
   congress:{coat:'#1b1b24',pants:'#242126',trim:'#f6cc54',hair:'#b59a6a',tone:'#e4ae81',tie:'#be303c'},
   exit:{coat:'#6b7069',pants:'#373e3c',trim:'#17dcbb',hair:'#352b2d',tone:'#c68d71',tie:'#1adbc0'},
   'you-missed':{coat:'#223356',pants:'#1e2946',trim:'#eec36c',hair:'#f4cc68',tone:'#e8a26c',tie:'#dd333e'},
   maduro:{coat:'#a52b33',pants:'#8d282f',trim:'#f3e9e7',hair:'#191e21',tone:'#b68f6c',tie:'#cf2b37'},
   rug:{coat:'#241d2b',pants:'#1d1c27',trim:'#ed48ac',hair:'#69412c',tone:'#d6a17b',tie:'#dcb65e'}
  });
 const hair=['#242329','#4d352d','#171e25','#9b7750'];
 const denim=['#27394f','#363b43','#4c5345','#466079'];
 function rounded(c,x,y,w,h,r,fill){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
 function gradient(c,x,y,w,h,a,b){const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,a);g.addColorStop(1,b);return g;}
 function text(c,value,x,y,size,color,weight='700'){c.fillStyle=color;c.font=`${weight} ${size}px Arial`;c.textAlign='center';c.fillText(value,x,y);}
 function logoTexture(image){
  if(!image?.complete||!image.naturalWidth)return null;
  let thumb=logoCache.get(image);if(thumb)return thumb;
  thumb=document.createElement('canvas');thumb.width=128;thumb.height=128;
  const g=thumb.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(image,0,0,128,128);
  logoCache.set(image,thumb);return thumb;
 }
 function drawLegs(c,o,pose){
  const style=o.style||{},role=o.role||'player',civilian=role==='civilian',cop=role==='cop',gang=role==='gang',gear=o.gear||{},pants=denim[style.pants||0];
  // A planted foot alternates with a lifted swing foot. Travel distance drives the stride.
  const hx=o.travel?.x??1,hy=o.travel?.y??0;
  const yaw=o.aim||{x:0,y:1},width=.32+.68*Math.abs(yaw.y);
  for(const side of [-1,1]){
   const step=pose*side,hip=side*8*width,knee=hip+step*hx*.5,ankle=hip+step*hx*.95,lift=Math.max(0,step)*.65,footY=-3+side*yaw.x*3+step*hy*.65-lift;
   c.fillStyle=gradient(c,hip-8,-40,16,40,pants,'#172733');c.beginPath();c.moveTo(hip-7,-41);c.lineTo(knee-6,-23-lift*.25);c.lineTo(ankle-6,footY-4);c.quadraticCurveTo(ankle,footY,ankle+6,footY-4);c.lineTo(knee+6,-23-lift*.25);c.lineTo(hip+7,-41);c.closePath();c.fill();
   c.strokeStyle='#adbdc548';c.lineWidth=.8;c.beginPath();c.moveTo(hip-3,-38);c.lineTo(knee-3,-23-lift*.25);c.lineTo(ankle-3,footY-5);c.stroke();
   rounded(c,knee-5,-24-lift*.25,10,7,2,'#c4cfd614');
   rounded(c,ankle-7,footY-5,18,8,3,gear.feet?'#375c66':'#202a35');rounded(c,ankle-7,footY+1,19,3,1,gear.feet?'#8de0d4':'#a7b3bd');
   c.strokeStyle='#dce5e88a';c.lineWidth=.8;for(let n=0;n<3;n++){c.beginPath();c.moveTo(ankle-2,footY-3+n*1.4);c.lineTo(ankle+4,footY-3+n*1.4);c.stroke();}
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

 }
 function drawArms(c,o,pose){
  if(o.armed)return;const tone=skin[o.style?.skin||0],role=o.role||'player',coat=role==='civilian'?(o.color||'#647d8d'):o.gear?.outfit?'#5e7654':o.color||'#3b5361';
  c.save();c.lineCap='round';c.lineJoin='round';
  for(const side of [-1,1]){const swing=pose*side,shoulder={x:side*18,y:-73},elbow={x:side*(23+Math.abs(swing)*.25),y:-54+swing*.6},hand={x:side*21+swing*.45,y:-37+swing*.7};
   if(o.gesture&&side===1){elbow.x=27;elbow.y=-92;hand.x=25;hand.y=-112;}
   c.strokeStyle='#142835';c.lineWidth=10;c.beginPath();c.moveTo(shoulder.x,shoulder.y);c.lineTo(elbow.x,elbow.y);c.stroke();c.strokeStyle=coat;c.lineWidth=8;c.stroke();
   c.strokeStyle=tone;c.lineWidth=6;c.beginPath();c.moveTo(elbow.x,elbow.y);c.lineTo(hand.x,hand.y);c.stroke();c.fillStyle=tone;c.beginPath();c.ellipse(hand.x,hand.y,4,4.5,-.1*side,0,7);c.fill();
  }c.restore();
 }
 function drawBody(c,o,pose){
  const style=o.style||{},role=o.role||'player',guard=role==='guard',cop=role==='cop',gang=role==='gang',civilian=role==='civilian',back=!!o.back;
  const tone=skin[style.skin||0],hairColor=hair[style.hair||0],pants=denim[style.pants||0],gear=o.gear||{};
  const accent=cop?'#8db9e4':gang?'#c56d83':o.color||'#b7ef84';
  const coat=guard?(o.color||'#6e8e78'):cop?'#324c68':gang?'#4b293c':gear.outfit?'#5e7654':civilian?(o.color||'#647d8d'):'#303e4d';
  c.translate(65,132);
  if(!o.upperOnly){drawLegs(c,o,pose);drawArms(c,o,pose);}
  c.fillStyle=gradient(c,-20,-78,40,40,coat,'#1a2633');c.beginPath();c.moveTo(-14,-78);c.quadraticCurveTo(-22,-75,-20,-65);c.lineTo(-16,-42);c.quadraticCurveTo(0,-38,17,-42);c.lineTo(20,-65);c.quadraticCurveTo(19,-75,13,-78);c.closePath();c.fill();
  c.strokeStyle='#d4e3ef22';c.lineWidth=.8;c.beginPath();c.moveTo(-16,-70);c.lineTo(-13,-45);c.moveTo(16,-70);c.lineTo(13,-45);c.stroke();
  rounded(c,-10,-81,21,7,3,'#172432');
  if(gear.outfit){
   c.fillStyle=gradient(c,-18,-77,36,36,'#b5d178','#6f985c');
   c.beginPath();c.moveTo(-14,-77);c.lineTo(-7,-73);c.lineTo(-9,-43);c.lineTo(-17,-43);c.lineTo(-20,-68);c.closePath();c.fill();
   c.beginPath();c.moveTo(14,-77);c.lineTo(8,-73);c.lineTo(10,-43);c.lineTo(17,-43);c.lineTo(20,-68);c.closePath();c.fill();
   c.strokeStyle='#e9f6bc77';c.lineWidth=.8;c.beginPath();c.moveTo(-14,-73);c.lineTo(-12,-46);c.moveTo(14,-73);c.lineTo(13,-46);c.stroke();
  }
  if(guard){rounded(c,-14,-72,28,26,3,'#314b4e');text(c,back?'DEFENDER':'CITY',0,-58,back?4.5:5,'#d9e7c7');rounded(c,-15,-44,30,4,1,'#192c3b');}
  else if(cop){
   rounded(c,-15,-72,31,26,3,'#253b54');
   if(back)text(c,'INSIDER',0,-57,6,'#e8f0f6');else{rounded(c,-11,-67,8,9,2,'#c9b678');rounded(c,4,-67,9,2,0,'#b9cfe1');text(c,'CITY',0,-47,4,'#bacddb');}
   rounded(c,-19,-44,38,5,2,'#111c28');rounded(c,-17,-46,7,9,2,'#263443');
  }else if(gang){text(c,back?'RUGMASTERS':'RUG',0,-58,back?5.5:8,'#d8b0bc');text(c,'NO REFUNDS',0,-49,3.6,'#c194a5');}
  else if(!civilian){
   const image=o.image,printW=28,printH=28,printY=back?-73:-71;
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
 const motionStates=new Map(),aimStates=new Map();
 function motion(id,x,y,time,moving,phase=0){
  const key=String(id),old=motionStates.get(key);let stride=old?.stride||phase,amount=old?.amount||0,travel=old?.travel||{x:1,y:0},speed=0;
  if(old){const dt=Math.max(.001,Math.min(.1,(time-old.time)/1000)),distance=Math.hypot(x-old.x,y-old.y);if(distance>0.02&&distance<90){stride+=distance/20;speed=distance/dt;travel={x:(x-old.x)/distance,y:(y-old.y)/distance};}const target=distance>.02&&distance<90&&moving!==false?Math.min(1,speed/120):0;amount+=(target-amount)*(1-Math.exp(-dt*18));}
  const result={x,y,time,stride,amount,travel,speed};motionStates.set(key,result);if(motionStates.size>160)motionStates.delete(motionStates.keys().next().value);return result;
 }
 function person(c,o,time=0){
  const state=o.id?motion(o.id,o.x,o.y,time,o.moving,o.phase||0):null,amount=state?.amount??(o.moving?1:0),cycle=state?.stride??time/115+(o.phase||0),pose=Math.sin(cycle)*6*amount;
  const raw=o.aim||state?.travel||{x:0,y:1},target=Math.atan2(raw.y,raw.x),ak=o.id||null,prior=ak&&aimStates.get(ak),dt=prior?Math.max(0,Math.min(.1,(time-prior.time)/1000)):.1;
  const diff=prior?Math.atan2(Math.sin(target-prior.angle),Math.cos(target-prior.angle)):0,angle=prior&&!o.flash?prior.angle+diff*(1-Math.exp(-dt*30)):target;
  if(ak){aimStates.set(ak,{angle,time});if(aimStates.size>160)aimStates.delete(aimStates.keys().next().value);}
  const facing={x:Math.cos(angle),y:Math.sin(angle)},back=facing.y<0,profile=facing.x;
  o={...o,aim:facing,back,travel:state?.travel||{x:1,y:0}};
  // All world1 people share the solid 360-degree shooting-era character rig.
  // The rifle is a held item, not a different character drawing style: civilians,
  // unarmed players and peaceful residents use the identical face/body/legs.
  const scale=o.scale??(o.role&&o.role!=='player'?NPC_SCALE:1);
  c.save();c.translate(o.x,o.y);c.scale(scale,scale);
  const shadow=c.createRadialGradient(0,2,2,0,2,25);shadow.addColorStop(0,'#03081090');shadow.addColorStop(1,'#03081000');c.save();c.scale(1,.4);c.fillStyle=shadow;c.beginPath();c.arc(0,5,25,0,7);c.fill();c.restore();
  if(o.holderTier>=3){c.strokeStyle=o.color||'#b7ef84';c.globalAlpha=.5;c.lineWidth=2;c.beginPath();c.ellipse(0,2,29,11,0,0,7);c.stroke();c.globalAlpha=1;}
  if(o.holderTier>=2)rounded(c,5,-14,13,4,1,o.color||'#b7ef84');
  c.save();
  const bob=-Math.abs(Math.cos(cycle*2))*1.1*amount+(1-amount)*Math.sin(time/950+(o.phase||0))*.3;
  c.translate(profile*amount*.9,bob);c.rotate((o.dashing?profile*.09:profile*.025)*amount);
  drawSolidRig(c,{...o,armed:!!o.armed,stridePose:pose,simplified:scale<1},angle);
  c.restore();c.restore();
 }
 // Fixed-length, two-bone arms. Hands and rifle share one transform at every yaw.
 function armElbow(shoulder,hand){
  const v=hand.map((n,i)=>n-shoulder[i]),d=Math.hypot(...v),u=v.map(n=>n/d);
  const along=(27*27-29*29+d*d)/(2*d),height=Math.sqrt(27*27-along*along);
  // Bend toward the ground, perpendicular to the shoulder-to-grip axis.
  const down=[u[0]*u[2],u[1]*u[2],-1+u[2]*u[2]],n=Math.hypot(...down);
  return shoulder.map((value,i)=>value+u[i]*along+down[i]/n*height);
 }
 function weaponPose(angle,flash=false){
  const ca=Math.cos(angle),sa=Math.sin(angle),recoil=(typeof flash==='number'?Math.max(0,Math.min(1,flash)):flash?1:0)*W.recoil;
  // Local coordinates: forward, lateral, height. Rotate the entire rig around vertical.
  const project=([f,l,h])=>({x:f*ca-l*sa,y:f*sa+l*ca*.35-h});
  const shoulders3=[[0,17,73],[0,-17,73]],hands3=[[8-recoil,4,56],[28-recoil,-1,56]];
  const elbows3=hands3.map((h,i)=>armElbow(shoulders3[i],h));
  return{pivot:project([-recoil,0,W.height]),hands:hands3.map(project),shoulders:shoulders3.map(project),elbows:elbows3.map(project),muzzle:project([W.barrel-recoil,0,W.height]),joints:{shoulders:shoulders3,hands:hands3,elbows:elbows3}};
 }
 // All surfaces share one world-space yaw and camera depth. Occlusion is geometric,
 // never a front/back switch for the whole gun or both arms.
 function rigSurfaces(o,angle){
  const ca=Math.cos(angle),sa=Math.sin(angle),faces=[];
  const project=([f,l,h])=>{const y=f*sa+l*ca;return{x:f*ca-l*sa,y:y-h,depth:y+h};};
  function face(points,color,print=false){const p=points.map(project);const u=points[1].map((v,i)=>v-points[0][i]),v=points[2].map((v,i)=>v-points[0][i]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...normal)||1;const shade=.78+.22*Math.abs((normal[0]*.35+normal[1]*.25+normal[2]*.9)/len);faces.push({points:p,color,print,shade,depth:p.reduce((sum,v)=>sum+v.depth,0)/p.length});}
  function box(center,size,color){
   const [f,l,h]=center,[a,b,d]=size.map(n=>n/2),v=[[-a,-b,-d],[-a,b,-d],[a,b,-d],[a,-b,-d],[-a,-b,d],[-a,b,d],[a,b,d],[a,-b,d]].map(p=>p.map((n,i)=>n+center[i]));
   for(const ids of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[0,3,7,4],[1,5,6,2]])face(ids.map(i=>v[i]),color);
  }
  function limb(a,b,r,color){
   const delta=b.map((v,i)=>v-a[i]),len=Math.hypot(...delta),u=delta.map(v=>v/len),ref=Math.abs(u[2])<.9?[0,0,1]:[1,0,0];
   const cross=(x,y)=>[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]],v=cross(u,ref),n=Math.hypot(...v),w=cross(u,v.map(x=>x/n));
   const rings=o.simplified?2:4,sides=o.simplified?5:8;
   const at=(t,k)=>a.map((x,i)=>x+delta[i]*t+r*(v[i]/n*Math.cos(k*Math.PI*2/sides)+w[i]*Math.sin(k*Math.PI*2/sides)));
   for(let j=0;j<rings;j++)for(let k=0;k<sides;k++)face([at(j/rings,k),at(j/rings,k+1),at((j+1)/rings,k+1),at((j+1)/rings,k)],color);
   face(Array.from({length:sides},(_,k)=>at(1,k)),color);
  }
  function oval(center,radii,color,low=-Math.PI/2,high=Math.PI/2){
   const point=(t,k)=>[center[0]+radii[0]*Math.cos(t)*Math.cos(k),center[1]+radii[1]*Math.cos(t)*Math.sin(k),center[2]+radii[2]*Math.sin(t)];
   const rings=o.simplified?4:8,sides=o.simplified?8:12;
   for(let j=0;j<rings;j++)for(let k=0;k<sides;k++){const a=low+(high-low)*j/rings,b=low+(high-low)*(j+1)/rings,u=k*Math.PI*2/sides,v=(k+1)*Math.PI*2/sides;face([point(a,u),point(a,v),point(b,v),point(b,u)],color);}
  }
  const style=o.style||{},offender=o.offenderSkin===true&&(o.role||'player')==='player',fit=!offender&&(o.role||'player')==='player'?CLAN_FITS[o.clanSkin]:null,tone=offender?'#c6f916':fit?.tone||skin[style.skin||0],coat=offender?'#20172c':fit?.coat||(o.role==='cop'?'#324c68':o.role==='gang'?'#4b293c':o.role==='guard'?(o.color||'#6e8e78'):o.gear?.outfit?'#5e7654':'#303e4d');
  box([0,0,59],[18,34,36],coat);
  if(fit){
   for(const side of [-1,1]){box([1,side*17.6,64],[10,1.5,20],fit.trim);box([-1,side*13,43],[10,1.5,2],fit.trim);}
   box([9.6,0,69],[1.2,3.7,21],fit.tie);
   if(o.clanSkin==='maduro')for(const side of [-1,1])box([0,side*16.8,70],[13,1.6,2],'#f3e9e7');
   if(o.clanSkin==='redacted')box([10,0,56],[1.3,19,3],'#b957e6');
   if(o.clanSkin==='rug')box([10,-9,68],[1.5,6,3],'#ed48ac');
  }
  if(offender){for(const side of [-1,1])box([0,side*17.6,62],[11,1.2,17],'#9226e8');box([-9.4,0,55],[1.3,9,5],'#c6f916');}
  box([0,0,80],[9,10,9],offender?'#15121f':tone);
  oval([0,0,94],[8,9,12],tone);
  if(offender){
   // Keep the same head rig and draw a toxic-lime skull, dark sockets and teeth.
   for(const side of [-1,1])box([8.4,side*4.6,97],[1.5,5.4,5.8],'#15121f');
   box([9.1,0,90],[1.7,3.8,3.4],'#15121f');
   box([8.6,0,86.8],[1.2,13,4.5],'#f1efcc');
   for(const gap of [-5,-2.5,0,2.5,5])box([9.3,gap,86.7],[1.3,.7,4.2],'#15121f');
  }else{
   oval([-1,0,97],[8.5,9.5,10],fit?.hair||hair[style.hair||0],.1);
   oval([-6,0,97],[3,8,8],fit?.hair||hair[style.hair||0]);
   box([9,0,93],[4,4,5],tone);
   for(const side of [-1,1])box([8.2,side*4.5,97],[.6,2.5,2],'#172432');
   box([8.2,0,88],[.6,5,1],'#845642');
   if(o.gear?.head)box([9,0,97],[2,19,5],'#a78cd9');
   if(fit){
    if(o.clanSkin==='redacted'){box([9.1,0,98],[2,17,5],'#0c0b16');box([9.2,0,89],[1.5,13,2],'#111019');}
    if(o.clanSkin==='congress'){for(const side of [-1,1])box([9.25,side*4.8,98],[1.5,7,5],'#1e2715');box([9.6,0,98],[1.4,2,1],'#f6cc54');}
    if(o.clanSkin==='exit'){box([9.2,0,88],[1.2,10,2],'#1d292a');for(const side of [-1,1])box([9.2,side*5,96],[1.1,1.6,9],'#17dcbb');}
    if(o.clanSkin==='you-missed')box([-4,0,109],[8,12,4],'#f4cc68');
    if(o.clanSkin==='maduro')box([9.35,0,90],[1.5,13,3],'#191e21');
    if(o.clanSkin==='rug')for(const side of [-1,1])box([9.2,side*5,98],[1.7,8,5],'#121016');
   }
  }
  // The same meme is printed on the chest and back and wraps out of view in profile.
  for(const side of [-1,1]){
   const faction=['cop','gang','guard'].includes(o.role),badgeColor=o.role==='cop'?'#8db9e4':o.role==='gang'?'#c56d83':o.color||'#b7ef84';
   face([[side*9.25,-13,74],[side*9.25,13,74],[side*9.25,13,47],[side*9.25,-13,47]],badgeColor,faction?'insignia':'meme');
   // Factions keep distinctive uniforms without changing the shared arm rig.
   face([[-7,side*17.3,71],[7,side*17.3,71],[7,side*17.3,53],[-7,side*17.3,53]],badgeColor,faction?'insignia':'meme');
   for(let r=0;r<(o.clanRank||0);r++)box([0,side*17.6,76-r*2],[12,.7,1],['#c89560','#c4d4dd','#f0d17c'][o.clanRank-1]);
   if(offender)face([[side*9.8,-8,80],[side*9.8,8,80],[side*9.8,8,67],[side*9.8,-8,67]],'#3d145a','offender-crown');
   if(fit)face([[side*9.85,-10,80],[side*9.85,10,80],[side*9.85,10,69],[side*9.85,-10,69]],fit.trim,'clan-'+o.clanSkin);
  }
  box([0,0,41],[19,35,4],'#142733');box([9.8,0,41],[1,5,3],'#d3d4bc');
  if(o.holderTier>=1)box([9.9,-10,75],[1,5,5],o.color||'#b7ef84');
  for(const side of [-1,1]){
   const stride=(o.stridePose||0)*side,travel=o.travel||{x:ca,y:sa},forward=travel.x*ca+travel.y*sa,lateral=-travel.x*sa+travel.y*ca,hip=[0,side*8,40],knee=[stride*.5*forward,side*8+stride*.5*lateral,23],ankle=[stride*forward,side*8+stride*lateral,5+Math.max(0,stride)*.5];
   limb(hip,knee,6,offender?'#141522':fit?.pants||denim[style.pants||0]);limb(knee,ankle,5,offender?'#141522':fit?.pants||denim[style.pants||0]);
   face([[stride*.15-4,side*14.2,36],[stride*.15+4,side*14.2,36],[stride*.65+4,side*14.2,16],[stride*.65-4,side*14.2,16]],'#263949',style.print===1?'pattern':'ticker');box([ankle[0]+3,ankle[1],ankle[2]-2],[15,11,6],o.gear?.feet?'#375c66':'#202a35');box([ankle[0]+3,ankle[1],ankle[2]-4],[16,12,2],offender?'#c6f916':fit?.trim||'#a7b3bd');
  }
  // A weapon changes the pose and adds a rifle, never the character model.
  // Keep direct rigSurfaces() callers backward-compatible with the armed model,
  // while person() explicitly provides the true armed/unarmed state.
  const armed=o.armed!==false;
  if(armed){
   const joints=weaponPose(angle,o.recoil??o.flash).joints;
   for(let i=0;i<2;i++){limb(joints.shoulders[i],joints.elbows[i],4,coat);limb(joints.elbows[i],joints.hands[i],3,tone);box(joints.hands[i],[6,6,6],tone);if(o.holderTier>=2)box(joints.hands[i].map((v,k)=>v+(k===2?3:0)),[7,7,2],o.color||'#b7ef84');}
   const recoil=Math.max(0,Math.min(1,o.recoil??(o.flash?1:0)))*2;
   const gun=(f,l,h,size,color)=>box([f-recoil,l,h],size,color);
   gun(-6,0,56,[15,7,8],'#405765');gun(16,0,58,[28,7,9],o.upgraded?'#9cabc0':'#829aa4');gun(32,0,58,[16,5,6],'#304957');gun(44,0,58,[12,3,3],'#bac8cf');gun(49,0,58,[3,5,5],'#253e4d');gun(11,0,50,[5,5,10],'#243944');gun(14,0,65,[13,4,3],'#253e4d');
   if(o.flash)gun(55,0,58,[10,5,5],'#ffedb5');
  }else{
   // Relaxed two-segment arms swing opposite the legs but keep identical body
   // proportions, shading, yaw transform and depth sorting as the rifle pose.
   for(const side of [-1,1]){
    const swing=(o.stridePose||0)*side;
    const shoulder=[0,side*17,73];
    const raised=!!o.gesture&&side===1;
    const elbow=raised?[-2,side*22,91]:[-3-swing*.25,side*22,55];
    const hand=raised?[1,side*22,108]:[-4-swing*.65,side*19,40];
    limb(shoulder,elbow,4,coat);limb(elbow,hand,3,tone);box(hand,[6,6,6],tone);
   }
  }
  return faces.sort((a,b)=>a.depth-b.depth);
 }
 function drawSolidRig(c,o,angle){
  for(const f of rigSurfaces(o,angle)){
   const p=f.points;c.beginPath();c.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)c.lineTo(p[i].x,p[i].y);c.closePath();const lit=/^#[0-9a-f]{6}$/i.test(f.color)?'#'+[1,3,5].map(i=>Math.round(parseInt(f.color.slice(i,i+2),16)*f.shade).toString(16).padStart(2,'0')).join(''):f.color;c.fillStyle=lit;c.fill();if(!o.simplified){c.strokeStyle=lit;c.lineWidth=.35;c.stroke();}
   if(f.print){
    const a=p[0],b=p[1],d=p[3],det=(b.x-a.x)*(d.y-a.y)-(b.y-a.y)*(d.x-a.x);if(Math.abs(det)<.01)continue;
    c.save();c.clip();c.transform((b.x-a.x)/30,(b.y-a.y)/30,(d.x-a.x)/28,(d.y-a.y)/28,a.x,a.y);
    if(f.print==='ticker'){c.fillStyle='#142733';c.fillRect(0,0,30,28);c.save();c.translate(15,14);c.rotate(Math.PI/2);text(c,'$'+(o.ticker||'MEME'),0,2,5,'#eaf3e7');c.restore();}
    else if(f.print==='pattern'){for(let y=0;y<28;y+=9)for(let x=0;x<30;x+=10){if(o.image?.complete&&o.image.naturalWidth)c.drawImage(o.image,x,y,9,8);else{c.fillStyle=o.color||'#b7ef84';c.fillRect(x,y,7,6);}}}
    else if(f.print==='offender-crown'){c.fillStyle='#24102f';c.fillRect(0,0,30,28);c.strokeStyle='#c6f916';c.lineWidth=2.8;c.beginPath();c.moveTo(4,18);c.lineTo(3,8);c.lineTo(10,13);c.lineTo(15,5);c.lineTo(20,13);c.lineTo(27,8);c.lineTo(26,18);c.closePath();c.stroke();c.fillStyle='#c6f916';c.fillRect(4,20,22,3);}
    else if(typeof f.print==='string'&&f.print.startsWith('clan-')){
     const id=f.print.slice(5),fit=CLAN_FITS[id];c.fillStyle=fit?.coat||'#20242e';c.fillRect(0,0,30,28);c.fillStyle=fit?.trim||'#d2dfc2';c.fillRect(0,0,30,3);
     if(id==='redacted'){for(const y of [9,15,21])c.fillRect(4,y,22,3);}
     else if(id==='congress')text(c,String.fromCharCode(36),15,22,21,fit.trim);
     else if(id==='exit'||id==='rug')text(c,'↗',15,22,23,fit.trim);
     else if(id==='you-missed')text(c,'!',15,23,24,fit.trim);
     else if(id==='maduro')text(c,'↓',15,22,23,fit.trim);
    }
    else if(f.print==='insignia'){c.fillStyle='#142733';c.fillRect(0,0,30,28);c.fillStyle=o.role==='cop'?'#8db9e4':o.role==='gang'?'#c56d83':'#9bdcca';c.fillRect(1,1,28,4);text(c,o.role==='cop'?'INSIDER':o.role==='gang'?'RUG':'DEFENDER',15,18,o.role==='guard'?5:7,'#f1f6ef');}
    else {c.fillStyle='#132332';c.fillRect(0,0,30,28);const logo=logoTexture(o.image);if(logo){c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(logo,1,0,28,28);}else{text(c,'o!',15,19,19,'#e7f6cc');}c.strokeStyle='#e7f6cc88';c.lineWidth=1;c.strokeRect(.5,.5,29,27);}c.restore();
   }
  }
 }
 function weapon(c,o){
  c.save();c.translate(o.x,o.y);const a=o.angle||0;if(o.depth)c.transform(Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a)*o.depth,0,0);else c.rotate(a);c.scale(o.scale||1,o.scale||1);
  rounded(c,-11,-2,15,9,2,'#4a5e67');rounded(c,-13,-3,4,11,1,'#263942');rounded(c,2,-6,27,11,2,gradient(c,2,-6,30,12,o.upgraded?'#9cabc0':'#9daeb0','#3e5562'));
  rounded(c,11,3,6,11,2,'#243944');rounded(c,22,-5,17,8,2,'#304957');rounded(c,38,-2,12,3,1,'#bbc5bd');rounded(c,47,-4,4,7,1,'#253e4d');rounded(c,7,-9,15,3,1,'#263c47');rounded(c,11,-11,9,3,1,'#a0b6b9');
  c.strokeStyle='#c8d5d355';c.lineWidth=.8;for(let x=26;x<37;x+=3){c.beginPath();c.moveTo(x,-4);c.lineTo(x,1);c.stroke();}
  if(o.flash){c.fillStyle='#ffedb5';c.beginPath();c.moveTo(50,0);c.lineTo(68,-7);c.lineTo(61,0);c.lineTo(68,7);c.closePath();c.fill();}c.restore();
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
 function npcScale(boss=false){return boss?1.15:NPC_SCALE;}
 function npcPose(b){return{moving:!['ready','dormant','withdraw'].includes(b.state),aim:['attack','skirmish'].includes(b.state)&&b.aim?{x:b.aim.x-b.x,y:b.aim.y-b.y}:undefined,scale:npcScale(!!b.boss)};}
 root.CityVisuals=Object.freeze({person,motion,weapon,weaponPose,rigSurfaces,npcScale,npcPose,groundFinish,architecture});
})(window);
,15,22,21,fit.trim);
     else if(id==='exit'||id==='rug')text(c,'↗',15,22,23,fit.trim);
     else if(id==='you-missed')text(c,'!',15,23,24,fit.trim);
     else if(id==='maduro')text(c,'↓',15,22,23,fit.trim);
    }
    else if(f.print==='insignia'){c.fillStyle='#142733';c.fillRect(0,0,30,28);c.fillStyle=o.role==='cop'?'#8db9e4':o.role==='gang'?'#c56d83':'#9bdcca';c.fillRect(1,1,28,4);text(c,o.role==='cop'?'INSIDER':o.role==='gang'?'RUG':'DEFENDER',15,18,o.role==='guard'?5:7,'#f1f6ef');}
    else {c.fillStyle='#132332';c.fillRect(0,0,30,28);const logo=logoTexture(o.image);if(logo){c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(logo,1,0,28,28);}else{text(c,'o!',15,19,19,'#e7f6cc');}c.strokeStyle='#e7f6cc88';c.lineWidth=1;c.strokeRect(.5,.5,29,27);}c.restore();
   }
  }
 }
 function weapon(c,o){
  c.save();c.translate(o.x,o.y);const a=o.angle||0;if(o.depth)c.transform(Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a)*o.depth,0,0);else c.rotate(a);c.scale(o.scale||1,o.scale||1);
  rounded(c,-11,-2,15,9,2,'#4a5e67');rounded(c,-13,-3,4,11,1,'#263942');rounded(c,2,-6,27,11,2,gradient(c,2,-6,30,12,o.upgraded?'#9cabc0':'#9daeb0','#3e5562'));
  rounded(c,11,3,6,11,2,'#243944');rounded(c,22,-5,17,8,2,'#304957');rounded(c,38,-2,12,3,1,'#bbc5bd');rounded(c,47,-4,4,7,1,'#253e4d');rounded(c,7,-9,15,3,1,'#263c47');rounded(c,11,-11,9,3,1,'#a0b6b9');
  c.strokeStyle='#c8d5d355';c.lineWidth=.8;for(let x=26;x<37;x+=3){c.beginPath();c.moveTo(x,-4);c.lineTo(x,1);c.stroke();}
  if(o.flash){c.fillStyle='#ffedb5';c.beginPath();c.moveTo(50,0);c.lineTo(68,-7);c.lineTo(61,0);c.lineTo(68,7);c.closePath();c.fill();}c.restore();
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
 function npcScale(boss=false){return boss?1.15:NPC_SCALE;}
 function npcPose(b){return{moving:!['ready','dormant','withdraw'].includes(b.state),aim:['attack','skirmish'].includes(b.state)&&b.aim?{x:b.aim.x-b.x,y:b.aim.y-b.y}:undefined,scale:npcScale(!!b.boss)};}
 root.CityVisuals=Object.freeze({person,motion,weapon,weaponPose,rigSurfaces,npcScale,npcPose,groundFinish,architecture});
})(window);
