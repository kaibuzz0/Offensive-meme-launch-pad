/* Offline, isolated v2 geometry explorer. This is NOT a second authoritative game server. */
'use strict';
(function(){
 const C=window.MemeCityCore,I=window.CityInteriors,R=window.CityRising,T=window.CityTopology;
 const W=window.CityWorld2.create(C,I,T),pois=window.CityWorld2Registry.create(C,I,R,T,W);
 const planner=window.CityNav.createRouter({WORLD:W.world,blocked:W.blocked},{cell:80,budget:17000});
 const V=window.CityVisuals,$=id=>document.getElementById(id),canvas=$('world'),ctx=canvas.getContext('2d'),mini=$('overview'),mc=mini.getContext('2d');
 if(!ctx||!mc){$('status').textContent='This browser needs 2D Canvas.';return;}
 const player={id:'world2-preview-player',x:W.spawn.x,y:W.spawn.y,aim:{x:0,y:1},plot:[],outposts:[]};
 let room=null,travel=null,waypoint=null,last=performance.now(),zoom=.8,seen=new Set(),message='Walk through the fortress gates in four directions. This is a nonpersistent preview.';
 const held=new Set(),image=new Image();image.src='assets/coins/offensive.webp';
 const touchButtons=[...document.querySelectorAll('[data-key]')];
 function say(s){message=s;$('status').textContent=s;}
 const items=pois.all.filter(p=>['door','district','checkpoint','landmark','guide'].includes(p.kind));
 for(const p of items){const opt=document.createElement('option');opt.value=p.id;opt.textContent=p.kind.toUpperCase()+' · '+p.name;$('nav-select').append(opt);}
 $('nav-select').value='door:market';
 const choose=id=>{waypoint=pois.resolve(id);if(!waypoint){travel=null;say('Unknown destination.');return;}
  const path=planner.plan(player,waypoint,player);travel=path.status==='ok'?path.points:null;
  say(travel?'Safe walking path to '+waypoint.name+' marked. Walk along the cyan line.':'No safe path to '+waypoint.name+' from this position ('+path.status+').');
 };
 $('route').addEventListener('click',()=>{if(room){say('Exit the building before requesting a street route.');return;}choose($('nav-select').value);});
 $('clear-route').addEventListener('click',()=>{travel=waypoint=null;say('Walking route cleared.');});
 function reset(){player.x=W.spawn.x;player.y=W.spawn.y;player.plot=[];player.outposts=[];room=null;seen=new Set();waypoint=travel=null;say('Reset in-memory preview. Your real save and protected backup remain unchanged.');}
 $('reset').addEventListener('click',reset);
 const backupKey='offensive-meme-city-v1-world2-recovery',stageKey='offensive-meme-city-v1-world2-staged';
 $('load-preview').addEventListener('click',()=>{
  const keys={active:'offensive-meme-city-v1',backup:backupKey,preview:stageKey};
  const staged=window.CityMigration.stage(localStorage,keys,C,T,pois);
  if(staged.status!=='staged'){say('Saved-character preview unavailable: '+(staged.reason||staged.status));return;}
  const inspected=window.CityMigration.inspectStage(localStorage,keys);
  if(inspected.status!=='ready-for-review'){say('Staged data rejected: '+inspected.status);return;}
  const saved=inspected.save;
  player.plot=C.restorePlot(saved.plot);player.outposts=(saved.clans?.outposts||[]).filter(o=>o&&C.outpostLot(o.clan)&&C.BUILD_KIT.some(k=>k.id===o.kind));
  if(W.blocked(saved.x,saved.y,player)){player.x=W.spawn.x;player.y=W.spawn.y;say('Saved location blocked by prototype geometry. Preview spawned safely; original save is unchanged.');}
  else {player.x=saved.x;player.y=saved.y;say('Loaded staged character POSITION and construction preview only. '+(staged.notices||[]).join(' '));}
  room=null;travel=waypoint=null;
 });
 function wall(place){
  const near=Math.hypot(player.x-(T.draft.plot.x+512),player.y-(T.draft.plot.y+320))<700;
  if(room||!near){say('Walk to the center fortress building plot to place a test wall.');return;}
  const col=3,row=3,index=player.plot.findIndex(p=>p.col===col&&p.row===row);
  if(place){if(index>=0){say('Test wall already exists.');return;}player.plot.push({col,row,kind:'wall',rotation:0});}
  else {if(index<0){say('No test wall is placed.');return;}player.plot.splice(index,1);}
  if(waypoint)choose(waypoint.id);
  say((place?'Placed':'Removed')+' temporary plot wall. It affects collision; no play credits or saves were changed.');
 }
 $('test-wall').addEventListener('click',()=>wall(true));
 $('remove-wall').addEventListener('click',()=>wall(false));
 const vec=()=>{let x=Number(held.has('right')||held.has('d'))-Number(held.has('left')||held.has('a')),y=Number(held.has('down')||held.has('s'))-Number(held.has('up')||held.has('w'));const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};};
 const keyMap={arrowup:'up',arrowdown:'down',arrowleft:'left',arrowright:'right',w:'w',a:'a',s:'s',d:'d'};
 document.addEventListener('keydown',e=>{if(/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target?.tagName||''))return;
  const key=keyMap[e.key.toLowerCase()];if(key){held.add(key);e.preventDefault();}if(e.key.toLowerCase()==='e'&&!e.repeat)interact();
 });
 document.addEventListener('keyup',e=>{let key=keyMap[e.key.toLowerCase()];if(key)held.delete(key);});
 addEventListener('blur',()=>held.clear());
 for(const b of touchButtons){const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held.add(k);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>held.delete(k));}
 function nearestDoor(){let match=null,d=95;for(const p of pois.doors){const delta=Math.hypot(player.x-p.x,player.y-p.y);if(delta<d){d=delta;match=p;}}return match;}
 function interact(){
  if(room){if(Math.hypot(room.x-I.ROOM.exit.x,room.y-I.ROOM.exit.y)<95){const old=room.name;room=null;say('Exited '+old+' to the world2 street (preview only).');}else if(Math.hypot(room.x-I.ROOM.activity.x,room.y-I.ROOM.activity.y)<110){say(room.name+' activity terminal is present. Real market/shop/mission actions require full engine migration.');}else say('Walk to the front exit or the highlighted terminal.');return;}
  const door=nearestDoor();if(door){const orig=I.BUILDINGS.find(b=>b.roomId===door.id.slice(5));room={...I.ROOM.spawn,id:door.id,name:door.name,theme:orig?.theme||'shop'};travel=waypoint=null;say('Entered '+room.name+'. Walk to the activity terminal or the exit. No credits or items change.');return;}
  for(const p of pois.checkpoints)if(Math.hypot(player.x-p.x,player.y-p.y)<100&&!seen.has(p.id)){seen.add(p.id);say('Prototype checkpoint visited: '+p.name+' ('+seen.size+'/3). No real reward awarded.');return;}
  say('Walk to a highlighted building entrance or checkpoint to interact.');
 }
 $('interact').addEventListener('click',interact);
 function step(dt){
  const {x,y}=vec();if(x||y)player.aim={x,y};
  const speed=240,dx=x*speed*dt,dy=y*speed*dt,px=room?room.x:player.x,py=room?room.y:player.y;
  if(room){if(!I.roomBlocked(px+dx,py,room.theme))room.x+=dx;if(!I.roomBlocked(room.x,py+dy,room.theme))room.y+=dy;}
  else {
   if(!W.blocked(px+dx,py,player))player.x+=dx;
   if(!W.blocked(player.x,py+dy,player))player.y+=dy;
   if(waypoint&&Math.hypot(player.x-waypoint.x,player.y-waypoint.y)<70){say('Destination reached: '+waypoint.name+'. Press E near a doorway to enter.');waypoint=travel=null;}
  }
 }
 function rect(c,b,fill,stroke){c.fillStyle=fill;c.fillRect(b.x,b.y,b.w,b.h);if(stroke){c.strokeStyle=stroke;c.lineWidth=3;c.strokeRect(b.x,b.y,b.w,b.h);}}
 function label(c,s,x,y,color='#d8ebed',size=17){c.fillStyle=color;c.font='600 '+size+'px system-ui';c.textAlign='center';c.fillText(s,x,y);}
 function avatar(c,x,y,role,id,color,moving,time){
  V.person(c,{id,x,y,scale:role==='player'?.85:.72,role,armed:true,moving,aim:role==='player'?player.aim:{x:0,y:1},color,ticker:role==='player'?'OFFENDED':undefined,coinName:'OFFENSIVE',image:role==='player'?image:null},time);
 }
 function drawStreet(c,time,w,h){
  c.fillStyle='#1e373d';c.fillRect(0,0,W.world.width,W.world.height);
  for(const road of W.roads){rect(c,road,'#344e55');c.save();c.strokeStyle='#9ababe';c.lineWidth=3;c.setLineDash([22,20]);c.beginPath();if(road.h>road.w){const xx=road.x+road.w/2;c.moveTo(xx,road.y);c.lineTo(xx,road.y+road.h);}else{const yy=road.y+road.h/2;c.moveTo(road.x,yy);c.lineTo(road.x+road.w,yy);}c.stroke();c.restore();}
  rect(c,W.fortress,'#2f4747','#658e75');
  // The central fortress shares four physical gaps with the cardinal roads.
  for(const wall of W.walls)rect(c,wall,'#90a2a0','#dce4c7');
  const plot=T.draft.plot;rect(c,{x:plot.x,y:plot.y,w:plot.cols*plot.tile,h:plot.rows*plot.tile},'#41554f','#b1cb95');
  for(const tile of player.plot)rect(c,{x:plot.x+tile.col*64,y:plot.y+tile.row*64,w:60,h:60},'#899da2','#dae1c6');
  for(const b of W.buildings)rect(c,b,b.protected?'#8d7953':'#516779','#b5d2ca');
  for(const d of pois.doors){const visible=Math.hypot(d.x-player.x,d.y-player.y)<1050;if(visible){c.beginPath();c.arc(d.x,d.y,12,0,Math.PI*2);c.fillStyle='#a3eed1';c.fill();if(Math.hypot(d.x-player.x,d.y-player.y)<260)label(c,d.name,d.x,d.y+41,'#d5f3e5',18);}}
  for(const n of C.NEIGHBORHOODS){const p=pois.resolve('neighborhood:'+n.id);if(!p)continue;const offset=20*Math.sin(time/1000+n.id.length);if(Math.hypot(p.x-player.x,p.y-player.y)<1000){avatar(c,p.x+offset,p.y,'gang','npc-'+n.id,n.color,true,time);label(c,n.clan,p.x,p.y+31,n.color,19);}}
  if(travel?.length>1){c.save();c.beginPath();travel.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.setLineDash([16,9]);c.strokeStyle='#7df5ff';c.lineWidth=6;c.stroke();c.restore();}
  if(waypoint){c.strokeStyle='#a4f3e4';c.lineWidth=5;c.beginPath();c.arc(waypoint.x,waypoint.y,26,0,Math.PI*2);c.stroke();}
  for(const p of pois.checkpoints){c.beginPath();c.arc(p.x,p.y,15,0,Math.PI*2);c.strokeStyle=seen.has(p.id)?'#668b81':'#ffcf86';c.lineWidth=3;c.stroke();}
  avatar(c,player.x,player.y,'player',player.id,'#b4e88b',!!(vec().x||vec().y),time);
  label(c,'YOU',player.x,player.y+32,'#fff',17);
 }
 function drawRoom(c,time){
  rect(c,{x:0,y:0,w:I.ROOM.width,h:I.ROOM.height},'#243c46','#93bbb4');
  for(const f of I.furniture(room.theme))rect(c,f,'#627f80','#a9c5b8');
  for(const p of [I.ROOM.exit,I.ROOM.activity]){c.beginPath();c.arc(p.x,p.y,37,0,Math.PI*2);c.strokeStyle=p===I.ROOM.exit?'#94dcaa':'#ffda85';c.lineWidth=4;c.stroke();}
  label(c,room.name,I.ROOM.width/2,130,'#f5e6b8',26);label(c,'EXIT',I.ROOM.exit.x,I.ROOM.exit.y+53);label(c,'ACTIVITY',I.ROOM.activity.x,I.ROOM.activity.y-42);
  avatar(c,room.x,room.y,'player',player.id,'#b4e88b',!!(vec().x||vec().y),time);
 }
 function overview(){
  const mw=mini.width,mh=mini.height,sx=mw/W.world.width,sy=mh/W.world.height;
  mc.clearRect(0,0,mw,mh);mc.fillStyle='#203a41';mc.fillRect(0,0,mw,mh);
  mc.fillStyle='#617e84';for(const r of W.roads)mc.fillRect(r.x*sx,r.y*sy,r.w*sx,r.h*sy);
  mc.fillStyle='#567f64';const f=W.fortress;mc.fillRect(f.x*sx,f.y*sy,f.w*sx,f.h*sy);
  for(const n of C.NEIGHBORHOODS){const a=T.draft.areas[n.id];mc.fillStyle=n.color+'88';mc.fillRect(a.x*sx,a.y*sy,a.w*sx,a.h*sy);}
  mc.strokeStyle='#b8ead4';for(const d of W.doors){mc.beginPath();mc.arc(d.x*sx,d.y*sy,1.3,0,Math.PI*2);mc.stroke();}
  if(waypoint){mc.strokeStyle='#7df5ff';mc.beginPath();mc.arc(waypoint.x*sx,waypoint.y*sy,4,0,Math.PI*2);mc.stroke();}
  mc.fillStyle='#fff';mc.beginPath();mc.arc(player.x*sx,player.y*sy,5,0,Math.PI*2);mc.fill();
 }
 function draw(now){
  const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;step(dt);
  const b=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=b.width,h=b.height;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='#162932';ctx.fillRect(0,0,w,h);
  const x=room?room.x:player.x,y=room?room.y:player.y,scale=room?Math.min(w/1300,h/1000):zoom,cx=x-w/(2*scale),cy=y-h/(2*scale);
  ctx.save();ctx.scale(scale,scale);ctx.translate(-cx,-cy);
  if(room)drawRoom(ctx,now);else drawStreet(ctx,now,w,h);
  ctx.restore();
  const p=Object.values(T.draft.areas).find(a=>player.x>=a.x&&player.x<a.x+a.w&&player.y>=a.y&&player.y<a.y+a.h);
  $('location').textContent=room?room.name+' / TEST INTERIOR':(p?.id||'Connecting roads').toUpperCase()+' · '+Math.round(player.x)+' / '+Math.round(player.y);
  if(!room&&Math.round(now)%400<18)overview();
  requestAnimationFrame(draw);
 }
 say(message);overview();requestAnimationFrame(draw);
})();
