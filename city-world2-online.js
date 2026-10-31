/* Local-only browser QA for the SERVER-authoritative world2 room prototype.
 * No local simulated XP/credits, no wallet calls, and no world1 save access.
 */
'use strict';
(function(root){
 const $=id=>document.getElementById(id),C=root.MemeCityCore,I=root.CityInteriors,T=root.CityTopology,R=root.CityRising;
 const W=root.CityWorld2.create(C,I,T),POI=root.CityWorld2Registry.create(C,I,R,T,W);
 const ZONES=root.CityWorld2Territory.create(C,W,POI).zones;
 const transport=root.CityWorld2OnlineTransport.create();
 const canvas=$('game'),g=canvas.getContext('2d'),mini=$('mini'),mg=mini.getContext('2d');
 if(!g||!mg){$('status').textContent='2D canvas unavailable.';return;}
 let latest=null,joined=false,polling=false,sending=false,busy=false,marker=null,aim={x:1,y:0},firePointer=false,lastInput=0;
 const held=new Set(),peerPose=new Map();
 const tell=s=>{$('status').textContent=s;};
 const option=(select,value,text)=>{const o=document.createElement('option');o.value=value;o.textContent=text;select.append(o);};
 for(const p of POI.all.filter(p=>['door','district','checkpoint'].includes(p.kind)))option($('destination'),p.id,p.kind+': '+p.name);
 for(const n of C.NEIGHBORHOODS)option($('faction'),n.id,n.clan);
 for(const zone of ZONES)option($('zone'),zone.id,zone.name);
 for(const item of C.ITEMS)option($('gear'),item.id,item.name+' / '+item.price+' credits');
 for(let col=0;col<T.draft.plot.cols;col++)option($('plot-col'),String(col),String(col+1));
 for(let row=0;row<T.draft.plot.rows;row++)option($('plot-row'),String(row),String(row+1));
 for(const kit of C.BUILD_KIT)option($('plot-kind'),kit.id,kit.name+' / '+kit.cost+' credits');
 $('plot-col').value='5';$('plot-row').value='3';$('plot-kind').value='wall';
 $('destination').value='door:shop';
 function authState(){
  $('server-state').textContent=joined?'Connected to loopback QA server':'Disconnected';
  $('join').disabled=joined;$('create-private').disabled=joined;$('leave').disabled=!joined;
 }
 function adapt(raw){if(!raw||raw.worldVersion!==2||!raw.self||!Array.isArray(raw.players))throw Error('Invalid authoritative snapshot.');return raw;}
 function updated(s){
  latest=adapt(s);
  const self=s.self,room=s.roomInfo;
  $('room-info').textContent='Room: '+(room?.code||'unknown')+' · '+(room?.players||0)+' / '+(room?.capacity||8)+' guests'+(room?.private?' · private':' · public');
  $('hud').textContent='Server XP '+self.xp+' · credits '+self.credits+' · HP '+Math.ceil(self.hp)+' · ammo '+self.ammo+
   ' · medkits '+(self.rising?.medkits||0)+' · faction +(self.clan||'none')+' · courier '+(self.courier?.status||'idle')+' · pos '+Math.round(self.x)+','+Math.round(self.y);
  $('peer-summary').textContent='Other guests: '+s.players.filter(p=>p.id!==self.id).map(p=>p.name+' ('+Math.round(p.x)+','+Math.round(p.y)+')').join(' · ');
  $('plot-summary').textContent='Private fortress: '+(self.plot?.length||0)+' / '+(T.draft.plot.cols*T.draft.plot.rows)+' structures · play credits only';
  const prev=$('owned').value;$('owned').textContent='';
  for(const i of self.inventory||[]){const item=C.ITEMS.find(x=>x.id===i.item);option($('owned'),i.uid,(item?.name||i.item)+' / '+i.uid);}
  if((self.inventory||[]).some(i=>i.uid===prev))$('owned').value=prev;
  else $('owned').value=self.inventory?.[0]?.uid||'';
  const zones=Array.isArray(s.territory)?s.territory:[],$zones=$('zone'),old=$zones.value;
  if(zones.length){$zones.textContent='';for(const z of zones){option($zones,z.id,(z.name||z.id)+' / '+z.owner);}
   if(zones.some(z=>z.id===old))$zones.value=old;}
 }
 async function join(privateRoom=false){
  if(joined||busy)return;
  busy=true;
  try{
   const code=$('room-code').value.trim();
   const snap=await transport.join({name:$('name').value.trim()||'Explorer',avatar:$('avatar').value,createRoom:privateRoom,...(!privateRoom&&code?{code}:{})});
   joined=true;updated(snap);authState();tell('Joined server-owned world2 room. Open another browser tab to verify peer movement.');
  }catch(e){tell('Join refused: '+e.message);}finally{busy=false;}
 }
 $('join').addEventListener('click',()=>join(false));
 $('create-private').addEventListener('click',()=>join(true));
 $('leave').addEventListener('click',async()=>{
  if(!joined)return;joined=false;held.clear();firePointer=false;authState();
  try{await transport.leave();tell('Room left. Ephemeral guest token revoked.');}
  catch(e){transport.disconnect();tell('Disconnected: '+e.message);}
  finally{latest=null;$('room-info').textContent='Room: —';$('hud').textContent='No server snapshot';$('peer-summary').textContent='Peers: —';}
 });
 async function command(type,fields={}){
  if(!joined){tell('Join a local QA room first.');return;}
  if(busy)return;
  busy=true;
  try{const result=await transport.action(type,fields);if(result.state)updated(result.state);tell(result.message||'Server accepted '+type);}
  catch(e){tell('Server refused '+type+': '+e.message);if(!transport.isJoined()){joined=false;authState();}}
  finally{busy=false;}
 }
 function here(){const p=latest?.self;return p?.room||p;}
 function nearestDoor(){const p=latest?.self;if(!p||p.room)return null;
  let best=null,range=95;for(const d of POI.doors){const dist=Math.hypot(p.x-d.x,p.y-d.y);if(dist<range){range=dist;best=d;}}return best;}
 $('interact').addEventListener('click',()=>{const p=latest?.self;if(!p)return tell('Join a room first.');
  if(p.room)return command('exitBuilding');
  const d=nearestDoor();if(d)return command('enterBuilding',{building:d.id.slice(5)});
  tell('Walk to an actual building door and press E. Server proximity checks cannot be bypassed.');
 });
 $('join-faction').addEventListener('click',()=>command('joinFaction',{clan:$('faction').value}));
 $('capture').addEventListener('click',()=>command('startCapture',{zone:$('zone').value}));
 $('courier').addEventListener('click',()=>command('startCourier'));
 $('deliver').addEventListener('click',()=>command('deliverCourier'));
 $('buy').addEventListener('click',()=>command('buyGear',{item:$('gear').value}));
 $('equip').addEventListener('click',()=>command('equipGear',{uid:$('owned').value}));
 $('sell').addEventListener('click',()=>command('sellGear',{uid:$('owned').value}));
 $('medkit').addEventListener('click',()=>command('buyMedkit'));
 $('heal').addEventListener('click',()=>command('useMedkit'));
 $('reload').addEventListener('click',()=>command('reload'));
 const plotTile=()=>({col:Number($('plot-col').value),row:Number($('plot-row').value)});
 $('mark-plot').addEventListener('click',()=>{
  const {col,row}=plotTile(),P=T.draft.plot;
  if(!Number.isInteger(col)||!Number.isInteger(row)||col<0||row<0||col>=P.cols||row>=P.rows)return tell('Invalid fortress tile.');
  marker={x:P.x+col*P.tile+P.tile/2,y:P.y+row*P.tile+P.tile/2,name:'Your private fortress tile'};
  tell('Private fortress tile marked. Walk close before asking the server to build.');
 });
 $('build-plot').addEventListener('click',()=>command('buildPlot',{...plotTile(),kind:$('plot-kind').value}));
 $('remove-plot').addEventListener('click',()=>command('removePlot',plotTile()));
 $('route').addEventListener('click',()=>{marker=POI.resolve($('destination').value);tell(marker?'Target marked: '+marker.name+' (manual travel; server validates movement).':'Unknown target.');});
 $('clear-route').addEventListener('click',()=>{marker=null;tell('Target marker cleared.');});
 $('mark-zone').addEventListener('click',()=>{marker=ZONES.find(z=>z.id===$('zone').value)||null;tell(marker?'Control point marked: '+marker.name+'. Move near it before capturing.':'Unknown control point.');});
 async function poll(){
  if(!joined||polling)return;polling=true;
  try{updated(await transport.state());}
  catch(e){tell('World2 connection: '+e.message);if(!transport.isJoined()){joined=false;held.clear();authState();}}
  finally{polling=false;}
 }
 document.addEventListener('visibilitychange',()=>{if(joined&&!document.hidden)poll();});
 root.addEventListener('focus',()=>{if(joined)poll();});
 const dir=()=>{
  const n=s=>Number(held.has(s)),x=n('right')+n('d')-n('left')-n('a'),y=n('down')+n('s')-n('up')-n('w'),len=Math.max(1,Math.hypot(x,y));
  return {x:x/len,y:y/len};
 };
 async function send(){
  if(!joined||sending)return;sending=true;
  try{const {x,y}=dir();await transport.input({x,y,aimX:aim.x,aimY:aim.y,fire:firePointer||held.has('f')||held.has(' ')});}
  catch(e){tell('World2 input failed: '+e.message);if(!transport.isJoined()){joined=false;held.clear();authState();}}
  finally{sending=false;}
 }
 const keys={arrowup:'up',arrowdown:'down',arrowleft:'left',arrowright:'right',w:'w',a:'a',s:'s',d:'d'};
 document.addEventListener('keydown',e=>{
  if(/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target?.tagName||''))return;
  const k=e.key.toLowerCase();if(keys[k]){held.add(keys[k]);e.preventDefault();}
  if(k==='f'||k===' '){held.add(k);e.preventDefault();}
  if(e.repeat)return;
  if(k==='e')$('interact').click();if(k==='r')$('reload').click();
 });
 document.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(keys[k])held.delete(keys[k]);held.delete(k);});
 const stop=()=>{held.clear();firePointer=false;};root.addEventListener('blur',stop);
 for(const btn of document.querySelectorAll('[data-move]')){const k=btn.dataset.move;
  btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);held.add(k);});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(ev,()=>held.delete(k));
 }
 const fire=$('fire');fire.addEventListener('pointerdown',e=>{e.preventDefault();fire.setPointerCapture(e.pointerId);firePointer=true;});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])fire.addEventListener(ev,()=>{firePointer=false;});
 function pointAim(e){const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left-rect.width/2,y=e.clientY-rect.top-rect.height/2,len=Math.hypot(x,y);
  if(len>8)aim={x:x/len,y:y/len};
 }
 canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);pointAim(e);firePointer=true;});
 canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||firePointer)pointAim(e);});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,()=>{firePointer=false;});
 root.setInterval(send,100);root.setInterval(poll,280);
 function rect(c,r,color){c.fillStyle=color;c.fillRect(r.x,r.y,r.w,r.h);}
 function tag(c,s,x,y,color='#f1efe5',size=13){c.textAlign='center';c.font='600 '+size+'px system-ui';c.fillStyle=color;c.fillText(s,x,y);}
 function actor(c,p,kind,name,shade,moving=false){
  const a=p.aim||{x:0,y:1};
  // Reuse existing real 360-degree armed avatar renderer, not a static marker.
  root.CityVisuals.person(c,{id:p.id||'qa-npc',x:p.x,y:p.y,armed:true,role:kind,aim:a,moving,color:shade,scale:kind==='player'?.8:.66},performance.now());
  tag(c,name,p.x,p.y+30,shade,14);
 }
 function worldPaint(c,s,self){
  rect(c,{x:0,y:0,w:W.world.width,h:W.world.height},'#1c353d');
  for(const road of W.roads)rect(c,road,'#3b545e');
  rect(c,W.fortress,'#3e584f');
  for(const wall of W.walls)rect(c,wall,'#8ca6a6');
  const P=T.draft.plot;
  rect(c,{x:P.x,y:P.y,w:P.cols*P.tile,h:P.rows*P.tile},'#455e4a');
  if(Math.hypot(self.x-(P.x+P.cols*P.tile/2),self.y-(P.y+P.rows*P.tile/2))<1250){
   c.strokeStyle='#648275';c.lineWidth=1;
   for(let x=0;x<=P.cols;x++){c.beginPath();c.moveTo(P.x+x*P.tile,P.y);c.lineTo(P.x+x*P.tile,P.y+P.rows*P.tile);c.stroke();}
   for(let y=0;y<=P.rows;y++){c.beginPath();c.moveTo(P.x,P.y+y*P.tile);c.lineTo(P.x+P.cols*P.tile,P.y+y*P.tile);c.stroke();}
  }
  for(const piece of self.plot||[]){
   const kit=C.BUILD_KIT.find(k=>k.id===piece.kind);
   if(kit&&Number.isInteger(piece.col)&&Number.isInteger(piece.row)&&piece.col>=0&&piece.row>=0&&piece.col<P.cols&&piece.row<P.rows){
    const cell={x:P.x+piece.col*P.tile+3,y:P.y+piece.row*P.tile+3,w:P.tile-6,h:P.tile-6};
    rect(c,cell,kit.color||'#a1b3a7');
    if(Math.hypot(cell.x-self.x,cell.y-self.y)<340)tag(c,kit.name,cell.x+cell.w/2,cell.y+cell.h/2,'#ffffff',10);
   }
  }
  for(const b of W.buildings)rect(c,b,b.protected?'#a68f63':'#58758a');
  for(const d of POI.doors){if(Math.hypot(d.x-self.x,d.y-self.y)>1000)continue;
   c.fillStyle='#8ce8c3';c.beginPath();c.arc(d.x,d.y,11,0,Math.PI*2);c.fill();
   if(Math.hypot(d.x-self.x,d.y-self.y)<260)tag(c,d.name,d.x,d.y+34,'#c4e7da',16);
  }
  for(const z of s.territory){if(!Number.isFinite(z.x)||!Number.isFinite(z.y)||Math.hypot(z.x-self.x,z.y-self.y)>1100)continue;
   c.strokeStyle=z.owner===self.clan?'#83e4ac':'#d6bb7e';c.lineWidth=5;c.beginPath();c.arc(z.x,z.y,42,0,Math.PI*2);c.stroke();
   if(z.progress>0){c.strokeStyle='#83e6f0';c.lineWidth=5;c.beginPath();c.arc(z.x,z.y,48,-Math.PI/2,-Math.PI/2+Math.min(8,z.progress)/8*Math.PI*2);c.stroke();}
  }
  if(marker){c.strokeStyle='#90eff5';c.lineWidth=4;c.beginPath();c.arc(marker.x,marker.y,29,0,Math.PI*2);c.stroke();}
  for(const guard of s.guards){if(!guard.alive||Math.hypot(guard.x-self.x,guard.y-self.y)>1050)continue;
   actor(c,guard,'gang',guard.clan+' guard','#f1959a',false);
   c.fillStyle='#80dca0';c.fillRect(guard.x-21,guard.y+35,42*Math.max(0,guard.hp/70),4);
  }
  for(const peer of s.players){if(peer.id===self.id||peer.room||Math.hypot(peer.x-self.x,peer.y-self.y)>1050)continue;
   const prev=peerPose.get(peer.id),moving=!!prev&&(Math.hypot(peer.x-prev.x,peer.y-prev.y)>2);
   const axis=moving?{x:peer.x-prev.x,y:peer.y-prev.y}:prev?.aim||{x:0,y:1};
   actor(c,{...peer,aim:axis},'player',peer.name,'#e4bf9b',moving);
   peerPose.set(peer.id,{x:peer.x,y:peer.y,aim:axis});
  }
  actor(c,{...self,aim},'player','YOU','#baf6a3',Math.hypot(dir().x,dir().y)>.1);
 }
 function interiorPaint(c,s,self){
  rect(c,{x:0,y:0,w:I.ROOM.width,h:I.ROOM.height},'#243d48');
  for(const f of I.furniture(self.room.theme||'shop'))rect(c,f,'#6b8491');
  for(const [p,text,color] of [[I.ROOM.exit,'EXIT','#91efbc'],[I.ROOM.activity,'TERMINAL','#eacb7a']]){
   c.strokeStyle=color;c.lineWidth=5;c.beginPath();c.arc(p.x,p.y,35,0,Math.PI*2);c.stroke();
   tag(c,text,p.x,p.y-47,color);
  }
  for(const peer of s.players){if(peer.id===self.id||peer.room?.id!==self.room.id)continue;actor(c,{...peer.room,id:peer.id},'player',peer.name,'#e9bd98');}
  actor(c,{...self.room,id:self.id,aim},'player','YOU','#baf6a3',Math.hypot(dir().x,dir().y)>.1);
  tag(c,self.room.name||'World2 interior',I.ROOM.width/2,105,'#e2edb6',26);
 }
 function miniPaint(s){
  const sx=mini.width/W.world.width,sy=mini.height/W.world.height;
  mg.fillStyle='#213b42';mg.fillRect(0,0,mini.width,mini.height);
  mg.fillStyle='#526d72';for(const r of W.roads)mg.fillRect(r.x*sx,r.y*sy,r.w*sx,r.h*sy);
  mg.fillStyle='#72977d';mg.fillRect(W.fortress.x*sx,W.fortress.y*sy,W.fortress.w*sx,W.fortress.h*sy);
  if(marker){mg.strokeStyle='#9ce9f5';mg.beginPath();mg.arc(marker.x*sx,marker.y*sy,4,0,Math.PI*2);mg.stroke();}
  for(const p of s.players){mg.fillStyle=p.id===s.self.id?'#fff':'#ffcc9e';mg.beginPath();mg.arc(p.x*sx,p.y*sy,4,0,Math.PI*2);mg.fill();}
 }
 function render(){
  const box=canvas.getBoundingClientRect(),dpr=Math.min(root.devicePixelRatio||1,2);
  if(box.width&&box.height){const w=Math.round(box.width*dpr),h=Math.round(box.height*dpr);
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
   g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,box.width,box.height);
   g.fillStyle='#1c333b';g.fillRect(0,0,box.width,box.height);
   if(latest?.self){const s=latest,p=s.self,inRoom=!!p.room,loc=inRoom?p.room:p;
    const zoom=inRoom?Math.min(box.width/1300,box.height/1000):.8;
    g.save();g.scale(zoom,zoom);g.translate(-(loc.x-box.width/zoom/2),-(loc.y-box.height/zoom/2));
    if(inRoom)interiorPaint(g,s,p);else worldPaint(g,s,p);g.restore();
    miniPaint(s);
   }else{g.fillStyle='#b2d4d2';g.textAlign='center';g.font='18px system-ui';
    g.fillText('Join the local world2 server to explore together',box.width/2,box.height/2);}
  }
  root.requestAnimationFrame(render);
 }
 authState();root.requestAnimationFrame(render);
})(window);
