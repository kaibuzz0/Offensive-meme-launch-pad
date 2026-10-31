/* Rare shared encounter. Prayer excerpts supplied in THE SONGS OF YESHUA.txt. */
'use strict';
(function(root){
 const C=root.MemeCityCore,P=C.Engine.prototype,base={tick:P.tick,snapshot:P.snapshot};
 const PRAISE='Praise YHWH! Praise Yeshua!';
 const PRAYERS=['He heals the brokenhearted and binds up their wounds.','He makes his messengers winds, his servants flaming fire.'];
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const outside=p=>!p.room&&!['creator','social'].includes(C.areaAt(p.x,p.y));
 function clear(a,b,p){const d=distance(a,b),steps=Math.ceil(d/12);for(let i=1;i<=steps;i++)if(C.blocked(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps,p))return false;return true;}
 function hostile(b,p){return !b.owner&&C.npcHostile(b,p);}
 function init(e){e.monkEvent??={wait:180,active:null};return e.monkEvent;}
 P.tick=function(dt){base.tick.call(this,dt);dt=Math.max(0,Math.min(.1,dt));const event=init(this);if(!this.players.size)return;
  if(!event.active){event.wait-=dt;if(event.wait>0)return;event.wait=60;
   const eligible=[...this.players.values()].filter(p=>outside(p)&&p.hp>0&&p.hp<75&&this.arcade.bots.some(b=>hostile(b,p)&&distance(b,p)<550));
   if(!eligible.length||(this.monkRandom||Math.random)()>=.15)return;
   const p=eligible[Math.floor((this.monkRandom||Math.random)()*eligible.length)%eligible.length];let spot;
   for(let i=0;i<12;i++){const angle=i*Math.PI/6,q={x:p.x+Math.cos(angle)*95,y:p.y+Math.sin(angle)*95};if(!C.blocked(q.x,q.y,p)&&clear(p,q,p)){spot=q;break;}}
   if(!spot)return;event.active={...spot,owner:p.id,left:24,elapsed:0,tornado:{...spot},pulse:0};
   for(const q of this.players.values())if(outside(q)&&distance(q,p)<650){q.notice='RARE ENCOUNTER / The Wandering Monk · Stand in the golden circle for healing.';q.noticeSeq++;}
  }
  const m=event.active,p=this.players.get(m.owner);if(!p||!outside(p)||p.hp<=0||distance(p,m)>700){event.active=null;event.wait=360;return;}
  m.left-=dt;m.elapsed+=dt;if(m.left<=0){event.active=null;event.wait=360;return;}
  for(const q of this.players.values())if(!q.room&&q.hp>0&&distance(q,m)<155&&clear(m,q,q))q.hp=Math.min(100,q.hp+6*dt);
  const t=m.tornado,enemy=this.arcade.bots.filter(b=>hostile(b,p)&&distance(b,m)<500&&clear(t,b,p)).sort((a,b)=>distance(t,a)-distance(t,b))[0];
  t.target=enemy?.id||null;
  if(enemy){const d=distance(t,enemy),step=Math.min(d,165*dt);if(d>1){const q={x:t.x+(enemy.x-t.x)/d*step,y:t.y+(enemy.y-t.y)/d*step};if(clear(t,q,p))Object.assign(t,q);}}
  m.pulse+=dt;if(m.pulse>=.25){m.pulse-=.25;if(enemy)for(const b of this.arcade.bots)if(hostile(b,p)&&distance(b,t)<68&&clear(t,b,p)){b.hp=Math.max(0,b.hp-9);b.hitFlash=.15;if(!b.hp){b.respawn=18;b.windup=0;b.targetId=null;}}}
 };
 P.snapshot=function(id){const s=base.snapshot.call(this,id),m=init(this).active;s.monk=m?{x:m.x,y:m.y,left:m.left,elapsed:m.elapsed,praise:PRAISE,prayer:PRAYERS[Math.floor(m.elapsed/7)%2],tornado:{...m.tornado}}:null;return s;};
 function draw(c,m,reduced=false){
  const phase=reduced?0:m.elapsed;c.save();c.translate(m.x,m.y);
  const glow=c.createRadialGradient(0,0,10,0,0,155);glow.addColorStop(0,'#ffe69a35');glow.addColorStop(1,'#ffdf7900');c.fillStyle=glow;c.beginPath();c.arc(0,0,155,0,Math.PI*2);c.fill();c.strokeStyle='#ffe7a77a';c.lineWidth=2;c.beginPath();c.arc(0,0,155,0,Math.PI*2);c.stroke();
  // Hooded robe, rope belt, clasped hands and a floating halo.
  c.fillStyle='#352a3980';c.beginPath();c.ellipse(0,4,30,10,0,0,7);c.fill();
  const robe=c.createLinearGradient(-25,-85,27,0);robe.addColorStop(0,'#534044');robe.addColorStop(.5,'#ac8060');robe.addColorStop(1,'#493843');c.fillStyle=robe;c.beginPath();c.moveTo(-15,-83);c.quadraticCurveTo(-27,-55,-28,0);c.quadraticCurveTo(0,8,28,0);c.lineTo(17,-82);c.closePath();c.fill();
  c.strokeStyle='#decba4';c.lineWidth=3;c.beginPath();c.moveTo(-22,-38);c.quadraticCurveTo(0,-32,22,-38);c.moveTo(4,-36);c.lineTo(10,-9);c.stroke();
  c.fillStyle='#ceb08c';c.beginPath();c.ellipse(0,-89,12,17,0,0,7);c.fill();c.strokeStyle='#72524b';c.lineWidth=7;c.beginPath();c.arc(0,-89,17,Math.PI*.85,Math.PI*2.15);c.stroke();
  c.strokeStyle='#c5a184';c.lineWidth=7;c.lineCap='round';for(const side of [-1,1]){c.beginPath();c.moveTo(side*19,-67);c.lineTo(side*12,-52);c.lineTo(side*3,-65);c.stroke();}c.fillStyle='#efcdab';c.beginPath();c.ellipse(0,-65,5,9,0,0,7);c.fill();
  c.strokeStyle='#ffedab';c.lineWidth=2;c.beginPath();c.ellipse(0,-119,21,6,0,0,7);c.stroke();
  c.font='700 11px Arial';c.textAlign='center';c.fillStyle='#fff1b8';c.fillText('WANDERING MONK · HEALING',0,-137);
  c.font='700 13px Georgia';c.fillStyle='#ffe8a0';c.fillText(m.praise||PRAISE,0,-177);
  c.font='12px Georgia';c.fillStyle='#fff4d7';c.fillText(m.prayer,0,-157,430);c.restore();
  const t=m.tornado;c.save();c.translate(t.x,t.y);c.globalAlpha=t.target?.9:.5;
  const fire=c.createLinearGradient(0,-165,0,0);fire.addColorStop(0,'#fff6cd00');fire.addColorStop(.3,'#ffdd78a0');fire.addColorStop(1,'#ff8a3db0');c.fillStyle=fire;c.beginPath();c.moveTo(-9,0);c.quadraticCurveTo(-25,-90,-62,-155);c.quadraticCurveTo(0,-177,62,-155);c.quadraticCurveTo(25,-90,9,0);c.closePath();c.fill();
  for(let i=0;i<11;i++){const y=-i*14,w=10+i*4;c.strokeStyle=i%2?'#fff2bc':'#ffb851';c.lineWidth=2.4;c.beginPath();c.ellipse(Math.sin(phase*6+i*.6)*7,y,w,5+i*.4,Math.sin(phase*3+i)*.13,phase*4+i,phase*4+i+Math.PI*1.65);c.stroke();}
  if(!reduced)for(let i=0;i<18;i++){const h=(phase*65+i*13)%165,a=phase*5+i*2.4;c.fillStyle=i%2?'#fff3be':'#ffb044';c.fillRect(Math.cos(a)*(12+h*.3),-h,2.5,5);}
  c.restore();
 }
 root.CityMonk=Object.freeze({PRAISE,PRAYERS,draw,hostile});
})(typeof window==='undefined'?globalThis:window);
