/* Terrain-only integration milestone for Meme City's existing city.html.
 * The legacy gameplay is available at city.html (without ?terrain=1).
 * The starter road and gate share the terrain seed and player controller.
 */
'use strict';
(() => {
 if(new URLSearchParams(window.location.search).get('terrain')!=='1')return;
 const $=selector=>document.querySelector(selector);
 const canvas=$('#city-canvas'),ctx=canvas?.getContext('2d');
 const intro=$('#city-intro'),start=$('#start-button');
 const engine=window.CityTerrainWorld,definitions=window.CityFrontier?.regions;
 const voxelApi=window.CityVoxelWorld,rendererApi=window.CityVoxelRenderer,physicsApi=window.CityVoxelPhysics;
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
  .terrain-only-mode #city-voxel-canvas,.terrain-only-mode #city-road-canvas {position:absolute;inset:0;width:100%;height:100%;touch-action:none;background:radial-gradient(ellipse at 74% 18%,#ffecc0 0%,#b0cfed 23%,#8cb9da 62%,#5c83a7 100%)}
  .terrain-only-mode #city-voxel-crosshair {position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:26px monospace;color:#f2f6eccc;text-shadow:0 1px 4px #142f3b;pointer-events:none;z-index:2}
  .terrain-only-mode #city-voxel-status {position:absolute;top:64px;left:20px;z-index:2;background:#0f2535c9;padding:6px 10px;font:11px monospace;pointer-events:none}
  .terrain-only-mode .game-bottom {z-index:3}
  .terrain-only-mode .world-hud {z-index:2}
  .terrain-only-mode .city-welcome {z-index:5}
  .terrain-only-mode #city-jump {position:absolute;right:16px;bottom:20px;z-index:4;min-height:72px;min-width:72px;border-radius:50%;font:700 13px monospace;border:2px solid #c6efd6;color:#eff8f2;background:#20523dbf;touch-action:none;user-select:none;-webkit-user-select:none;box-shadow:0 4px 20px #0d261c9c}
  .terrain-only-mode #city-voxel-status {max-width:calc(100% - 40px);text-shadow:0 1px 2px #000}
 `;
 document.head.append(style);
 $('.alpha-tag').textContent='FORTRESS ROAD / FIRST PERSON';
 $('.solo-restore-label').textContent='SEPARATE TERRAIN SAVE';
 $('#population').textContent='Fortress Road · local progress';
 $('#room-mode').textContent='SEEDED SOLO WORLD';
 $('#welcome-title').textContent='FORTRESS ROAD';
 $('.welcome-lead').textContent='Walk the stone road, recover roadside builder supplies, then pass through the twin watchtowers and collect your persistent gate seal.';
 $('.welcome-steps').hidden=true;
 $('.welcome-goal').textContent='Beyond the gate, explore the mountains, forests and caves of your seeded world.';
 start.textContent='Enter first person →';
 $('.welcome-controls').textContent='WASD / arrows or mobile joystick · Swipe to look · E or touch COLLECT at the roadside cache, then BUILD a saved workbench · Space or Jump.';
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
 let voxel=voxelApi?.createVoxelWorld(world)||null;
 function restore(){
  const initial=voxel?.spawnAt()||world.spawnAt();
  try{
   const saved=JSON.parse(get(POS+seed));
   if(saved?.version===world.version&&saved.seed===seed&&
      Number.isFinite(saved.x)&&Number.isFinite(saved.y)&&
      Math.abs(saved.x)<1000000&&Math.abs(saved.y)<1000000)
    return {x:saved.x,y:saved.y,yaw:Number.isFinite(saved.yaw)?saved.yaw:0,pitch:Number.isFinite(saved.pitch)?Math.max(-1.3,Math.min(1.3,saved.pitch)):0,
     vertical:Number.isFinite(saved.vertical)&&saved.vertical>=voxel?.MIN_HEIGHT&&saved.vertical<=voxel?.MAX_HEIGHT?saved.vertical:undefined};
  }catch{}
  return {x:initial.x,y:initial.z??initial.y,yaw:0,pitch:0};
 }
 let player=restore(),running=false,paused=false,atlas=false,zoom=20,last=0,lastSave=0;
 let physics=voxel&&physicsApi?.createController(voxel,{x:player.x,z:player.y,y:player.vertical})||null;
 let jumpHeld=false,jumpQueued=false;
 const voxelCanvas=document.createElement('canvas');voxelCanvas.id='city-voxel-canvas';
 voxelCanvas.setAttribute('aria-label','First-person procedurally generated voxel wilderness. Drag to look around.');
 canvas.insertAdjacentElement('afterend',voxelCanvas);
 const softwareCanvas=document.createElement('canvas');
 softwareCanvas.id='city-road-canvas';softwareCanvas.hidden=true;
 softwareCanvas.setAttribute('aria-label','Fortress Road first-person view. Drag to look around.');
 voxelCanvas.insertAdjacentElement('afterend',softwareCanvas);
 const crosshair=document.createElement('div');crosshair.id='city-voxel-crosshair';crosshair.textContent='+';
 voxelCanvas.insertAdjacentElement('afterend',crosshair);
 const status=document.createElement('div');status.id='city-voxel-status';
 crosshair.insertAdjacentElement('afterend',status);
 const jumpButton=document.createElement('button');
 jumpButton.id='city-jump';jumpButton.type='button';jumpButton.textContent='JUMP';
 jumpButton.setAttribute('aria-label','Jump over rocks and terrain steps');
 status.insertAdjacentElement('afterend',jumpButton);
 jumpButton.addEventListener('pointerdown',e=>{jumpHeld=true;jumpQueued=true;e.preventDefault();jumpButton.setPointerCapture?.(e.pointerId);});
 for(const kind of ['pointerup','pointercancel','lostpointercapture'])
  jumpButton.addEventListener(kind,()=>jumpHeld=false);
 jumpButton.addEventListener('click',()=>{jumpQueued=true;});
 function openPerspective(){
  if(!voxel||!rendererApi)return null;
  try{
   const accelerated=rendererApi.createRenderer(voxelCanvas,voxel,definitions);
   if(accelerated)return accelerated;
  }catch{}
  return rendererApi.createCanvasRenderer(softwareCanvas,voxel);
 }
 let perspective=openPerspective();
 let firstPerson=!!perspective,contextInterrupted=false;
 // Android browsers can temporarily discard the WebGL context during app
 // switching or memory pressure. Keep the seed and physics alive in the 2D
 // fallback, then recreate only GPU resources after the context returns.
 voxelCanvas.addEventListener('webglcontextlost',event=>{
  event.preventDefault();
  contextInterrupted=true;
  const abandoned=perspective;
  perspective=rendererApi.createCanvasRenderer(softwareCanvas,voxel);firstPerson=!!perspective;syncView();
  // Stops outstanding mesh requests and retires resources associated with a
  // dead GL context; the restored context gets a fresh worker and GPU cache.
  try{abandoned?.dispose();}catch{}
 });
 voxelCanvas.addEventListener('webglcontextrestored',()=>{
  if(!contextInterrupted)return;
  perspective?.dispose();perspective=openPerspective();
  contextInterrupted=false;
  firstPerson=!!perspective;syncView();
 });
 function syncView(){
  const threeD=!!perspective&&firstPerson&&!atlas;
  softwareCanvas.hidden=!threeD||!perspective?.software;
  voxelCanvas.hidden=!threeD||!!perspective?.software;crosshair.hidden=!threeD;status.hidden=!threeD;jumpButton.hidden=!threeD;
  if(threeD&&physics){
   const position=physics.snapshot();
   // Switching from first-person to the biome atlas must never snap an
   // underground player back onto the roof of their current cave.
   if(Math.hypot(position.x-player.x,position.z-player.y)>.1)
    physics.teleport(player.x,player.y);
  }
  canvas.style.visibility=threeD?'hidden':'visible';
  viewButton.textContent=threeD?'Switch to 2D map':'Switch to first person';
 }
 function resetVoxel(){
  if(perspective)perspective.dispose();
  physics=voxel&&physicsApi?.createController(voxel,{x:player.x,z:player.y,y:player.vertical})||null;
  perspective=openPerspective();
  firstPerson=!!perspective;syncView();
 }
 const gateButton=document.createElement('button');
 gateButton.type='button';gateButton.id='city-gate-seal';gateButton.hidden=true;
 gateButton.style.cssText='position:absolute;right:16px;bottom:104px;z-index:4;padding:12px 16px;background:#402721;color:#fff1cc;border:1px solid #dbac63;border-radius:6px';
 status.insertAdjacentElement('afterend',gateButton);
 const sealKey=()=> 'meme-city-gate-seal-v1:'+seed;
 let sealClaimed=get(sealKey())==='1';
 function atGate(){
  const road=voxel?.gateRoad;
  return road&&Math.abs(player.x-road.gateX)<4.5&&player.y>=road.gateZ+3&&player.y<=road.gateZ+14
   &&Math.abs((physics?.snapshot().y??Infinity)-road.base)<2;
 }
 function claimSeal(){
  if(!running||paused||!firstPerson||atlas||!atGate()||sealClaimed)return;
  sealClaimed=put(sealKey(),'1');
  gateButton.textContent=sealClaimed?'Gate seal collected':'Save unavailable · retry';
 }
 gateButton.textContent='Claim gate seal';
 gateButton.addEventListener('click',claimSeal);
 // First usable scavenging interaction is tied to the same seeded road.
 // It cannot touch original Solo credits, wallet or existing city saves.
 const supplyButton=document.createElement('button');
 supplyButton.type='button';supplyButton.id='city-road-supplies';supplyButton.hidden=true;
 supplyButton.textContent='Collect 8 builder supplies';
 supplyButton.setAttribute('aria-label','Collect roadside builder supplies');
 supplyButton.style.cssText='position:absolute;right:16px;bottom:104px;z-index:4;padding:12px 16px;background:#31462a;color:#f2ffcb;border:1px solid #b9d46c;border-radius:6px;min-height:48px';
 gateButton.insertAdjacentElement('afterend',supplyButton);
 const supplyKey=()=> 'meme-city-road-supplies-v1:'+seed;
 let roadBuild=window.CityRoadBuilding?.create(seed,localStorage)||null;
 let suppliesClaimed=get(supplyKey())==='1';
 function atSupplies(){
  const cache=voxel?.gateRoad?.supplies;
  const feet=physics?.snapshot();
  return !!cache&&!!feet&&Math.hypot(player.x-cache.x,player.y-cache.z)<10
   &&Math.abs(feet.y-cache.y)<5;
 }
 function claimSupplies(){
  if(!running||paused||!firstPerson||atlas||!atSupplies()||suppliesClaimed)return;
  suppliesClaimed=put(supplyKey(),'1');
  supplyButton.textContent=suppliesClaimed?'8 supplies recovered':'Save unavailable · retry';
  updateHud();
 }
 supplyButton.addEventListener('click',claimSupplies);
 // The supply cache now enables a seed-scoped building action in the same
 // first-person scene. This overlay is an interim marker pending voxel mesh
 // integration with the renderer owner; it is not a simulated inventory.
 const buildButton=document.createElement('button');
 buildButton.type='button';buildButton.id='city-road-build';buildButton.hidden=true;
 buildButton.textContent='BUILD WORKBENCH · 8 SUPPLIES';
 buildButton.style.cssText='position:absolute;right:16px;bottom:158px;z-index:4;min-height:48px;padding:12px;background:#234b55;color:#fff;border:1px solid #c2e5e8;border-radius:6px';
 supplyButton.insertAdjacentElement('afterend',buildButton);
 const buildMarker=document.createElement('div');
 buildMarker.id='city-road-workbench';buildMarker.hidden=true;
 buildMarker.setAttribute('role','img');buildMarker.setAttribute('aria-label','Placed roadside workbench');
 buildMarker.style.cssText='position:absolute;left:50%;top:50%;z-index:2;pointer-events:none;color:#fff1bf;text-shadow:0 2px 4px #000;background:#4d382ac9;border:2px solid #c9aa69;border-radius:4px;padding:12px 16px;font:700 13px monospace;transform:translate(-50%,-50%)';
 buildMarker.textContent='▣ WORKBENCH · BUILT';
 buildButton.insertAdjacentElement('afterend',buildMarker);
 function atBuildSite(){
  const site=voxel?.gateRoad?.supplies;
  return !!site&&Math.hypot(player.x-site.x,player.y-site.z)<10;
 }
 function placeWorkbench(){
  if(!running||paused||!firstPerson||atlas||!roadBuild)return;
  if(roadBuild.place(suppliesClaimed,{x:player.x,z:player.y},voxel?.gateRoad?.supplies)){
   buildButton.hidden=true;updateHud();
  }else buildButton.textContent='Unable to save · retry';
 }
 buildButton.addEventListener('click',placeWorkbench);
 function interactRoad(){
  if(atGate()&&!sealClaimed)claimSeal();
  else if(!suppliesClaimed)claimSupplies();
  else if(!roadBuild?.placed)placeWorkbench();
 }
 function positionWorkbench(){
  const placed=roadBuild?.placed;
  if(!placed||!firstPerson||atlas||!running){buildMarker.hidden=true;return;}
  const dx=placed.x-player.x,dz=placed.z-player.y;
  const forward=dz*Math.cos(player.yaw)+dx*Math.sin(player.yaw);
  const side=dx*Math.cos(player.yaw)-dz*Math.sin(player.yaw);
  if(forward<=.5||Math.hypot(dx,dz)>45){buildMarker.hidden=true;return;}
  const shell=canvas.getBoundingClientRect();
  const ratio=side/Math.max(1,forward);
  if(Math.abs(ratio)>1.5){buildMarker.hidden=true;return;}
  buildMarker.hidden=false;
  buildMarker.style.left=(50+ratio*45)+'%';
  buildMarker.style.top=(54+player.pitch*32)+'%';
  buildMarker.style.opacity=String(Math.max(.35,Math.min(1,12/Math.max(1,forward))));
 }
 const keys=new Set(),held=new Set();
 const stick={x:0,y:0};
 function savePosition(){
  const feet=physics?.snapshot();
  const vertical=feet&&Math.hypot(feet.x-player.x,feet.z-player.y)<.1?feet.y:null;
  put(POS+seed,JSON.stringify({version:world.version,seed,x:player.x,y:player.y,yaw:player.yaw,pitch:player.pitch,vertical}));
 }
 function spawnNewWorld(){
  savePosition();seed=randomSeed();put(KEY,seed);
  world=engine.createTerrain(seed,definitions);
  voxel=voxelApi?.createVoxelWorld(world)||null;
  player=restore();
  resetVoxel();
  sealClaimed=get(sealKey())==='1';gateButton.textContent=sealClaimed?'Gate seal collected':'Claim gate seal';
  suppliesClaimed=get(supplyKey())==='1';supplyButton.textContent=suppliesClaimed?'8 supplies recovered':'Collect 8 builder supplies';
  roadBuild=window.CityRoadBuilding?.create(seed,localStorage)||null;
  lastSave=0;atlas=false;updateHud();
 }
 const button=document.createElement('button');
 button.type='button';button.textContent='New random world';
 button.title='Create a new world without deleting any older world saves';
 button.addEventListener('click',()=>{
  if(window.confirm('Create a new random terrain world? Your previous world save will remain stored.'))spawnNewWorld();
 });
 start.insertAdjacentElement('afterend',button);
 const returnButton=document.createElement('button');
 returnButton.type='button';returnButton.textContent='Start at Fortress Road';
 returnButton.addEventListener('click',()=>{
  const spawn=voxel?.spawnAt();
  if(!spawn||!physics?.teleport(spawn.x,spawn.z))return;
  player.x=spawn.x;player.y=spawn.z;player.yaw=0;player.pitch=0;
  savePosition();start.click();
 });
 start.insertAdjacentElement('afterend',returnButton);
 const atlasButton=document.createElement('button');
 atlasButton.type='button';atlasButton.textContent='Biome atlas';
 atlasButton.setAttribute('aria-pressed','false');
 atlasButton.addEventListener('click',()=>{atlas=!atlas;atlasButton.setAttribute('aria-pressed',String(atlas));syncView();});
 $('#zoom-toggle').insertAdjacentElement('afterend',atlasButton);
 const viewButton=document.createElement('button');viewButton.type='button';
 $('#zoom-toggle').insertAdjacentElement('afterend',viewButton);
 viewButton.addEventListener('click',()=>{firstPerson=!firstPerson;atlas=false;atlasButton.setAttribute('aria-pressed','false');syncView();});
 syncView();
 function updateHud(){
  const current=world.biomeAt(Math.round(player.x),Math.round(player.y));
  const road=voxel?.gateRoad;
  const distance=road?Math.hypot(road.gateX-player.x,road.gateZ-player.y):Infinity;
  $('#district').textContent=distance<65?(sealClaimed?'FORTRESS ROAD · SEAL COLLECTED':'FORTRESS GATE · '+Math.round(distance*.25)+' m'):current?.name?.toUpperCase()||'GENERATING';
  $('#save-state').textContent='Terrain world seed '+seed.slice(0,12)+'… · gate '+(sealClaimed?'claimed':'open')+' · builder supplies '+(suppliesClaimed?'8':'0')+'/8 · local save';
  $('#population').textContent='Fortress Road · '+(roadBuild?.placed?'workbench built':suppliesClaimed?'8 supplies ready to build':'roadside supplies ahead');
  $('#save-state').textContent+=(roadBuild?.placed?' · workbench built':'');
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
    const chunk=voxel?voxel.chunkAt(cx,cy):world.chunkAt(cx,cy);
    if(!chunk)continue;
    for(const tile of chunk.tiles){
     if(tile.x<left||tile.x>right||tile.y<top||tile.y>bottom)continue;
     const px=(tile.x-player.x)*zoom+w/2,py=((tile.z??tile.y)-player.y)*zoom+h/2;
     ctx.fillStyle=tile.water?'#1b6689':groundColor(tile);ctx.fillRect(Math.floor(px),Math.floor(py),Math.ceil(zoom)+1,Math.ceil(zoom)+1);
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
   const move=movement();
   if(firstPerson&&perspective&&!atlas){
    if(physics){
     const position=physics.tick({right:move.x,forward:-move.y,yaw:player.yaw,
      jump:keys.has(' ')||jumpHeld||jumpQueued},dt);
     jumpQueued=false;
     player.x=position.x;player.y=position.z;
    }else{
     const nx=player.x+move.x*dt*5,nz=player.y+move.y*dt*5;
     if(Math.abs(nx)<999900&&Math.abs(nz)<999900){player.x=nx;player.y=nz;}
    }
   }else{player.x+=move.x*dt*5;player.y+=move.y*dt*5;}
   status.dataset.worldX=String(player.x);status.dataset.worldZ=String(player.y);
   status.dataset.playerMode=firstPerson&&!atlas?'first-person':'atlas';
   gateButton.hidden=!firstPerson||atlas||!atGate();
   supplyButton.hidden=!firstPerson||atlas||suppliesClaimed||!atSupplies();
   buildButton.hidden=!firstPerson||atlas||!running||paused||!suppliesClaimed||!!roadBuild?.placed||!atBuildSite();
   positionWorkbench();
   gateButton.disabled=sealClaimed;
   if(sealClaimed)gateButton.textContent='Gate seal collected';
   const size=resize();
   if(atlas)drawAtlas(size.w,size.h);
   else if(firstPerson&&perspective){
    const ground=voxel.surfaceAt(Math.floor(player.x),Math.floor(player.y));
    if(ground){
     try{const cameraY=physics?.snapshot().y??ground.height+1;
     const metrics=perspective.render({x:player.x,z:player.y,y:cameraY,yaw:player.yaw,pitch:player.pitch});
      const gallery=voxel.caveRoomAt?.(Math.floor(player.x),Math.floor(player.y));
      const subterranean=!!gallery&&!gallery.exposed&&cameraY+voxel.EYE_HEIGHT<voxel.surfaceAt(Math.floor(player.x),Math.floor(player.y)).height+1;
      status.textContent=(perspective.software?'3D · compatibility · ':'3D · ')+metrics.loaded+'/'+metrics.wanted+' chunks · '+(metrics.vertices/1000).toFixed(0)+'k vertices · '+(voxel.VOXEL_METERS*100)+'cm blocks · elevation '+Math.round(cameraY*voxel.VOXEL_METERS)+'m'+(subterranean?' · CAVERN':'')+' · ~'+Math.round(1000/Math.max(1,metrics.frameAverage))+' fps'+' · '+Math.round(metrics.renderScale*100)+'% render'+' · supplies '+(suppliesClaimed?'8':'0')+'/8';
      status.dataset.renderScale=String(metrics.renderScale);
      status.dataset.viewRadius=String(metrics.viewRadius);
      status.dataset.cavern=String(subterranean);
      status.dataset.elevation=String(cameraY);
      status.dataset.grounded=String(physics?.snapshot().grounded??true);
      status.dataset.underground=String(subterranean);
      status.dataset.gpuBytes=String(metrics.gpuBytes);
      status.dataset.meshWorker=metrics.workerStatus;
      status.dataset.meshPending=String(metrics.pendingMeshes);
     }catch(err){
      // WebGL may initialize but fail during terrain mesh upload or draw.
      // Keep the existing player and seed in a usable first-person view.
      const failed=perspective;
      try{failed?.dispose();}catch{}
      try{perspective=failed?.software?null:rendererApi.createCanvasRenderer(softwareCanvas,voxel);}
      catch{perspective=null;}
      firstPerson=!!perspective;syncView();
      status.dataset.rendererError=String(err?.message||err).slice(0,120);
      status.textContent=perspective?'3D · compatibility renderer recovered':'3D unavailable · switch to 2D map';
     }
    }
   }else drawWorld(size.w,size.h);
   if(t-lastSave>1100){lastSave=t;savePosition();updateHud();}
  }
  requestAnimationFrame(frame);
 }
 $('#pause-toggle').addEventListener('click',()=>{paused=!paused;$('#pause-toggle').textContent=paused?'▶ Resume':'Ⅱ Pause';});
 $('#camera-view').addEventListener('change',e=>{zoom=e.target.value==='wide'?14:e.target.value==='detail'?28:20;});
 $('#zoom-toggle').addEventListener('click',()=>{zoom=zoom===20?28:zoom===28?14:20;});
 // Pointer drag or desktop pointer-lock changes first-person camera aim.
 let lookPointer=null,lastLookX=0,lastLookY=0;
 for(const lookCanvas of [voxelCanvas,softwareCanvas])lookCanvas.addEventListener('pointerdown',e=>{lookPointer=e.pointerId;lastLookX=e.clientX;lastLookY=e.clientY;lookCanvas.setPointerCapture?.(e.pointerId);});
 window.addEventListener('pointermove',e=>{
  if(!firstPerson||!running||paused)return;
  if(e.pointerId!==lookPointer&&document.pointerLockElement!==voxelCanvas)return;
  const dx=document.pointerLockElement===voxelCanvas?e.movementX:e.clientX-lastLookX;
  const dy=document.pointerLockElement===voxelCanvas?e.movementY:e.clientY-lastLookY;
  lastLookX=e.clientX;lastLookY=e.clientY;
  player.yaw+=dx*.0042;player.pitch=Math.max(-1.32,Math.min(1.32,player.pitch-dy*.0035));
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(type,e=>{if(e.pointerId===lookPointer)lookPointer=null;});
 voxelCanvas.addEventListener('dblclick',()=>voxelCanvas.requestPointerLock?.());
 $('#fullscreen-toggle').addEventListener('click',()=>{$('.game-shell').requestFullscreen?.();});
 $('#fullscreen-exit').addEventListener('click',()=>{document.exitFullscreen?.();});
 window.addEventListener('keydown',e=>{
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();
  if(e.key.toLowerCase()==='e')interactRoad();
  keys.add(e.key.length===1?e.key.toLowerCase():e.key);
 });
 window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
 window.addEventListener('blur',()=>{keys.clear();held.clear();stick.x=0;stick.y=0;jumpHeld=false;jumpQueued=false;savePosition();});
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
