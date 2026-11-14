/* Real headless Chromium test for the terrain-only 132-biome entry.
 * Confirms the same city.html boots without legacy NPCs and survives reload.
 */
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import {createCityServer} from '../server/city-server.mjs';
const executable=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser']
 .map(x=>spawnSync('which',[x],{encoding:'utf8'})).find(x=>x.status===0)?.stdout.trim();
if(!executable)throw Error('Chrome/Chromium is required for terrain entry QA');
const profile=await mkdtemp(path.join(tmpdir(),'meme-city-terrain-'));
const app=createCityServer(),server=app.server;
let browser,ws,seq=0;
const pending=new Map(),exceptions=[];
const request=(method,params={})=>new Promise((resolve,reject)=>{
 const id=++seq;pending.set(id,{resolve,reject});
 ws.send(JSON.stringify({id,method,params}));
});
async function waitFor(fn,label,timeout=20000){
 const until=Date.now()+timeout;let problem;
 while(Date.now()<until){
  try{const answer=await fn();if(answer)return answer;}catch(e){problem=e;}
  await delay(140);
 }
 throw Error('Timeout: '+label+(problem?' / '+problem.message:''));
}
async function evalPage(expression){
 const response=await request('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(response.exceptionDetails)throw Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text);
 return response.result?.value;
}
try{
 await new Promise((resolve,reject)=>{
  server.once('error',reject);server.listen(0,'127.0.0.1',()=>{server.off('error',reject);resolve();});
 });
 browser=spawn(executable,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
  '--enable-unsafe-swiftshader','--use-angle=swiftshader','--remote-debugging-port=0','--user-data-dir='+profile,
  '--no-first-run','about:blank'],{stdio:['ignore','pipe','pipe']});
 // Preserve bounded browser diagnostics when CI fails before CDP connects.
 // Chrome startup failures must not be confused with game-render failures.
 let chromeOutput='';
 const capture=chunk=>{chromeOutput=(chromeOutput+chunk.toString()).slice(-12000);};
 browser.stdout.on('data',capture);
 browser.stderr.on('data',capture);
 let browserLaunchError=null;
 browser.on('error',error=>{browserLaunchError=error;});
 const port=await waitFor(async()=>{
  if(browserLaunchError)throw Error('Chrome spawn error: '+browserLaunchError.message);
  if(browser.exitCode!==null||browser.signalCode!==null)
   throw Error('Chrome exited before CDP: code='+browser.exitCode+' signal='+browser.signalCode+' output='+chromeOutput);
  try{return Number((await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0])||null;}
  catch{return null;}
 },'CDP port').catch(error=>{
  throw Error(error.message+' / chrome='+executable+' / exit='+browser.exitCode+
   ' / signal='+browser.signalCode+' / output='+chromeOutput.slice(-6000));
 });
 const response=await fetch('http://127.0.0.1:'+port+'/json/new?about:blank',{method:'PUT'});
 assert.equal(response.status,200);
 const page=await response.json();ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{
  ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});
 });
 ws.addEventListener('message',event=>{
  const msg=JSON.parse(event.data);
  if(msg.id&&pending.has(msg.id)){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(Error(msg.error.message)):p.resolve(msg.result);}
  if(msg.method==='Runtime.exceptionThrown')exceptions.push(msg.params.exceptionDetails.text||'Runtime error');
 });
 await request('Page.enable');await request('Runtime.enable');await request('Performance.enable');
 await request('Emulation.setDeviceMetricsOverride',{width:412,height:915,deviceScaleFactor:2,mobile:true});
 const url='http://127.0.0.1:'+server.address().port+'/city.html?terrain=1';
 await request('Page.navigate',{url:new URL('index.html',url).href});
 await waitFor(()=>evalPage('!!document.querySelector(".game-direct-play")'),'homepage Play action');
 // Use a known traversal seed for the release acceptance journey; other
 // randomized seeds are covered by independent deterministic world tests.
 // This prevents terrain-seed lottery from masking renderer regressions.
 await evalPage('localStorage.setItem("meme-city-terrain-seed-v1","fortress-road");true');
 assert.equal(await evalPage('document.querySelector(".game-direct-play").href'),url);
 await evalPage('document.querySelector(".game-direct-play").click();true');
 await waitFor(()=>evalPage('!!window.CityTerrainWorld?.createTerrain && document.body.classList.contains("terrain-only-mode")'),'terrain script boot');
 // Verify the browser followed the actual homepage CTA, not a synthetic direct
 // navigation to city.html. This still tests the transitional terrain route;
 // a separate wallet-free canonical Solo journey remains a release gate.
 const enteredUrl=await evalPage('location.href');
 assert.equal(enteredUrl,url,'homepage Play must navigate to its advertised URL');
 const entryState=await evalPage('(()=>({intro:!!document.getElementById("city-intro"),start:!!document.getElementById("start-button"),walletGate:!!document.querySelector("[data-wallet-required=true]")}))()');
 assert.equal(entryState.intro&&entryState.start,true,'homepage Play must expose the game start action');
 assert.equal(entryState.walletGate,false,'wallet-free Solo entry must not require a wallet gate');
 console.log('QA_HOMEPAGE_PLAY',JSON.stringify({enteredUrl,viewport:'412x915',renderer:'SwiftShader Chromium',walletGate:entryState.walletGate,canonicalSoloVerified:false}));

 const initial=await evalPage('(()=>{const seed=localStorage.getItem("meme-city-terrain-seed-v1");const w=CityTerrainWorld.createTerrain(seed,CityFrontier.regions);const c=w.chunkAt(0,0);return {seed,count:w.anchors.length,types:new Set(w.anchors.map(a=>w.biomeAt(Math.round(a.x),Math.round(a.y)).id)).size,sites:c.sites.length,structures:c.structures.length,roads:c.tiles.filter(t=>t.road).length,legacy:localStorage.getItem("offensive-meme-city-v1-center")};})()');
 assert.equal(initial.count,132);assert.equal(initial.types,132);
 const voxel=await evalPage('(()=>{const atlas=CityTerrainWorld.createTerrain(localStorage.getItem("meme-city-terrain-seed-v1"),CityFrontier.regions);const world=CityVoxelWorld.createVoxelWorld(atlas);const ground=world.surfaceAt(0,0);const mesh=CityVoxelRenderer.generateMesh(world,0,0);return {block:world.VOXEL_METERS,eye:world.EYE_HEIGHT,caves:typeof world.caveAt==="function",height:ground.height,vertices:mesh.vertices,plants:mesh.plants};})()');
 assert.equal(voxel.block,.25);
 assert.equal(voxel.eye,6.4);
 const physicsAvailable=await evalPage('typeof CityVoxelPhysics?.createController==="function"');
 assert.equal(physicsAvailable,true,'first-person physics must ship with the playable site');
 const controls=await evalPage('(()=>{const b=document.getElementById("city-jump");return {exists:!!b,label:b?.getAttribute("aria-label")};})()');
 assert.equal(controls.exists,true,'mobile jump button must be present');
 assert.match(controls.label,/Jump/);
 assert.equal(voxel.caves,true);
 assert.ok(voxel.height>0&&voxel.vertices>1536);
 assert.equal(initial.sites,0);assert.equal(initial.structures,0);assert.equal(initial.roads,0);
 assert.equal(initial.legacy,null,'new terrain preview does not overwrite the original solo save');
 await evalPage('document.getElementById("start-button").click();true');
 await waitFor(()=>evalPage('document.getElementById("city-intro").hidden===true'),'enter terrain');
 const view=await evalPage('(()=>{const canvas=document.getElementById("city-voxel-canvas");const gl=canvas?.getContext("webgl");return {exists:!!canvas,gl:!!gl,hidden:canvas?.hidden,crosshair:!!document.getElementById("city-voxel-crosshair")};})()');
 assert.equal(view.gl,true,'release CI must exercise WebGL gameplay');
 assert.equal(view.exists,true);assert.equal(view.crosshair,true);

 // Android dual-stick acceptance: rotating the viewport must reveal two
 // independent controls without affecting the original desktop keyboard path.
 await request('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 await request('Emulation.setDeviceMetricsOverride',{width:915,height:412,deviceScaleFactor:2,mobile:true});
 await waitFor(()=>evalPage('matchMedia("(orientation:landscape)").matches && matchMedia("(pointer:coarse)").matches'),'landscape touch viewport',8000);
 const mobile=await evalPage('(()=>{const left=document.getElementById("joystick"),right=document.getElementById("city-look-pad"),jump=document.getElementById("city-jump"),use=document.getElementById("city-mobile-interact"),land=document.getElementById("city-landscape");return {left:!!left,right:!!right,jump:!!jump,use:!!use,land:!!land,lookVisible:getComputedStyle(right).display!=="none"&&!right.hidden,leftVisible:getComputedStyle(left).display!=="none",height:document.querySelector(".game-shell").getBoundingClientRect().height,screen:innerHeight};})()');
 assert.equal(mobile.left&&mobile.right&&mobile.jump&&mobile.use&&mobile.land,true,'landscape must expose both sticks and action buttons');
 assert.equal(mobile.lookVisible&&mobile.leftVisible,true,'landscape sticks must be visibly rendered');
 assert.ok(Math.abs(mobile.height-mobile.screen)<5,'landscape game should fill available viewport height');
 const firstYaw=await evalPage('Number(document.getElementById("city-voxel-status").dataset.lookYaw || "0")');
 assert.ok(Number.isFinite(firstYaw),'look control must have a numeric initial yaw');
 await evalPage(`(()=>{
  const left=document.getElementById("joystick"),right=document.getElementById("city-look-pad");
  const a=left.getBoundingClientRect(),b=right.getBoundingClientRect();
  left.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerId:401,clientX:a.left+a.width/2,clientY:a.top+a.height*.20}));
  right.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerId:402,clientX:b.left+b.width*.82,clientY:b.top+b.height/2}));
  return true;
 })()`);
 const dual=await evalPage('(()=>({movement:document.getElementById("joystick-knob").style.transform,look:document.getElementById("city-look-knob").style.transform}))()');
 assert.match(dual.movement,/translate/,'left movement joystick must respond independently');
 assert.match(dual.look,/translate/,'right look joystick must respond independently');
 await waitFor(async()=>Number(await evalPage('Number(document.getElementById("city-voxel-status").dataset.lookYaw)'))>firstYaw+.015,'right thumbstick rotates actual first-person camera',8000);
 await evalPage(`(()=>{
  document.getElementById("joystick").dispatchEvent(new PointerEvent("pointerup",{bubbles:true,pointerId:401}));
  document.getElementById("city-look-pad").dispatchEvent(new PointerEvent("pointerup",{bubbles:true,pointerId:402}));
  return true;
 })()`);
 assert.equal(await evalPage('document.getElementById("city-look-knob").style.transform'),'','right thumbstick must recenter after release');
 await request('Emulation.setDeviceMetricsOverride',{width:412,height:915,deviceScaleFactor:2,mobile:true});
 await request('Emulation.setTouchEmulationEnabled',{enabled:false});

 if(view.gl){
  assert.equal(view.hidden,false,'first person is default when WebGL works');
  assert.equal(await evalPage('document.getElementById("city-jump").hidden'),false,'mobile jump must be visible in first person');
  await waitFor(()=>evalPage('document.getElementById("city-voxel-status")?.textContent.startsWith("3D ·")'),'3D chunk rendering',30000);
  await waitFor(()=>evalPage('document.getElementById("city-voxel-status")?.dataset.meshWorker==="ready"'),'Web Worker terrain mesher initializes',30000);
  await waitFor(()=>evalPage('Number(document.getElementById("city-voxel-status")?.dataset.gpuBytes)>0'),'transferred worker geometry draws in WebGL',30000);
  const workerMetrics=await evalPage('(()=>{const el=document.getElementById("city-voxel-status");return {status:el.dataset.meshWorker,pending:Number(el.dataset.meshPending),gpuBytes:Number(el.dataset.gpuBytes)};})()');
  assert.equal(workerMetrics.status,'ready','first-person browser uses off-thread deterministic mesher');
  assert.ok(workerMetrics.pending>=0&&workerMetrics.pending<=2,'mesh request backpressure is bounded');
  // Exercise an actual first-person resource pickup on mobile-size Chromium.
  // Never collect by writing the storage key directly: this is the public UI.
  assert.equal(await evalPage('document.getElementById("city-road-supplies")?.hidden'),true);
  await request('Input.dispatchKeyEvent',{type:'keyDown',key:'w',code:'KeyW',windowsVirtualKeyCode:87});
  try{
   await waitFor(()=>evalPage('!document.getElementById("city-road-supplies").hidden'),'walk to the roadside supply cache',90000);
   await evalPage('document.getElementById("city-road-supplies").click();true');
   assert.equal(await evalPage('localStorage.getItem("meme-city-road-supplies-v1:"+localStorage.getItem("meme-city-terrain-seed-v1"))'),'1');
   // Sample actual controller displacement during gate traversal. A 90-second
   // timeout without a trajectory cannot distinguish collision from low FPS.
   const gateStart=Date.now();
   const gateSamples=[];
   let lastGateSample=0;
   try{
    await waitFor(async()=>{
     const now=Date.now();
     if(now-lastGateSample>=5000){
      lastGateSample=now;
      const sample=await evalPage(`(()=>{const s=document.getElementById("city-voxel-status");return {x:s?.dataset.playerX,z:s?.dataset.playerZ,yaw:s?.dataset.lookYaw,fps:s?.dataset.fps,frame:s?.dataset.frameMs,gateHidden:document.getElementById("city-gate-seal")?.hidden};})()`);
      gateSamples.push({elapsedMs:now-gateStart,...sample});
     }
     return evalPage('!document.getElementById("city-gate-seal").hidden');
    },'walk under the fortress arch',90000);
   }catch(error){
    // Capture live state before releasing W. A timeout alone cannot distinguish
    // structural collision, stalled input, camera orientation or interaction range.
    const diagnostics=await evalPage(`(()=>{
     const status=document.getElementById("city-voxel-status");
     const gate=document.getElementById("city-gate-seal");
     const supplies=document.getElementById("city-road-supplies");
     return {seed:localStorage.getItem("meme-city-terrain-seed-v1"),
      statusText:status?.textContent?.slice(0,500),
      statusData:status?Object.fromEntries(Object.entries(status.dataset)):null,
      gateHidden:gate?.hidden,gateText:gate?.textContent?.slice(0,160),
      suppliesHidden:supplies?.hidden,visibility:document.visibilityState,
      viewport:{width:innerWidth,height:innerHeight},
      errors:window.__cityRuntimeErrors||null};
    })()`).catch(e=>({diagnosticError:e.message}));
    throw Error(error.message+" / gate trajectory: "+JSON.stringify(gateSamples)+" / gate traversal diagnostics: "+JSON.stringify(diagnostics));
   }
  }finally{
   await request('Input.dispatchKeyEvent',{type:'keyUp',key:'w',code:'KeyW',windowsVirtualKeyCode:87});
  }
  await evalPage('document.getElementById("city-gate-seal").click();true');
  assert.equal(await evalPage('localStorage.getItem("meme-city-gate-seal-v1:"+localStorage.getItem("meme-city-terrain-seed-v1"))'),'1');
  const error=await evalPage('document.getElementById("city-voxel-canvas").getContext("webgl").getError()');
  assert.equal(error,0,'first-person 3D frame must not cause WebGL errors');
  const metrics=await evalPage('(()=>{const el=document.getElementById("city-voxel-status");return {gpuBytes:Number(el.dataset.gpuBytes),underground:el.dataset.underground,hasGallery:typeof CityVoxelWorld.createVoxelWorld(CityTerrainWorld.createTerrain(localStorage.getItem("meme-city-terrain-seed-v1"),CityFrontier.regions)).caveRoomAt==="function"};})()');
  assert.ok(metrics.gpuBytes>0&&metrics.gpuBytes<=24*1024*1024,'rendered GPU terrain remains inside 24MiB budget');
  assert.ok(['true','false'].includes(metrics.underground),'camera HUD tracks cave state');
  assert.equal(metrics.hasGallery,true,'underground gallery topology available in deployed game');
  const worldDetails=await evalPage('(()=>{const seed=localStorage.getItem("meme-city-terrain-seed-v1");const w=CityVoxelWorld.createVoxelWorld(CityTerrainWorld.createTerrain(seed,CityFrontier.regions));return {types:w.atlas.biomes.length,hasCaverns:typeof w.caveRoomAt==="function",caveCache:w.caveCacheSize(),height:w.MAX_HEIGHT};})()');
  assert.equal(worldDetails.types,132);
  assert.equal(worldDetails.hasCaverns,true);
  assert.equal(worldDetails.height,2048);
  const viewDistance=await evalPage('Number(document.getElementById("city-voxel-status").dataset.viewRadius)');
  assert.ok(viewDistance>=5&&viewDistance<=7,'adaptive view radius stays in mobile-safe range');
  const scale=await evalPage('Number(document.getElementById("city-voxel-status").dataset.renderScale)');
  assert.ok(scale>=.75&&scale<=1,'adaptive Android backing-buffer quality remains within 76–100% range');
  const surfaceLighting=await evalPage('(()=>{const tile={height:100},flat=Array.from({length:4},()=>({height:100})),hill=[{height:105},{height:120},{height:103},{height:115}];return {flat:CityVoxelRenderer.surfaceLight(tile,flat),shadow:CityVoxelRenderer.surfaceLight(tile,hill),waterShallow:CityVoxelRenderer.waterColor(0)[1],waterDeep:CityVoxelRenderer.waterColor(75)[1]};})()');
  assert.equal(surfaceLighting.flat,1);
  assert.ok(surfaceLighting.shadow<surfaceLighting.flat);
  assert.ok(surfaceLighting.waterShallow>surfaceLighting.waterDeep);
 }

 await waitFor(()=>evalPage('(()=>{const c=document.getElementById("city-canvas");return c.width>100&&c.height>100&&!!localStorage.getItem("meme-city-terrain-position-v1:"+localStorage.getItem("meme-city-terrain-seed-v1"));})()'),'paint and save world');
 // Page-exit save is exercised; seed, supply and gate persistence are
 // asserted below. The separate position-replay test needs repair before
 // it can reliably distinguish rendering stalls from physics movement.
 if(view.gl)await evalPage('window.dispatchEvent(new Event("pagehide"));true');
 // Snapshot the actual persisted position before navigation. This verifies
 // reload does not silently overwrite a valid saved location with spawn data;
 // controller displacement is a separate, stricter acceptance requirement.
 const positionBeforeReload=await evalPage('(()=>{const seed=localStorage.getItem("meme-city-terrain-seed-v1");return localStorage.getItem("meme-city-terrain-position-v1:"+seed);})()');
 assert.ok(positionBeforeReload,'position save must exist before reload');
 const positionBeforeParsed=JSON.parse(positionBeforeReload);
 assert.ok(positionBeforeParsed&&typeof positionBeforeParsed==='object','position save must be an object');
 // Reject malformed coordinates before calling a stored payload a valid save.
 // A byte-for-byte replay of NaN/null/out-of-range coordinates is not persistence.
 const savedCoordinates=Object.entries(positionBeforeParsed).filter(([key])=>/^(x|y|z|worldX|worldY|worldZ)$/.test(key));
 assert.ok(savedCoordinates.length>=2,'saved player position must contain at least two coordinate axes');
 for(const [axis,value] of savedCoordinates){
  assert.equal(typeof value,'number','saved '+axis+' must be numeric');
  assert.ok(Number.isFinite(value),'saved '+axis+' must be finite');
 }

 // Preserve browser cache on ordinary player reload; the separate renderer-failure
 // reload below deliberately bypasses cache to isolate compatibility startup.
 // Capture comparable document-scoped metrics before the normal cached reload.
 // CDP cumulative durations reset with navigation; never interpret their
 // difference across documents as an in-process memory leak.
 const readQaMetrics=async(stage)=>{
  const values=(await request('Performance.getMetrics')).metrics||[];
  const names=['JSHeapUsedSize','JSHeapTotalSize','Nodes','Documents','Frames','TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration'];
  const metrics=Object.fromEntries(values.filter(m=>names.includes(m.name)).map(m=>[m.name,m.value]));
  console.log('QA_BROWSER_METRICS '+JSON.stringify({stage,environment:'headless Chromium / SwiftShader / mobile viewport emulation',metrics}));
  return metrics;
 };
 // Same-document observation window: cumulative CDP duration counters are
 // comparable only while the document remains alive. This is a diagnostic,
 // not a leak verdict or a physical Android benchmark.
 const sampleQaWindow=async(stage)=>{
  const before=await readQaMetrics(stage+'-window-start');
  await delay(250);
  const after=await readQaMetrics(stage+'-window-end');
  const delta={};
  for(const key of ['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration']){
   if(Number.isFinite(before[key])&&Number.isFinite(after[key]))
    delta[key]=Math.max(0,after[key]-before[key]);
  }
  console.log('QA_BROWSER_WINDOW '+JSON.stringify({
   stage,elapsedMs:250,environment:'headless Chromium / SwiftShader / mobile viewport emulation',
   cumulativeDurationDeltaSeconds:delta,
   heapUsedDeltaBytes:Number.isFinite(before.JSHeapUsedSize)&&Number.isFinite(after.JSHeapUsedSize)
    ?after.JSHeapUsedSize-before.JSHeapUsedSize:null,
   caveat:'Short same-document diagnostic; heap growth alone does not establish a leak'
  }));
 };
 // Resource Timing is scoped to each navigation. Capture transfer accounting
 // within each document instead of subtracting cumulative counters across reloads.
 // Duplicate URL entries are diagnostics, not proof of duplicate network transfers:
 // cached and service-worker responses can have transferSize=0.
 const readResourceAccounting=async(stage)=>{
  const resources=await evalPage(`(()=>{
   const rows=performance.getEntriesByType("resource").map(e=>({
    name:e.name,initiatorType:e.initiatorType,
    transferSize:e.transferSize,encodedBodySize:e.encodedBodySize,
    decodedBodySize:e.decodedBodySize,duration:e.duration
   }));
   return rows;
  })()`);
  const grouped=new Map();
  for(const entry of resources){
   const old=grouped.get(entry.name)||{url:entry.name,count:0,transferBytes:0,encodedBytes:0};
   old.count++;old.transferBytes+=entry.transferSize||0;
   old.encodedBytes+=entry.encodedBodySize||0;grouped.set(entry.name,old);
  }
  const repeats=[...grouped.values()].filter(x=>x.count>1)
   .sort((a,b)=>b.count-a.count).slice(0,12);
  const report={stage,environment:'headless Chromium / SwiftShader / mobile viewport emulation',
   resourceEntries:resources.length,uniqueUrls:grouped.size,
   transferBytes:resources.reduce((n,e)=>n+(e.transferSize||0),0),
   encodedBytes:resources.reduce((n,e)=>n+(e.encodedBodySize||0),0),
   repeatedUrls:repeats,
   caveat:'Resource Timing excludes some worker/subresource traffic; repeated entries do not prove duplicate downloads'};
  console.log('QA_RESOURCE_ACCOUNTING '+JSON.stringify(report));
  return report;
 };
 await readResourceAccounting('before-cached-reload');
 await sampleQaWindow('before-cached-reload');
 await request('Page.reload',{ignoreCache:false});
 await waitFor(()=>evalPage('document.body.classList.contains("terrain-only-mode")'),'reload terrain mode');
 // Guard against a no-op reload: the persistence checks below are only
 // meaningful after Chromium has performed a real document navigation.
 assert.equal(await evalPage('performance.getEntriesByType("navigation")[0]?.type'),'reload','ordinary persistence check must follow a real browser reload');
 const stored=await evalPage('(()=>({seed:localStorage.getItem("meme-city-terrain-seed-v1"),saved:JSON.parse(localStorage.getItem("meme-city-terrain-position-v1:"+localStorage.getItem("meme-city-terrain-seed-v1"))),original:localStorage.getItem("offensive-meme-city-v1-center")}))()');
 await sampleQaWindow('after-cached-reload');
 await readResourceAccounting('after-cached-reload');
 assert.equal(stored.seed,initial.seed);
 assert.deepEqual(stored.saved,positionBeforeParsed,'normal reload must preserve the pre-navigation saved coordinates');
 // Separate live-controller telemetry from stored coordinates. A save-key
 // round trip does not prove that physics restored the player's location.
 const liveReloadPosition=await evalPage(`(()=>{
  const s=document.getElementById("city-voxel-status");
  const values={x:s?.dataset.playerX,z:s?.dataset.playerZ,yaw:s?.dataset.lookYaw};
  return {values,finiteAxes:["x","z"].filter(k=>values[k]!==undefined&&Number.isFinite(Number(values[k]))).length,
   renderer:s?.dataset.meshWorker,seed:localStorage.getItem("meme-city-terrain-seed-v1")};
 })()`);
 console.log('QA_LIVE_POSITION_RELOAD '+JSON.stringify({stage:'cached-reload-before-start',
  saved:stored.saved,live:liveReloadPosition,
  caveat:'Controller may not initialize until Start; diagnostic only, not position parity'}));



 if(view.gl)assert.equal(await evalPage('localStorage.getItem("meme-city-gate-seal-v1:"+localStorage.getItem("meme-city-terrain-seed-v1"))'),'1');
 assert.equal(await evalPage('localStorage.getItem("meme-city-road-supplies-v1:"+localStorage.getItem("meme-city-terrain-seed-v1"))'),'1','roadside supplies persist across reload');
 assert.equal(stored.original,null);
 // Force WebGL initialization failure in this isolated browser session.
 await request('Page.addScriptToEvaluateOnNewDocument',{source:`
  const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){
   return type==='webgl'?null:original.call(this,type,...args);
  };
 `});
 await request('Page.reload',{ignoreCache:true});
 await waitFor(()=>evalPage('!!document.querySelector("#city-road-canvas")'),'compatibility renderer boot');
 await evalPage('document.getElementById("start-button").click();true');
 try{
  await waitFor(()=>evalPage('!document.querySelector("#city-road-canvas").hidden && document.querySelector("#city-voxel-status").dataset.meshWorker==="canvas"'),'first-person rendering with WebGL unavailable',30000);
 }catch(error){
  // Preserve the acceptance assertion while separating a missing canvas,
  // stale status, saved-state restoration and startup exceptions.
  const diagnostics=await evalPage(`(()=>{
   const canvas=document.querySelector("#city-road-canvas");
   const status=document.querySelector("#city-voxel-status");
   const hint=document.getElementById("city-render-hint");
   const seed=localStorage.getItem("meme-city-terrain-seed-v1");
   const rect=canvas?.getBoundingClientRect();
   return {seed,position:localStorage.getItem("meme-city-terrain-position-v1:"+seed),
    canvas:{exists:!!canvas,hidden:canvas?.hidden,width:canvas?.width,height:canvas?.height,
     cssDisplay:canvas?getComputedStyle(canvas).display:null,
     rect:rect?{width:rect.width,height:rect.height}:null},
    renderer:status?.dataset.meshWorker,statusData:status?Object.fromEntries(Object.entries(status.dataset)):null,
    hint:{hidden:hint?.hidden,text:hint?.textContent?.slice(0,180)},
    introHidden:document.getElementById("city-intro")?.hidden,
    compatibilityToggle:document.getElementById("city-compatibility-toggle")?.textContent,
    readyState:document.readyState,errors:window.__cityRuntimeErrors||null};
  })()`).catch(e=>({diagnosticError:e.message}));
  throw Error(error.message+" / compatibility renderer diagnostics: "+JSON.stringify({diagnostics,exceptions}));
 }
 // The compatibility renderer must restore the SAME seed and previously
 // claimed interactions; a painted canvas alone is not state parity.
 const fallbackState=await evalPage('(()=>{const seed=localStorage.getItem("meme-city-terrain-seed-v1");return {seed,position:JSON.parse(localStorage.getItem("meme-city-terrain-position-v1:"+seed)),supplies:localStorage.getItem("meme-city-road-supplies-v1:"+seed),gate:localStorage.getItem("meme-city-gate-seal-v1:"+seed)};})()');
 assert.equal(fallbackState.seed,initial.seed,'compatibility renderer retains the same world seed');
 assert.deepEqual(fallbackState.position,stored.saved,'renderer switch must not rewrite saved player position');
 assert.equal(fallbackState.supplies,'1','compatibility renderer retains collected supplies');
 assert.equal(fallbackState.gate,'1','compatibility renderer retains opened fortress gate');
 assert.equal(await evalPage('document.getElementById("city-compatibility-toggle")?.textContent'),'TRY WEBGL 3D');
 await waitFor(()=>evalPage('document.getElementById("city-render-hint")?.hidden===true'),'compatibility scene becomes visible',30000);
 // Compare the compatibility renderer's actual document resource footprint
 // with the accelerated route without conflating navigation-scoped timings.
 await readResourceAccounting('compatibility-renderer-startup');
 await sampleQaWindow('compatibility-renderer-startup');
 assert.equal(await evalPage('!!document.querySelector("a[href*=\\\"render=canvas\\\"]")'),true,'there is an escape route to low graphics before starting');
 assert.equal(await evalPage('document.querySelector("#city-road-canvas").getContext("2d").getImageData(1,1,1,1).data[3]'),255);
 const colorCount=await evalPage(`(()=>{
  const c=document.querySelector("#city-road-canvas"),ctx=c.getContext("2d");
  const pixels=ctx.getImageData(0,0,c.width,c.height).data;
  const distinct=new Set();
  for(let row=0;row<10;row++)for(let col=0;col<8;col++){
   const y=Math.floor((row+.5)*c.height/10),x=Math.floor((col+.5)*c.width/8);
   const i=(y*c.width+x)*4;
   distinct.add([pixels[i],pixels[i+1],pixels[i+2]].join(","));
  }
  return distinct.size;
 })()`);
 assert.ok(colorCount>=8,'compatibility renderer must paint actual scene pixels, not a black/gray viewport');

 // Exercise the same live camera controller after WebGL failure, not only
 // storage restoration and nonblank Canvas2D pixels. This remains a synthetic
 // touch-emulation check; physical Android is a separate release gate.
 await request('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 await request('Emulation.setDeviceMetricsOverride',{width:915,height:412,deviceScaleFactor:2,mobile:true});
 await waitFor(()=>evalPage('matchMedia("(orientation:landscape)").matches && matchMedia("(pointer:coarse)").matches'),'compatibility touch viewport',8000);
 const fallbackYaw=await evalPage('Number(document.getElementById("city-voxel-status").dataset.lookYaw)');
 assert.ok(Number.isFinite(fallbackYaw),'compatibility camera exposes numeric yaw');
 await evalPage(`(()=>{
  const pad=document.getElementById("city-look-pad"),r=pad.getBoundingClientRect();
  if(!r.width||!r.height)throw Error("compatibility look pad has no touch target");
  pad.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerId:501,clientX:r.left+r.width*.82,clientY:r.top+r.height/2}));
  return true;
 })()`);
 try{
  await waitFor(()=>evalPage('Number(document.getElementById("city-voxel-status").dataset.lookYaw)') .then(yaw=>yaw>fallbackYaw+.015),'compatibility right stick rotates shared camera',8000);
 }finally{
  await evalPage('document.getElementById("city-look-pad").dispatchEvent(new PointerEvent("pointerup",{bubbles:true,pointerId:501}));true');
 }
 assert.equal(await evalPage('document.getElementById("city-look-knob").style.transform'),'','compatibility look stick recenters');
 // Confirm the compatibility path accepts movement input independently of
 // camera look. This is an input contract, not yet a position-replay proof.
 const fallbackMove=await evalPage(`(()=>{
  const pad=document.getElementById("joystick"),r=pad.getBoundingClientRect();
  if(!r.width||!r.height)throw Error("compatibility movement pad has no touch target");
  pad.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerId:502,clientX:r.left+r.width/2,clientY:r.top+r.height*.18}));
  return document.getElementById("joystick-knob").style.transform;
 })()`);
 try{
  assert.match(fallbackMove,/translate/,'compatibility movement stick responds to touch');
 }finally{
  await evalPage('document.getElementById("joystick").dispatchEvent(new PointerEvent("pointerup",{bubbles:true,pointerId:502}));true');
 }
 assert.equal(await evalPage('document.getElementById("joystick-knob").style.transform'),'','compatibility movement stick recenters');
 await request('Emulation.setTouchEmulationEnabled',{enabled:false});

 // CDP measurements are from synthetic Chromium/SwiftShader, NOT physical Android.
 // Keep this diagnostic non-gating until representative device baselines exist.
 await readQaMetrics('compatibility-after-reload');
 assert.deepEqual(exceptions,[],'no uncaught JS exceptions in terrain-mode browser entry');
 console.log('PASS: mobile Chromium quarter-scale terrain, first-person viewport '+(view.gl?'WebGL':'fallback')+', 132 biomes, fortress road and gate seal, movement and seed restoration');
}finally{
 for(const x of pending.values())x.reject(Error('Browser closed'));
 if(ws){try{ws.close();}catch{}}
 if(browser){
  browser.kill('SIGKILL');
  await Promise.race([
   new Promise(resolve=>{if(browser.exitCode!==null||browser.signalCode!==null)return resolve();browser.once('exit',resolve);}),
   delay(1800)
  ]);
 }
 await new Promise(resolve=>server.close(resolve));
 // Chrome can still flush its Default profile briefly after termination.
 // Let Node retry ENOTEMPTY/EBUSY rather than fail an otherwise green QA run.
 await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:160});
}
