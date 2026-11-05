/* Terrain-only integration milestone for Meme City's existing city.html.
 * The legacy gameplay is available at city.html (without ?terrain=1).
 * This intentionally contains no shops, NPCs, roads, combat or economy.
 */
'use strict';
(() => {
 if(new URLSearchParams(window.location.search).get('terrain')!=='1')return;
 const $=selector=>document.querySelector(selector);
 const canvas=$('#city-canvas'),ctx=canvas?.getContext('2d');
 const intro=$('#city-intro'),start=$('#start-button');
 const engine=window.CityTerrainWorld,definitions=window.CityFrontier?.regions;
 if(!canvas||!ctx||!engine||!Array.isArray(definitions)){
  if(start){start.disabled=true;start.textContent='World generator unavailable';}
  return;
 }
 document.body.classList.add('terrain-only-mode');
 const style=document.createElement('style');
 style.textContent=`
  .terrain-only-mode .game-tools,.terrain-only-mode .under-game,
  .terrain-only-mode .player-hud,.terrain-only-mode .mission-hud,
  .terrain-only-mode .combat-hud,.terrain-only-mode .rising-status,
  .terrain-only-mode .boss-hud,.terrain-only-mode .scene-menu,
  .terrain-only-mode .action-stack,.terrain-only-mode #city-live-3d,
  .terrain-only-mode #sound-toggle,.terrain-only-mode #city-clock,
  .terrain-only-mode #landmark-count {display:none!important}
  .terrain-only-mode #city-canvas {touch-action:none; background:#142321}
  .terrain-only-mode .world-hud {pointer-events:none}
  .terrain-only-mode .city-welcome[hidden] {display:none!important}
 `;
 document.head.append(style);
 $('.alpha-tag').textContent='TERRAIN GENERATION / MILESTONE 1';
 $('.solo-restore-label').textContent='SEPARATE TERRAIN SAVE';
 $('#population').textContent='No NPCs, streets or buildings';
 $('#room-mode').textContent='SEEDED SOLO WORLD';
 $('#welcome-title').textContent='YOUR WORLD. YOUR SEED.';
 $('.welcome-lead').textContent='Terrain-only generator with 132 distinct seeded biomes, seamless 16×16 chunks and persistent player position. Buildings, streets, NPCs, quests and multiplayer are disabled in this build. The original Meme City save is protected.';
 $('.welcome-steps').hidden=true;
 $('.welcome-goal').textContent='The world loads in nearby chunks only. This is an early, top-down terrain renderer, not the finished 3D voxel game.';
 start.textContent='Enter generated world →';
 $('.welcome-controls').textContent='WASD / arrow keys or mobile thumbstick · Use camera zoom to change the map scale.';
 const legacy=document.createElement('a');
 legacy.href='city.html?legacy=1';legacy.textContent='Open preserved legacy city →';
 legacy.style.cssText='display:inline-block;margin:1rem;color:#c4e7bb';
 start.insertAdjacentElement('afterend',legacy);
 const KEY='meme-city-terrain-seed-v1',POS='meme-city-terrain-position-v1:';
 const get=(k)=>{try{return localStorage.getItem(k);}catch{return null;}};
 const put=(k,v)=>{try{localStorage.setItem(k,v);return true;}catch{return false;}};
 function randomSeed(){
  const numbers=new Uint32Array(4);
  if(window.crypto?.getRandomValues)window.crypto.getRandomValues(numbers);
  else {for(let i=0;i<4;i++)numbers[i]=(Date.now()+Math.imul(i+1,2654435761))>>>0;}
  return Array.from(numbers,n=>n.toString(16).padStart(8,'0')).join('');
 }
 let seed=get(KEY);
 if(!seed||seed.length>128){seed=randomSeed();put(KEY,seed);}
 let world=engine.createTerrain(seed,definitions);
 function restore(){
  const initial=world.spawnAt();
  try{
   const saved=JSON.parse(get(POS+seed));
   if(saved?.version===world.version&&saved.seed===seed&&
      Number.isFinite(saved.x)&&Number.isFinite(saved.y)&&
      Math.abs(saved.x)<1000000&&Math.abs(saved.y)<1000000)
    return {x:saved.x,y:saved.y};
  }catch{}
  return {x:initial.x,y:initial.y};
 }
 let player=restore(),running=false,paused=false,atlas=false,zoom=20,last=0,lastSave=0;
 const keys=new Set(),held=new Set();
 const stick={x:0,y:0};
 function savePosition(){
  put(POS+seed,JSON.stringify({version:world.version,seed,x:player.x,y:player.y}));
 }
 function spawnNewWorld(){
  savePosition();seed=randomSeed();put(KEY,seed);
  world=engine.createTerrain(seed,definitions);player=restore();
  lastSave=0;atlas=false;updateHud();
 }
 const button=document.createElement('button');
 button.type='button';button.textContent='New random world';
 button.title='Create a new world without deleting any older world saves';
 button.addEventListener('click',()=>{
  if(window.confirm('Create a new random terrain world? Your previous world save will remain stored.'))spawnNewWorld();
 });
 start.insertAdjacentElement('afterend',button);
 const atlasButton=document.createElement('button');
 atlasButton.type='button';atlasButton.textContent='Biome atlas';
 atlasButton.setAttribute('aria-pressed','false');
 atlasButton.addEventListener('click',()=>{atlas=!atlas;atlasButton.setAttribute('aria-pressed',String(atlas));});
 $('#zoom-toggle').insertAdjacentElement('afterend',atlasButton);
 function updateHud(){
  const current=world.biomeAt(Math.round(player.x),Math.round(player.y));
  $('#district').textContent=current?.name?.toUpperCase()||'GENERATING';
  $('#save-state').textContent='Terrain world seed '+seed.slice(0,12)+'… · persistent local save';
 }
 function resize(){
  const rect=canvas.getBoundingClientRect();
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const width=Math.max(1,Math.round(rect.width*dpr));
  const height=Math.max(1,Math.round(rect.height*dpr));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return {w:rect.width,h:rect.height};
 }
 function groundColor(tile){
  const delta=Math.max(-12,Math.min(12,(tile.height-40)*.09));
  return 'hsl('+tile.hue+' '+Math.max(5,tile.sat)+'% '+Math.max(12,Math.min(84,tile.light+delta))+'%)';
 }
 function drawAtlas(w,h){
  ctx.fillStyle='#10212b';ctx.fillRect(0,0,w,h);
  const scale=Math.min((w-48)/(engine.COLS*engine.CELL),(h-96)/(engine.ROWS*engine.CELL));
  const cx=w/2,cy=h/2;
  for(const b of world.anchors){
   ctx.fillStyle='hsl('+b.hue+' '+b.sat+'% '+b.light+'%)';
   const x=cx+b.x*scale,y=cy+b.y*scale;
   ctx.beginPath();ctx.arc(x,y,Math.max(3,engine.CELL*scale*.34),0,Math.PI*2);ctx.fill();
  }
  ctx.fillStyle='#f5faef';ctx.textAlign='center';ctx.font='bold 16px sans-serif';
  ctx.fillText('132 / 132 DISTINCT BIOMES',w/2,28);
  ctx.font='12px sans-serif';ctx.fillText('Seed '+seed.slice(0,16)+' · placements change with each new world',w/2,h-15);
 }
 function drawWorld(w,h){
  ctx.fillStyle='#101b20';ctx.fillRect(0,0,w,h);
  const left=Math.floor(player.x-w/(2*zoom))-1,top=Math.floor(player.y-h/(2*zoom))-1;
  const right=Math.ceil(player.x+w/(2*zoom))+1,bottom=Math.ceil(player.y+h/(2*zoom))+1;
  const cs=world.CHUNK_SIZE;
  for(let cy=Math.floor(top/cs);cy<=Math.floor(bottom/cs);cy++)
   for(let cx=Math.floor(left/cs);cx<=Math.floor(right/cs);cx++){
    const chunk=world.chunkAt(cx,cy);
    if(!chunk)continue;
    for(const tile of chunk.tiles){
     if(tile.x<left||tile.x>right||tile.y<top||tile.y>bottom)continue;
     const px=(tile.x-player.x)*zoom+w/2,py=(tile.y-player.y)*zoom+h/2;
     ctx.fillStyle=groundColor(tile);ctx.fillRect(Math.floor(px),Math.floor(py),Math.ceil(zoom)+1,Math.ceil(zoom)+1);
     ctx.fillStyle=tile.height>=80?'#0a172029':'#fff9cf11';
     ctx.fillRect(Math.floor(px),Math.floor(py+zoom-2),Math.ceil(zoom)+1,2);
    }
   }
  ctx.fillStyle='#132c41';ctx.beginPath();ctx.arc(w/2,h/2,9,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#e4f8d1';ctx.beginPath();ctx.arc(w/2,h/2,5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#ffffffbb';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(w/2,h/2,11,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#f2f6f5';ctx.textAlign='left';ctx.font='12px monospace';
  ctx.fillText('x '+Math.floor(player.x)+'  y '+Math.floor(player.y)+'  |  chunks '+world.cacheSize()+'/'+engine.LIMIT,16,25);
 }
 function movement(){
  let x=stick.x,y=stick.y;
  if(keys.has('a')||keys.has('ArrowLeft')||held.has('left'))x-=1;
  if(keys.has('d')||keys.has('ArrowRight')||held.has('right'))x+=1;
  if(keys.has('w')||keys.has('ArrowUp')||held.has('up'))y-=1;
  if(keys.has('s')||keys.has('ArrowDown')||held.has('down'))y+=1;
  const mag=Math.hypot(x,y);return mag>1?{x:x/mag,y:y/mag}:{x,y};
 }
 function frame(t){
  const dt=Math.min(.05,(t-last)/1000||0);last=t;
  if(running&&!paused){
   const move=movement();player.x+=move.x*dt*5;player.y+=move.y*dt*5;
   const size=resize();if(atlas)drawAtlas(size.w,size.h);else drawWorld(size.w,size.h);
   if(t-lastSave>1100){lastSave=t;savePosition();updateHud();}
  }
  requestAnimationFrame(frame);
 }
 $('#pause-toggle').addEventListener('click',()=>{paused=!paused;$('#pause-toggle').textContent=paused?'▶ Resume':'Ⅱ Pause';});
 $('#camera-view').addEventListener('change',e=>{zoom=e.target.value==='wide'?14:e.target.value==='detail'?28:20;});
 $('#zoom-toggle').addEventListener('click',()=>{zoom=zoom===20?28:zoom===28?14:20;});
 $('#fullscreen-toggle').addEventListener('click',()=>{$('.game-shell').requestFullscreen?.();});
 $('#fullscreen-exit').addEventListener('click',()=>{document.exitFullscreen?.();});
 window.addEventListener('keydown',e=>{
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();
  keys.add(e.key.length===1?e.key.toLowerCase():e.key);
 });
 window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
 window.addEventListener('blur',()=>{keys.clear();held.clear();stick.x=0;stick.y=0;savePosition();});
 window.addEventListener('pagehide',savePosition);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)savePosition();});
 for(const b of document.querySelectorAll('[data-move]')){
  const dir=b.dataset.move;
  b.addEventListener('pointerdown',e=>{e.preventDefault();held.add(dir);b.setPointerCapture?.(e.pointerId);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>held.delete(dir));
 }
 const joystick=$('#joystick'),knob=$('#joystick-knob');
 let activePointer=null;
 function onStick(e){
  const r=joystick.getBoundingClientRect();
  const ox=e.clientX-(r.left+r.width/2),oy=e.clientY-(r.top+r.height/2);
  const radius=Math.max(10,Math.min(r.width,r.height)*.35),dist=Math.max(1,Math.hypot(ox,oy));
  stick.x=ox/Math.max(radius,dist);stick.y=oy/Math.max(radius,dist);
  knob.style.transform='translate('+Math.round(stick.x*radius)+'px,'+Math.round(stick.y*radius)+'px)';
 }
 joystick.addEventListener('pointerdown',e=>{activePointer=e.pointerId;joystick.setPointerCapture(e.pointerId);onStick(e);});
 joystick.addEventListener('pointermove',e=>{if(e.pointerId===activePointer)onStick(e);});
 function releaseStick(e){if(e.pointerId!==activePointer)return;activePointer=null;stick.x=stick.y=0;knob.style.transform='';}
 joystick.addEventListener('pointerup',releaseStick);
 joystick.addEventListener('pointercancel',releaseStick);
 start.addEventListener('click',()=>{
  intro.hidden=true;intro.style.display='none';running=true;last=performance.now();resize();updateHud();canvas.focus();
 });
 updateHud();requestAnimationFrame(frame);
})();
