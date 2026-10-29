/* City Rising atmosphere and world activities; original canvas geometry. */
'use strict';
(function(root){
 const R=root.CityRising,C=root.MemeCityCore;
 const clock=t=>{const minutes=Math.floor((18*60+t*3)%1440);return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;};
 function text(c,s,x,y,size,color){c.fillStyle=color;c.font=`700 ${size}px Arial`;c.textAlign='center';c.fillText(s,x,y);}
 function diamonds(c,p,time){
  // Pools of streetlight and luminous wet-road reflections sit underneath actors.
  const seconds=time/1000,hour=(18+seconds/20)%24,night=hour>=19||hour<6;
  if(night||Math.floor(seconds/80)%3===1){
   const lamps=[[2830,570],[3610,570],[2830,1080],[3610,1080],[3000,870],[3560,870],[3790,880],...p.plot.filter(o=>o.kind==='lamp').map(o=>[C.PLOT.x+o.col*64+32,C.PLOT.y+o.row*64+50])];
   c.save();c.globalCompositeOperation='screen';
   for(const [x,y]of lamps){if(Math.hypot(x-p.x,y-p.y)>1100)continue;const glow=c.createRadialGradient(x,y,0,x,y,145);glow.addColorStop(0,'#ffd49b28');glow.addColorStop(1,'#ffd49b00');c.fillStyle=glow;c.fillRect(x-145,y-145,290,290);c.fillStyle='#ffe0b414';c.beginPath();c.ellipse(x,y+38,24,75,0,0,7);c.fill();}c.restore();
  }
  for(const n of R.LANDMARKS){if(p.rising.found.includes(n.id)||Math.hypot(n.x-p.x,n.y-p.y)>1300)continue;const bob=Math.sin(time/420+n.x)*5;
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
  const seconds=time/1000,hour=(18+seconds/20)%24,night=hour>=19||hour<5?.19:hour>=17?.09:hour<7?.08:0;
  c.fillStyle=`rgba(7,14,39,${night})`;c.fillRect(0,0,w,h);
  if(hour>=17&&hour<19){const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#f4b16e0d');g.addColorStop(1,'#f4b16e00');c.fillStyle=g;c.fillRect(0,0,w,h);}
  const rain=Math.floor(seconds/80)%3===1;
  if(rain&&!reduced){c.save();c.strokeStyle='#b7d6e122';c.lineWidth=1;for(let i=0;i<46;i++){const x=(i*139+seconds*70)%(w+80)-40,y=(i*91+seconds*480)%(h+80)-40;c.beginPath();c.moveTo(x,y);c.lineTo(x-7,y+20);c.stroke();}c.restore();}
  return {time:clock(seconds),weather:rain?'LIGHT RAIN':'CLEAR SKIES'};
 }
 root.CityRisingVisuals=Object.freeze({diamonds,layers,board,atmosphere,clock});
})(window);
