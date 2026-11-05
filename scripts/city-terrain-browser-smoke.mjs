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
  '--disable-gpu','--remote-debugging-port=0','--user-data-dir='+profile,
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
 await request('Page.enable');await request('Runtime.enable');
 await request('Emulation.setDeviceMetricsOverride',{width:412,height:915,deviceScaleFactor:2,mobile:true});
 const url='http://127.0.0.1:'+server.address().port+'/city.html?terrain=1';
 await request('Page.navigate',{url});
 await waitFor(()=>evalPage('!!window.CityTerrainWorld?.createTerrain && document.body.classList.contains("terrain-only-mode")'),'terrain script boot');
 const initial=await evalPage('(()=>{const seed=localStorage.getItem("meme-city-terrain-seed-v1");const w=CityTerrainWorld.createTerrain(seed,CityFrontier.regions);const c=w.chunkAt(0,0);return {seed,count:w.anchors.length,types:new Set(w.anchors.map(a=>w.biomeAt(Math.round(a.x),Math.round(a.y)).id)).size,sites:c.sites.length,structures:c.structures.length,roads:c.tiles.filter(t=>t.road).length,legacy:localStorage.getItem("offensive-meme-city-v1-center")};})()');
 assert.equal(initial.count,132);assert.equal(initial.types,132);
 assert.equal(initial.sites,0);assert.equal(initial.structures,0);assert.equal(initial.roads,0);
 assert.equal(initial.legacy,null,'new terrain preview does not overwrite the original solo save');
 await evalPage('document.getElementById("start-button").click();true');
 await waitFor(()=>evalPage('document.getElementById("city-intro").hidden===true'),'enter terrain');
 await waitFor(()=>evalPage('(()=>{const c=document.getElementById("city-canvas");return c.width>100&&c.height>100&&!!localStorage.getItem("meme-city-terrain-position-v1:"+localStorage.getItem("meme-city-terrain-seed-v1"));})()'),'paint and save world');
 const start=await evalPage('JSON.parse(localStorage.getItem("meme-city-terrain-position-v1:"+localStorage.getItem("meme-city-terrain-seed-v1"))).x');
 await request('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
 await delay(900);
 await request('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
 await waitFor(()=>evalPage('JSON.parse(localStorage.getItem("meme-city-terrain-position-v1:"+localStorage.getItem("meme-city-terrain-seed-v1"))).x>'+start),'movement persists to local save');
 await request('Page.reload',{ignoreCache:true});
 await waitFor(()=>evalPage('document.body.classList.contains("terrain-only-mode")'),'reload terrain mode');
 const stored=await evalPage('(()=>({seed:localStorage.getItem("meme-city-terrain-seed-v1"),saved:JSON.parse(localStorage.getItem("meme-city-terrain-position-v1:"+localStorage.getItem("meme-city-terrain-seed-v1"))),original:localStorage.getItem("offensive-meme-city-v1-center")}))()');
 assert.equal(stored.seed,initial.seed);
 assert.ok(stored.saved.x>start);
 assert.equal(stored.original,null);
 assert.deepEqual(exceptions,[],'no uncaught JS exceptions in terrain-mode browser entry');
 console.log('PASS: mobile Chromium terrain world paints, exposes all 132 biome anchors, has no streets/NPCs, moves and restores same seed');
}finally{
 for(const x of pending.values())x.reject(Error('Browser closed'));
 if(ws){try{ws.close();}catch{}}
 if(browser){browser.kill('SIGKILL');}
 await new Promise(resolve=>server.close(resolve));
 await rm(profile,{recursive:true,force:true});
}
