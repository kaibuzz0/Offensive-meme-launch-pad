/* Real headless Chromium test for the terrain-only 132-biome entry.
 * Confirms the same city.html boots without legacy NPCs and survives reload.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile,rm,mkdir,writeFile} from 'node:fs/promises';
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
// Optional genuine Chromium captures, never fabricated reference images.
// Set MEME_CITY_QA_ARTIFACT_DIR to retain them for visual inspection.
async function captureFrame(name){
 const directory=process.env.MEME_CITY_QA_ARTIFACT_DIR;
 if(!directory)return null;
 await mkdir(directory,{recursive:true});
 const result=await request('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
 const filename=path.join(directory,name+'.png');
 const png=Buffer.from(result.data,'base64');
 assert.ok(png.length>100 && png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])), 'Chromium screenshot must contain genuine PNG bytes');
 await writeFile(filename,png);
 const metadata=await evalPage('(()=>({url:location.href,seed:localStorage.getItem("meme-city-terrain-seed-v1"),viewport:{width:innerWidth,height:innerHeight,devicePixelRatio:devicePixelRatio},renderer:document.getElementById("city-voxel-status")?.dataset.meshWorker??null,gpuBytes:Number(document.getElementById("city-voxel-status")?.dataset.gpuBytes)||0,savedPosition:localStorage.getItem("meme-city-terrain-position-v1:"+localStorage.getItem("meme-city-terrain-seed-v1"))}))()');
 const artifact={name,path:filename,sha256:createHash('sha256').update(png).digest('hex'),pngBytes:png.length,physicalAndroid:false,...metadata};
 await writeFile(path.join(directory,name+'.json'),JSON.stringify(artifact,null,2)+'\n');
 console.log('MOBILE_CHROMIUM_SCREENSHOT '+JSON.stringify(artifact));
 return filename;
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
  '--no-first-run','about:blank'],{stdio:'ignore'});
 const port=await waitFor(async()=>{
  try{return Number((await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0])||null;}
  catch{return null;}
 },'CDP port');
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
 const navigationStarted=Date.now();
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
 if(view.gl){
  assert.equal(view.hidden,false,'first person is default when WebGL works');
  assert.equal(await evalPage('document.getElementById("city-jump").hidden'),false,'mobile jump must be visible in first person');
  await waitFor(()=>evalPage('document.getElementById("city-voxel-status")?.textContent.startsWith("3D ·")'),'3D chunk rendering',30000);
  await waitFor(()=>evalPage('document.getElementById("city-voxel-status")?.dataset.meshWorker==="ready"'),'Web Worker terrain mesher initializes',30000);
  await waitFor(()=>evalPage('Number(document.getElementById("city-voxel-status")?.dataset.gpuBytes)>0'),'transferred worker geometry draws in WebGL',30000);
  await captureFrame('fortress-spawn-before-interaction');
  const startupMs=Date.now()-navigationStarted;
  const perf=await request('Performance.getMetrics');
  const metricsByName=Object.fromEntries((perf.metrics||[]).map(m=>[m.name,m.value]));
  const frameSample=await evalPage(`new Promise(resolve=>{const frames=[];let previous=0;const until=performance.now()+1200;function sample(now){if(previous)frames.push(now-previous);previous=now;if(now<until)requestAnimationFrame(sample);else resolve({samples:frames.length,meanMs:frames.reduce((a,b)=>a+b,0)/Math.max(1,frames.length),maxMs:Math.max(0,...frames)});}requestAnimationFrame(sample);})`);
  assert.ok(Number.isFinite(frameSample.meanMs)&&frameSample.samples>=2,'browser must produce measurable animation frames');
  // Distribution and >50ms stalls expose jank hidden by an average alone.
  // These are observational baselines, not arbitrary hardware pass thresholds.
  const frameDistribution=await evalPage(`new Promise(resolve=>{const values=[];let previous=0;const end=performance.now()+1200;function tick(now){if(previous)values.push(now-previous);previous=now;if(now<end)requestAnimationFrame(tick);else{values.sort((a,b)=>a-b);const pct=p=>values[Math.min(values.length-1,Math.ceil(values.length*p)-1)];resolve({samples:values.length,p50Ms:pct(.5),p95Ms:pct(.95),p99Ms:pct(.99),over50Ms:values.filter(v=>v>50).length});}}requestAnimationFrame(tick);})`);
  assert.ok(frameDistribution.samples>=2&&Number.isFinite(frameDistribution.p95Ms),'frame-time percentiles must be measurable');
  console.log('MOBILE_CHROMIUM_TELEMETRY '+JSON.stringify({emulatedViewport:'412x915@2',physicalAndroid:false,startupMs,frameSample,frameDistribution,jsHeapBytes:metricsByName.JSHeapUsedSize??null,domNodes:metricsByName.Nodes??null}));
  const workerMetrics=await evalPage('(()=>{const el=document.getElementById("city-voxel-status");return {status:el.dataset.meshWorker,pending:Number(el.dataset.meshPending),gpuBytes:Number(el.dataset.gpuBytes)};})()');
  console.log('MOBILE_CHROMIUM_MESH '+JSON.stringify({gpuBytes:workerMetrics.gpuBytes,meshBudgetBytes:24*1024*1024,pending:workerMetrics.pending,physicalAndroid:false}));
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
   await waitFor(()=>evalPage('!document.getElementById("city-gate-seal").hidden'),'walk under the fortress arch',90000);
  }finally{
   await request('Input.dispatchKeyEvent',{type:'keyUp',key:'w',code:'KeyW',windowsVirtualKeyCode:87});
  }
  await captureFrame('fortress-gate-before-interaction');
  await evalPage('document.getElementById("city-gate-seal").click();true');
  await captureFrame('fortress-gate-after-interaction');
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
 await request('Page.reload',{ignoreCache:true});
 await waitFor(()=>evalPage('document.body.classList.contains("terrain-only-mode")'),'reload terrain mode');
 const stored=await evalPage('(()=>({seed:localStorage.getItem("meme-city-terrain-seed-v1"),saved:JSON.parse(localStorage.getItem("meme-city-terrain-position-v1:"+localStorage.getItem("meme-city-terrain-seed-v1"))),original:localStorage.getItem("offensive-meme-city-v1-center")}))()');
 assert.equal(stored.seed,initial.seed);

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
 await waitFor(()=>evalPage('!document.querySelector("#city-road-canvas").hidden && document.querySelector("#city-voxel-status").dataset.meshWorker==="canvas"'),'first-person rendering with WebGL unavailable',30000);
 assert.equal(await evalPage('document.getElementById("city-compatibility-toggle")?.textContent'),'TRY WEBGL 3D');
 await waitFor(()=>evalPage('document.getElementById("city-render-hint")?.hidden===true'),'compatibility scene becomes visible',30000);
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
 assert.deepEqual(exceptions,[],'no uncaught JS exceptions in terrain-mode browser entry');
 console.log('PASS: mobile Chromium quarter-scale terrain, first-person viewport '+(view.gl?'WebGL':'fallback')+', 132 biomes, fortress road and gate seal, movement and seed restoration');
}catch(error){
 // Preserve a real browser frame and runtime state when acceptance fails.
 // A failed journey is not evidence of a passing visual milestone.
 if(ws?.readyState===WebSocket.OPEN){
  try{
   const state=await evalPage('(()=>({url:location.href,terrain:document.body.classList.contains("terrain-only-mode"),status:document.getElementById("city-voxel-status")?.textContent,meshWorker:document.getElementById("city-voxel-status")?.dataset.meshWorker,gpuBytes:document.getElementById("city-voxel-status")?.dataset.gpuBytes,suppliesVisible:document.getElementById("city-road-supplies")?.hidden===false,gateVisible:document.getElementById("city-gate-seal")?.hidden===false}))()');
   console.error('MOBILE_CHROMIUM_FAILURE_STATE '+JSON.stringify({...state,physicalAndroid:false}));
  }catch(diagnosticError){console.error('MOBILE_CHROMIUM_DIAGNOSTIC_ERROR '+diagnosticError.message);}
  try{await captureFrame('failure-diagnostic');}catch(captureError){console.error('MOBILE_CHROMIUM_SCREENSHOT_ERROR '+captureError.message);}
 }
 throw error;
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
