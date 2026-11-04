/* City Rising atmosphere and world activities; original canvas geometry. */
'use strict';
(function(root){
 const R=root.CityRising,C=root.MemeCityCore;
 const clock=t=>{const minutes=Math.floor((18*60+t*3)%1440);return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;};
 function text(c,s,x,y,size,color){c.fillStyle=color;c.font=`700 ${size}px Arial`;c.textAlign='center';c.fillText(s,x,y);}

 // Time-of-day is visual-only: never changes simulation, coordinates, saves or networking.
 function lightingState(time){
  const seconds=Number.isFinite(time)?Math.max(0,time/1000):0;
  const hour=(18+seconds/20)%24;
  const night=hour>=19||hour<5?1:hour>=17?(hour-17)/2:hour<7?(7-hour)/2:0;
  return {seconds,hour,night,rain:Math.floor(seconds/80)%3===1};
 }
 // Anchored to the *current* Center City, not the retired pre-center coordinates.
 // Fixed fixtures are computed once; only nearby lamps are painted each frame.
 const HUB_LIGHTS=[[645,482],[1445,482],[645,985],[1445,985],[1045,733]]
  .map(([x,y])=>[C.HUB.x+x,C.HUB.y+y,'#ffd49b']);
 const STREET_LIGHTS=Object.freeze([
  ...HUB_LIGHTS,
  ...C.DISTRICTS.flatMap(d=>[[d.ox+780,d.oy+885,'#d8e9db'],[d.ox+1470,d.oy+1050,'#ffe1a7']]),
  ...C.NEIGHBORHOODS.flatMap(n=>[[n.x,n.oy+475,n.color],[n.x,n.oy+1150,'#ffe1ab']])
 ]);
 function streetLights(c,p,time,reduced=false){
  const {night,rain}=lightingState(time);
  if(night<=0||!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return 0;
  const built=(p.plot||[]).filter(o=>o.kind==='lamp').slice(0,16)
   .map(o=>[C.PLOT.x+o.col*C.PLOT.tile+C.PLOT.tile/2,C.PLOT.y+o.row*C.PLOT.tile+C.PLOT.tile/2,'#ffdea2']);
  let painted=0;
  c.save();
  c.globalCompositeOperation='screen';
  c.globalAlpha=.85*night;
  for(const [x,y,color] of [...STREET_LIGHTS,...built]){
   // Hard cap keeps world-space bloom inexpensive on phone-sized canvases.
   if(Math.abs(x-p.x)>850||Math.abs(y-p.y)>850)continue;
   const radius=126,g=c.createRadialGradient(x,y,4,x,y,radius);
   g.addColorStop(0,color+'35');g.addColorStop(1,color+'00');
   c.fillStyle=g;c.fillRect(x-radius,y-radius,radius*2,radius*2);
   c.fillStyle=color+'18';c.beginPath();c.ellipse(x,y+44,21,62,0,0,Math.PI*2);c.fill();
   if(rain){c.fillStyle=color+'14';c.beginPath();c.ellipse(x+11,y+70,10,69,-.12,0,Math.PI*2);c.fill();}
   // Static luminance is intentional; reduced-motion never creates flicker.
   if(++painted>=8)break;
  }
  c.restore();
  return painted;
 }
 function diamonds(c,p,time,reduced=false){
  // Light sources remain behind the existing actors and doors.
  streetLights(c,p,time,reduced);
  for(const n of R.LANDMARKS){if(p.rising.found.includes(n.id)||Math.hypot(n.x-p.x,n.y-p.y)>1300)continue;const bob=reduced?0:Math.sin(time/420+n.x)*5;
   c.save();c.translate(n.x,n.y);const g=c.createRadialGradient(0,0,0,0,0,55);g.addColorStop(0,'#70f3e034');g.addColorStop(1,'#70f3e000');c.fillStyle=g;c.fillRect(-55,-55,110,110);
   c.strokeStyle='#8df4e2';c.lineWidth=1.5;c.beginPath();c.ellipse(0,3,20,9,0,0,7);c.stroke();c.translate(0,-47+bob);c.fillStyle='#a9f6de';c.beginPath();c.moveTo(0,-16);c.lineTo(11,0);c.lineTo(0,16);c.lineTo(-11,0);c.closePath();c.fill();c.strokeStyle='#e3fff4';c.stroke();text(c,n.name,0,-29,9,'#caf6eb');c.restore();
  }
  const a=p.rising.arena;if(a){c.save();c.strokeStyle='#ffc18a55';c.setLineDash([12,14]);c.lineWidth=3;c.strokeRect(700,2340,840,520);c.setLineDash([]);text(c,`THE PROVING GROUND / WAVE ${Math.max(1,a.wave)}`,1120,2325,15,'#ffbe94');c.restore();}
  const home=p.plot.find(o=>o.kind==='home');if(home&&p.rising.fortLevel){const x=C.PLOT.x+home.col*64+32,y=C.PLOT.y+home.row*64+32;c.strokeStyle='#b8e5a52e';c.lineWidth=2;c.beginPath();c.ellipse(x,y,210+p.rising.fortLevel*35,110,0,0,7);c.stroke();text(c,`HQ ${p.rising.fortLevel} / RECOVERY ZONE`,x,y+100,10,'#c2e6ad');}
 }
 function layers(c,p,time){return R.GUIDES.filter(g=>Math.hypot(g.x-p.x,g.y-p.y)<1400).map((g,i)=>({y:g.y,draw:()=>{
  c.fillStyle=g.color+'22';c.beginPath();c.ellipse(g.x,g.y+2,27,12,0,0,7);c.fill();c.strokeStyle=g.color+'66';c.lineWidth=1;c.stroke();
  root.CityVisuals.person(c,{id:'guide-'+g.id,x:g.x,y:g.y,role:'civilian',color:g.color,style:{skin:(i+2)%6,hair:i%4,pants:i%4},gesture:Math.sin(time/1800+i)>.92},time);text(c,g.name,g.x,g.y-126,9,g.color);text(c,'◇',g.x,g.y-145+Math.sin(time/500)*3,20,g.color);
 }}));}
 function board(c,x,y,aim,time,moving){
  c.save();c.translate(x,y);c.fillStyle='#080f1955';c.beginPath();c.ellipse(2,10,35,12,0,0,7);c.fill();
  const g=c.createRadialGradient(0,2,0,0,2,48);g.addColorStop(0,'#71eeef55');g.addColorStop(1,'#71eeef00');c.fillStyle=g;c.fillRect(-48,-46,96,96);
  c.rotate(Math.atan2(aim.y,aim.x)*.2);c.fillStyle='#274a5e';c.beginPath();c.roundRect(-33,-7,66,14,7);c.fill();c.strokeStyle='#8bf3ed';c.lineWidth=2;c.stroke();c.fillStyle='#baf9ea';c.fillRect(-23,-2,46,2);if(moving)for(let i=0;i<3;i++){c.strokeStyle=`rgba(139,243,237,${.3-i*.08})`;c.beginPath();c.moveTo(-30-i*13,-4);c.lineTo(-42-i*15,4);c.stroke();}c.restore();
 }
 function atmosphere(c,w,h,time,reduced){
  const {seconds,hour,night,rain}=lightingState(time);
  c.fillStyle=`rgba(7,14,39,${(night*.19).toFixed(3)})`;c.fillRect(0,0,w,h);
  if(hour>=17&&hour<19){const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#f4b16e0d');g.addColorStop(1,'#f4b16e00');c.fillStyle=g;c.fillRect(0,0,w,h);}
  if(rain&&!reduced){c.save();c.strokeStyle='#b7d6e122';c.lineWidth=1;for(let i=0;i<46;i++){const x=(i*139+seconds*70)%(w+80)-40,y=(i*91+seconds*480)%(h+80)-40;c.beginPath();c.moveTo(x,y);c.lineTo(x-7,y+20);c.stroke();}c.restore();}
  return {time:clock(seconds),weather:rain?'LIGHT RAIN':'CLEAR SKIES'};
 }
 root.CityRisingVisuals=Object.freeze({diamonds,layers,board,atmosphere,clock,lightingState,streetLights});
})(window);
