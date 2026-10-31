/* Real Chromium mobile-viewport smoke test for the restored WORLD V1 game.
 * Checks actual Canvas character rendering, never touches users' stored saves.
 * Uses only Node 22, installed Chrome and the built-in CDP WebSocket.
 */
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import {createCityServer} from '../server/city-server.mjs';

const chromeBin=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser']
 .map(n=>spawnSync('which',[n],{encoding:'utf8'})).find(x=>x.status===0)?.stdout.trim();
if(!chromeBin)throw Error('World V1 visual QA requires installed Chrome/Chromium.');
const profile=await mkdtemp(path.join(tmpdir(),'meme-city-v1-visual-'));
const room=createCityServer({origins:['http://127.0.0.1']});
let chrome,ws,server=room.server;
const exceptions=[],pending=new Map();
let serial=0;
const send=(method,params={})=>new Promise((resolve,reject)=>{
 const id=++serial;pending.set(id,{resolve,reject});
 ws.send(JSON.stringify({id,method,params}));
});
async function waitFor(fn,label,timeout=12000){
 const t=Date.now();let last;
 while(Date.now()-t<timeout){
  try{const result=await fn();if(result)return result;}catch(e){last=e;}
  await delay(110);
 }
 throw Error('Timed out waiting for '+label+(last?': '+last.message:''));
}
async function evalPage(expression){
 const o=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
 if(o.exceptionDetails)throw Error('Browser exception: '+(o.exceptionDetails.exception?.description||o.exceptionDetails.text));
 return o.result?.value;
}
try{
 await new Promise((resolve,reject)=>{
  server.once('error',reject);server.listen(0,'127.0.0.1',()=>{server.off('error',reject);resolve();});
 });
 chrome=spawn(chromeBin,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','about:blank'],{stdio:'ignore'});
 const port=await waitFor(async()=>{
  try{return Number((await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0])||null;}
  catch{return null;}
 },'Chrome DevTools port');
 const tabResponse=await fetch('http://127.0.0.1:'+port+'/json/new?about:blank',{method:'PUT'});
 assert.equal(tabResponse.status,200);
 const tab=await tabResponse.json();
 ws=new WebSocket(tab.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{
  ws.addEventListener('open',resolve,{once:true});
  ws.addEventListener('error',reject,{once:true});
 });
 ws.addEventListener('message',event=>{
  const msg=JSON.parse(event.data);
  if(msg.id&&pending.has(msg.id)){
   const p=pending.get(msg.id);pending.delete(msg.id);
   msg.error?p.reject(Error(msg.error.message)):p.resolve(msg.result);
  }
  if(msg.method==='Runtime.exceptionThrown')exceptions.push(msg.params.exceptionDetails.text||'Uncaught exception');
 });
 await send('Page.enable');await send('Runtime.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:412,height:915,deviceScaleFactor:2,mobile:true});
 await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/city.html?solo=1'});
 await waitFor(()=>evalPage("!!window.CityVisuals?.person && !!document.getElementById('start-button')"),'original World V1 character game');
 assert.equal(await evalPage("document.getElementById('city-intro').hidden"),false,'one-tap original game splash');
 await evalPage("document.getElementById('start-button').click();true");
 await waitFor(()=>evalPage("document.getElementById('city-intro').hidden===true"),'original solo game entrance');
 // Actually paint armed/unarmed 3D people onto a Canvas in the real browser,
 // not merely verify that a method exists or syntactically parses.
 const samples=await evalPage(`(()=>{
  const result=[];
  for(const role of ['player','cop','gang','guard','civilian'])
   for(const armed of [true,false])
    for(let deg=0;deg<360;deg+=45){
     const image=document.createElement('canvas');image.width=190;image.height=200;
     const g=image.getContext('2d');g.translate(95,173);
     const angle=deg*Math.PI/180;
     window.CityVisuals.person(g,{x:0,y:0,role,armed,aim:{x:Math.cos(angle),y:Math.sin(angle)},
      style:{skin:2,hair:1,pants:1,print:1},scale:1,phase:2,moving:true},1100);
     const data=g.getImageData(0,0,190,200).data;
     let painted=0;
     for(let i=3;i<data.length;i+=4)if(data[i]>20)painted++;
     result.push({role,armed,deg,painted});
    }
  return result;
 })()`);
 assert.equal(samples.length,80);
 for(const p of samples)assert.ok(p.painted>200,'Real Canvas body missing for '+JSON.stringify(p));
 assert.equal(await evalPage("document.querySelector('.world-hud')!==null && document.querySelector('.game-bottom')!==null"),true,'original full solo HUD and mobile movement controls present');
 assert.equal(await evalPage("document.documentElement.scrollWidth <= document.documentElement.clientWidth+3"),true,'emulated phone game has no horizontal overflow');
 await delay(450);
 const gameCanvas=await evalPage("({width:document.getElementById('city-canvas').width,height:document.getElementById('city-canvas').height})");
 assert.ok(gameCanvas.width>300&&gameCanvas.height>300,'original playable world canvas active');
 const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 assert.ok(shot.data.length>2000,'real mobile-viewport screenshot captured');
 assert.deepEqual(exceptions,[],'no uncaught runtime exceptions in real Chrome');
 console.log('PASS: 80 real Canvas armed/unarmed V1 character renders, 360 yaw and mobile solo gameplay screenshot.');
}finally{
 try{ws?.close();}catch{}
 try{chrome?.kill('SIGTERM');}catch{}
 try{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}catch{}
 await rm(profile,{recursive:true,force:true});
}
