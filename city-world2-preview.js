/* Offline, isolated v2 geometry explorer. This is NOT a second authoritative game server. */
'use strict';
(function(){
 const C=window.MemeCityCore,I=window.CityInteriors,R=window.CityRising,T=window.CityTopology;
 const W=window.CityWorld2.create(C,I,T),pois=window.CityWorld2Registry.create(C,I,R,T,W);
 const planner=window.CityNav.createRouter({WORLD:W.world,blocked:W.blocked},{cell:80,budget:17000});
 const V=window.CityVisuals,$=id=>document.getElementById(id),canvas=$('world'),ctx=canvas.getContext('2d'),mini=$('overview'),mc=mini.getContext('2d');
 if(!ctx||!mc){$('status').textContent='This browser needs 2D Canvas.';return;}
 const simulation=window.CityWorld2Simulation.create(C,W,pois,window.CityNav),player=simulation.player;
 const sandbox=window.CityWorld2Session.create(localStorage,'offensive-meme-city-world2-preview-v1',simulation);
 let room=null,travel=null,waypoint=null,last=performance.now(),zoom=.8,seen=new Set(),lastSimEvent='',message='Walk through the fortress gates in four directions. This is a nonpersistent preview.';
 const held=new Set(),image=new Image();image.src='assets/coins/offensive.webp';
 const touchButtons=[...document.querySelectorAll('[data-key]')];
 function say(s){message=s;$('status').textContent=s;}
 const items=pois.all.filter(p=>['door','district','checkpoint','landmark','guide'].includes(p.kind));
 for(const p of items){const opt=document.createElement('option');opt.value=p.id;opt.textContent=p.kind.toUpperCase()+' · '+p.name;$('nav-select').append(opt);}
 for(const n of C.NEIGHBORHOODS){const o=document.createElement('option');o.value=n.id;o.textContent=n.clan;$('faction-select').append(o);}
 for(const z of simulation.territory.zones){
  const o=document.createElement('option');o.value=z.id;o.textContent=z.name;$('control-select').append(o);
  const map=document.createElement('option');map.value=z.id;map.textContent='CONTROL · '+z.name;$('nav-select').append(map);
 }
 $('faction-select').value=C.NEIGHBORHOODS[0].id;
 $('control-select').value=simulation.territory.zones[0].id;
 $('nav-select').value='door:market';
 const shopItems=$('shop-item'),ownedGear=$('owned-gear');
 for(const item of C.ITEMS){const opt=document.createElement('option');opt.value=item.id;opt.textContent=item.name+' / '+item.price+' preview credits';shopItems.append(opt);}
 function refreshGear(){
  const previous=ownedGear.value;ownedGear.textContent='';
  for(const owned of player.inventory){const item=C.ITEMS.find(i=>i.id===owned.item);if(!item)continue;const opt=document.createElement('option');opt.value=owned.uid;opt.textContent=item.name+' / '+owned.uid;ownedGear.append(opt);}
  ownedGear.value=player.inventory.some(o=>o.uid===previous)?previous:player.inventory[0]?.uid||'';
 }
 const transact=(operation,...args)=>{
  if(!simulation.services){say('Preview equipment counter is not loaded.');return;}
  const result=simulation.services[operation](player,...args);
  refreshGear();say(result.message||('Preview service: '+result.status));
 };
 $('buy-gear').addEventListener('click',()=>transact('buyGear',shopItems.value,room));
 $('equip-gear').addEventListener('click',()=>transact('equip',ownedGear.value,room));
 $('sell-gear').addEventListener('click',()=>transact('sell',ownedGear.value,room));
 $('buy-medkit').addEventListener('click',()=>transact('buyMedkit',room));
 $('use-medkit').addEventListener('click',()=>transact('useMedkit'));
 refreshGear();

 const choose=id=>{waypoint=pois.resolve(id)||simulation.territory.zones.find(z=>z.id===id)||null;if(!waypoint){travel=null;say('Unknown destination.');return;}
  const path=planner.plan(player,waypoint,player);travel=path.status==='ok'?path.points:null;
  say(travel?'Safe walking path to '+waypoint.name+' marked. Walk along the cyan line.':'No safe path to '+waypoint.name+' from this position ('+path.status+').');
 };
 $('route').addEventListener('click',()=>{if(room){say('Exit the building before requesting a street route.');return;}choose($('nav-select').value);});
 $('clear-route').addEventListener('click',()=>{travel=waypoint=null;say('Walking route cleared.');});
 function joinFaction(){say(simulation.joinFaction($('faction-select').value).message);}
 function captureControl(){if(room){say('Return outdoors to claim a control point.');return;}
  say(simulation.captureControl($('control-select').value).message);}
 $('join-faction').addEventListener('click',joinFaction);
 $('route-control').addEventListener('click',()=>{if(room){say('Exit the building before planning a route.');return;}choose($('control-select').value);});
 $('capture-control').addEventListener('click',captureControl);
 function reset(){simulation.reset();refreshGear();room=null;seen=new Set();waypoint=travel=null;say('Reset in-memory preview. Your real save and protected backup remain unchanged.');}
  $('reset').addEventListener('click',reset);
 $('save-world2').addEventListener('click',()=>{
  const r=sandbox.save();
  say(r.status==='saved'?'World2 sandbox saved locally (revision '+r.revision+'). Your world1 save is unchanged.':r.reason||r.status);
 });
 $('load-world2').addEventListener('click',()=>{
  const r=sandbox.load();
  if(r.status==='loaded'){refreshGear();room=null;travel=waypoint=null;
   if(player.clan)$('faction-select').value=player.clan;
   say('Loaded world2 sandbox, construction and captured territory from private preview storage.'+(r.relocated?' Spawn was relocated safely.':''));}
  else say(r.reason||(r.status==='empty'?'No world2 sandbox has been saved yet.':r.status));
 });
 const backupKey='offensive-meme-city-v1-world2-recovery',stageKey='offensive-meme-city-v1-world2-staged';
 $('load-preview').addEventListener('click',()=>{
  const keys={active:'offensive-meme-city-v1',backup:backupKey,preview:stageKey};
  const staged=window.CityMigration.stage(localStorage,keys,C,T,pois);
  if(staged.status!=='staged'){say('Saved-character preview unavailable: '+(staged.reason||staged.status));return;}
  const inspected=window.CityMigration.inspectStage(localStorage,keys);
  if(inspected.status!=='ready-for-review'){say('Staged data rejected: '+inspected.status);return;}
  const loaded=simulation.loadStage(inspected.save);
  if(loaded.status==='loaded')refreshGear();
  if(loaded.status!=='loaded'){say('Staged character incompatible.');return;}
  if(player.clan)$('faction-select').value=player.clan;
  say((loaded.relocated?'Blocked old position safely relocated. ':'')+'Staged XP, credits, inventory, construction and crew loaded in memory only. '+(staged.notices||[]).join(' '));
  room=null;travel=waypoint=null;
 });
 function wall(place){
  if(room){say('Exit the building before changing construction.');return;}
  const result=place?simulation.build(3,3,'wall'):simulation.demolish(3,3);
  if(!['built','removed'].includes(result.status)){say('Test wall unchanged: '+result.status+'.');return;}
  if(waypoint)choose(waypoint.id);
  say((place?'Placed':'Removed')+' in-memory wall, subject to build-access checks; no saved credits changed.');
 }
  $('test-wall').addEventListener('click',()=>wall(true));
 $('remove-wall').addEventListener('click',()=>wall(false));
 const vec=()=>{let x=Number(held.has('right')||held.has('d'))-Number(held.has('left')||held.has('a')),y=Number(held.has('down')||held.has('s'))-Number(held.has('up')||held.has('w'));const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};};
 const keyMap={arrowup:'up',arrowdown:'down',arrowleft:'left',arrowright:'right',w:'w',a:'a',s:'s',d:'d'};
 document.addEventListener('keydown',e=>{if(/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target?.tagName||''))return;
  const k=e.key.toLowerCase(),key=keyMap[k];if(key){held.add(key);e.preventDefault();}
  if(k==='e'&&!e.repeat)interact();
  if((k===' '||k==='f')&&!e.repeat){e.preventDefault();fire();}
  if(k==='r'&&!e.repeat)say(simulation.reload());
  if(k==='g'&&!e.repeat)defend();
  if(k==='c'&&!e.repeat)claim();
  if(k==='h'&&!e.repeat)transact('useMedkit');
 });
 document.addEventListener('keyup',e=>{let key=keyMap[e.key.toLowerCase()];if(key)held.delete(key);});
 addEventListener('blur',()=>held.clear());
 for(const b of touchButtons){const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held.add(k);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>held.delete(k));}
 function nearestDoor(){let match=null,d=95;for(const p of pois.doors){const delta=Math.hypot(player.x-p.x,player.y-p.y);if(delta<d){d=delta;match=p;}}return match;}
 function interact(){
  if(room){if(Math.hypot(room.x-I.ROOM.exit.x,room.y-I.ROOM.exit.y)<95){const old=room.name;room=null;say('Exited '+old+' to the world2 street (preview only).');}
   else if(Math.hypot(room.x-I.ROOM.activity.x,room.y-I.ROOM.activity.y)<110){
    if(room.id==='door:launch')startCourier();
    else if(room.id==='door:shop')say('Equipment and medkit counter ready. Use Indoor Services below; preview credits only.');
     else if(room.id==='door:market')say('Night Market salvage ready. Select owned gear for a half-price preview-credit refund.');
     else say(room.name+' activity terminal is present; other public-service activities remain in development.');
   }else say('Walk to the front exit or the highlighted terminal.');return;}
  if(simulation.courier.state.status==='active'&&Math.hypot(player.x-simulation.courier.target.x,player.y-simulation.courier.target.y)<125){deliverCourier();return;}
  const door=nearestDoor();if(door){const orig=I.BUILDINGS.find(b=>b.roomId===door.id.slice(5));room={...I.ROOM.spawn,id:door.id,name:door.name,theme:orig?.theme||'shop'};travel=waypoint=null;say('Entered '+room.name+'. Walk to the activity terminal or the exit. No credits or items change.');return;}
  for(const p of pois.checkpoints)if(Math.hypot(player.x-p.x,player.y-p.y)<100){claim();return;}
  for(const z of simulation.territory.zones)if(Math.hypot(player.x-z.x,player.y-z.y)<130){$('control-select').value=z.id;captureControl();return;}
  say('Walk to a highlighted building entrance or checkpoint to interact.');
 }
 $('interact').addEventListener('click',interact);
 function fire(){if(room){say('Exit indoors to test combat.');return;}
  const r=simulation.fire();
  say(r.status==='hit'?(r.defeated?'Enemy defeated.':'Target hit.')+' Preview only.':r.status==='miss'?'Shot missed.':
   r.status==='cooldown'?'Weapon cooling down.':r.status==='empty'?'Preview ammo empty; reload (R).':'Cannot fire: '+r.status);}
 function defend(){if(room){say('Exit the building to start a defense.');return;}say(simulation.startDefense().message);}
 function claim(){if(room){say('Exit the building to claim a checkpoint.');return;}say(simulation.checkpoint().message);}
 $('fire').addEventListener('click',fire);
 $('reload').addEventListener('click',()=>say(simulation.reload()));
 $('defend').addEventListener('click',defend);
 $('claim-checkpoint').addEventListener('click',claim);
 function startCourier(){if(room&&room.id!=='door:launch'){say('Use the Launch House courier desk.');return;}
  const r=simulation.startCourier();
  if(r.status==='active'){choose(simulation.courier.state.targetId);say(r.message+' Walking path marked in cyan.');}
  else say(r.message);
 }
 function deliverCourier(){if(room){say('Deliver from the street at the marked destination.');return;}
  const r=simulation.deliverCourier();if(r.status==='delivered')waypoint=travel=null;say(r.message);
 }
 $('start-courier').addEventListener('click',startCourier);
 $('deliver-courier').addEventListener('click',deliverCourier);
 function step(dt){
  const {x,y}=vec();
  if(room){simulation.setInput(0,0);const dx=x*220*dt,dy=y*220*dt,px=room.x,py=room.y;
   if(x||y)player.aim={x,y};
   if(!I.roomBlocked(px+dx,py,room.theme))room.x+=dx;
   if(!I.roomBlocked(room.x,py+dy,room.theme))room.y+=dy;
  }else{
   simulation.setInput(x,y);simulation.tick(dt);
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
  for(const z of simulation.territory.zones){if(Math.hypot(z.x-player.x,z.y-player.y)>1150)continue;
   c.save();c.strokeStyle=z.owner===player.clan&&player.clan?'#80e9a2':z.state==='contested'?'#fc777c':'#ffd28b';c.lineWidth=5;
   c.beginPath();c.arc(z.x,z.y,42,0,Math.PI*2);c.stroke();
   if(z.progress>0){c.strokeStyle='#65e9ec';c.lineWidth=7;c.beginPath();c.arc(z.x,z.y,48,-Math.PI/2,-Math.PI/2+2*Math.PI*z.progress/8);c.stroke();}
   if(Math.hypot(z.x-player.x,z.y-player.y)<320)label(c,z.name+' / '+z.owner,z.x,z.y+66,'#f6e9c0',16);
   c.restore();
  }
  for(const bot of simulation.agents){if(!bot.alive||Math.hypot(bot.x-player.x,bot.y-player.y)>1100)continue;
   const role=bot.kind==='defender'?'guard':bot.kind==='police'?'police':'gang',shade=bot.kind==='defender'?'#80e8a7':bot.kind==='police'?'#79a9f4':'#f0848e';
   avatar(c,bot.x,bot.y,role,bot.id,shade,true,time);
   c.fillStyle='#182831';c.fillRect(bot.x-28,bot.y+16,56,6);
   c.fillStyle=shade;c.fillRect(bot.x-28,bot.y+16,56*Math.max(0,bot.hp/bot.maxHp),6);
   label(c,bot.kind==='police'?'INSIDER POLICE':bot.raid?'RAIDER':bot.kind==='defender'?'FORT DEFENDER':bot.territory?bot.clan.toUpperCase()+' GUARD':'GANG',bot.x,bot.y+42,shade,13);
  }
    if(travel?.length>1){c.save();c.beginPath();travel.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.setLineDash([16,9]);c.strokeStyle='#7df5ff';c.lineWidth=6;c.stroke();c.restore();}
  if(waypoint){c.strokeStyle='#a4f3e4';c.lineWidth=5;c.beginPath();c.arc(waypoint.x,waypoint.y,26,0,Math.PI*2);c.stroke();}
  for(const p of pois.checkpoints){c.beginPath();c.arc(p.x,p.y,15,0,Math.PI*2);c.strokeStyle=seen.has(p.id)?'#668b81':'#ffcf86';c.lineWidth=3;c.stroke();}
  if(simulation.courier.state.status==='active'){const target=simulation.courier.target;c.save();c.strokeStyle='#ffd381';c.lineWidth=5;c.beginPath();c.arc(target.x,target.y,28,0,Math.PI*2);c.stroke();c.restore();}
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
  for(const z of simulation.territory.zones){mc.fillStyle=z.owner===player.clan&&player.clan?'#80e9a2':'#ffd28b';mc.beginPath();mc.arc(z.x*sx,z.y*sy,3,0,Math.PI*2);mc.fill();}
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
  $('combat-hud').textContent='Courier '+simulation.courier.state.status+(simulation.courier.state.status==='active'?' '+Math.ceil(simulation.courier.state.remaining)+'s':'')+' · Faction '+(player.clan||'none')+' · Captures '+simulation.territory.zones.filter(z=>z.owner===player.clan&&z.homeClan!==player.clan).length+' · HP '+Math.ceil(player.hp)+'/100 · Ammo '+player.ammo+'/24 · Heat '+Math.ceil(player.heat)+
   ' · XP '+player.xp+' · Credits '+player.credits+' · Medkits '+(player.rising.medkits||0)+' · Defense '+simulation.mission.status+
   (simulation.mission.status==='active'?' ('+simulation.mission.remaining+' raiders)':'');
  const recent=simulation.events.at(-1);
  if(recent&&recent!==lastSimEvent){lastSimEvent=recent;say(recent);}
  if(!room&&Math.round(now)%400<18)overview();
  requestAnimationFrame(draw);
 }
 say(message);overview();requestAnimationFrame(draw);
})();
