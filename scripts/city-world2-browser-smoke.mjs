/* Real Chromium acceptance of the LOCAL world2 browser-to-server integration.
 * No wallet, production deployment, or permanent save writes.
 * Uses Chromium DevTools Protocol over Node's built-in WebSocket (no npm dependencies).
 */
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import {once} from 'node:events';
import {createCityServer} from '../server/city-server.mjs';
import {createLocalWorld2Server} from '../server/city-world2-local.mjs';
const browser=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser']
 .map(n=>spawnSync('which',[n],{encoding:'utf8'})).find(x=>x.status===0)?.stdout.trim();
if(!browser)throw Error('Real world2 QA requires Chrome/Chromium. Set CHROME_BIN.');
const profile=await mkdtemp(path.join(tmpdir(),'meme-city-world2-cdp-'));
let chrome=null,site=null,qa=null;
const sockets=[];
const port=8787,apiPort=8788;
async function waitFor(check,desc,timeout=10000){
 const start=Date.now();let last;
 while(Date.now()-start<timeout){
  try{const value=await check();if(value)return value;}catch(e){last=e;}
  await delay(110);
 }
 throw Error('Timed out waiting for '+desc+(last?' ('+last.message+')':''));
}
async function openTab(debugPort,url,{mobile=false}={}){
 const resp=await fetch('http://127.0.0.1:'+debugPort+'/json/new?about:blank',{method:'PUT'});
 if(!resp.ok)throw Error('Cannot create Chromium QA tab: '+resp.status);
 const tab=await resp.json(),ws=new WebSocket(tab.webSocketDebuggerUrl),pending=new Map(),exceptions=[];
 sockets.push(ws);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 let counter=0;
 ws.addEventListener('message',evt=>{
  const msg=JSON.parse(evt.data);
  if(msg.id&&pending.has(msg.id)){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(Error(msg.error.message)):p.resolve(msg.result);}
  if(msg.method==='Runtime.exceptionThrown')exceptions.push(msg.params.exceptionDetails.text||'Uncaught script exception');
 });
 const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++counter;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));
 });
 const evaluate=async expression=>{
  const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(result.exceptionDetails)throw Error('Browser evaluation: '+(result.exceptionDetails.text||'unknown exception'));
  return result.result?.value;
 };
 await send('Page.enable');await send('Runtime.enable');
 if(mobile)await send('Emulation.setDeviceMetricsOverride',{width:412,height:915,deviceScaleFactor:2,mobile:true});
 await send('Page.navigate',{url});
 await waitFor(()=>evaluate("document.getElementById('destination')?.options.length >= 47"),'world2 QA client scripts');
 return {send,evaluate,exceptions};
}
function numberAfter(text,word){
 const m=String(text).match(new RegExp(word+' ([0-9]+),([0-9]+)'));if(!m)throw Error('Missing server position in HUD: '+text);
 return {x:Number(m[1]),y:Number(m[2])};
}
try{
 site=createCityServer({origins:['http://127.0.0.1:8787','http://localhost:8787']}).server;
 await new Promise((resolve,reject)=>{site.once('error',reject);site.listen(port,'127.0.0.1',()=>{site.off('error',reject);resolve();});});
 qa=createLocalWorld2Server();await qa.listen(apiPort);
 chrome=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',
  '--user-data-dir='+profile,'--no-first-run','--no-default-browser-check',
  '--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','about:blank'],{stdio:'ignore'});
 const debuggerPort=await waitFor(async()=>{
  try{const lines=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n');return Number(lines[0])||null;}catch{return null;}
 },'Chrome debugging port',9000);
 const target='http://127.0.0.1:'+port+'/city-world2-online.html';
 const first=await openTab(debuggerPort,target);
 assert.equal(await first.evaluate("document.getElementById('server-state').textContent"),'Disconnected');
 await first.evaluate("document.getElementById('name').value='Alice';document.getElementById('join').click();true");
 await waitFor(()=>first.evaluate("document.getElementById('server-state').textContent === 'Connected to loopback QA server'"),'first browser authenticated join');
 const second=await openTab(debuggerPort,target,{mobile:true});
 await second.evaluate("document.getElementById('name').value='Bob';document.getElementById('join').click();true");
 await waitFor(()=>second.evaluate("document.getElementById('room-info').textContent.includes('2 / 8')"),'second guest shares same room');
 await waitFor(()=>first.evaluate("document.getElementById('peer-summary').textContent.includes('Bob')"),'first guest sees Bob');
 assert.equal(await second.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth+3"),true,
  'emulated phone viewport must have no horizontal overflow');
 await first.send('Page.bringToFront');
 const start=numberAfter(await first.evaluate("document.getElementById('hud').textContent"),'pos');
 await first.evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'d',bubbles:true}));true");
 await delay(1100);
 await first.evaluate("document.dispatchEvent(new KeyboardEvent('keyup',{key:'d',bubbles:true}));true");
 await waitFor(async()=>numberAfter(await first.evaluate("document.getElementById('hud').textContent"),'pos').x>start.x+5,
  'server-driven movement in first browser');
 await second.send('Page.bringToFront'); // Background tabs throttle polling despite active sessions.
 await waitFor(async()=>{
  const text=String(await second.evaluate("document.getElementById('peer-summary').textContent"));
  const match=text.match(/Alice \(([0-9]+),([0-9]+)\)/);
  return !!match&&Number(match[1])>start.x+5;
 },'other browser sees authoritative movement').catch(async error=>{
  console.error('QA peer diagnostics',JSON.stringify({
   start,aliceHud:await first.evaluate("document.getElementById('hud').textContent"),
   bobHud:await second.evaluate("document.getElementById('hud').textContent"),
   bobPeers:await second.evaluate("document.getElementById('peer-summary').textContent"),
   bobStatus:await second.evaluate("document.getElementById('status').textContent")
  }));
  throw error;
 });
 await first.evaluate("document.getElementById('gear').value='jacket';document.getElementById('buy').click();true");
 await waitFor(()=>first.evaluate("document.getElementById('status').textContent.includes('Server refused buyGear')"),
  'server rejects remote shop purchase');
 assert.match(await first.evaluate("document.getElementById('hud').textContent"),/credits 180/);
 // Private fortress construction is authenticated. Remote button presses cannot bypass distance;
 // after a controlled server-side test fixture places Alice near the lot, only Alice's own
 // sandbox balance and private plot can change.
 await first.evaluate("document.getElementById('plot-col').value='4';document.getElementById('plot-row').value='3';document.getElementById('plot-kind').value='banner';document.getElementById('build-plot').click();true");
 await waitFor(()=>first.evaluate("document.getElementById('status').textContent.includes('Server refused buildPlot')"),
  'server rejects remote fortress placement');
 assert.match(await first.evaluate("document.getElementById('hud').textContent"),/credits 180/);
 const builder=[...qa.rooms.first.engine.players.values()].find(p=>p.name==='Alice');
 assert.ok(builder,'Alice owns an authenticated server guest');
 builder.x=4536+4*64+32+90;builder.y=4600+3*64+32;builder.input={x:0,y:0};qa.rooms.first.revision++;
 await first.send('Page.bringToFront');
 await waitFor(()=>first.evaluate("document.getElementById('hud').textContent.includes('pos 4914,4824')"),
  'fortress test fixture reflected by server snapshot');
 await first.evaluate("document.getElementById('build-plot').click();true");
 await waitFor(()=>first.evaluate("document.getElementById('plot-summary').textContent.includes('1 / 160')"),
  'server accepted first private fortress banner');
 assert.match(await first.evaluate("document.getElementById('hud').textContent"),/credits 174/);
 await second.send('Page.bringToFront');
 await waitFor(()=>second.evaluate("document.getElementById('plot-summary').textContent.includes('0 / 160')"),
  'other tab does not receive Alice private fortress structures');
 await first.send('Page.bringToFront');
 await first.evaluate("document.getElementById('remove-plot').click();true");
 await waitFor(()=>first.evaluate("document.getElementById('plot-summary').textContent.includes('0 / 160')"),
  'server removed Alice fortress structure');
 assert.match(await first.evaluate("document.getElementById('hud').textContent"),/credits 177/);
 // Local-only real browser acceptance of private server-authoritative squads and raids.
 await first.evaluate("document.getElementById('defender-role').value='sentry';document.getElementById('hire-defender').click();true");
 await waitFor(()=>first.evaluate("document.getElementById('raid-summary').textContent.includes('Squad: 1 / 4')"),
  'server hires Alice private sentry');
 assert.match(await first.evaluate("document.getElementById('hud').textContent"),/credits 157/);
 await second.send('Page.bringToFront');
 await waitFor(()=>second.evaluate("document.getElementById('raid-summary').textContent.includes('Squad: 0 / 4')"),
  'Bob cannot see Alice private defender');
 await first.send('Page.bringToFront');
 await first.evaluate("document.getElementById('start-raid').click();true");
 await waitFor(()=>first.evaluate("document.getElementById('raid-summary').textContent.includes('Raid: active')"),
  'server starts Alice private fortress raid');
 await second.send('Page.bringToFront');
 assert.match(await second.evaluate("document.getElementById('raid-summary').textContent"),/Raid: idle/,
  'Bob does not join Alice private raid');

 assert.equal(await first.evaluate('localStorage.length'),0,'client cannot store guest credentials');
 const shot=await second.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 assert.ok(shot.data?.length>1000,'real mobile-viewport browser canvas screenshot must render');
 for(const [i,p] of [first,second].entries())assert.deepEqual(p.exceptions,[],
  'No unhandled browser runtime exceptions in QA tab '+(i+1));
 await Promise.all([first.evaluate("document.getElementById('leave').click();true"),second.evaluate("document.getElementById('leave').click();true")]);
 await waitFor(()=>first.evaluate("document.getElementById('server-state').textContent === 'Disconnected'"),'leave first guest');
 console.log('PASS: real Chromium two-tab world2 join, mobile viewport, authoritative position sync, server rejection, and cleanup.');
}finally{
 for(const ws of sockets)try{ws.close();}catch{}
 if(chrome){
  const exiting=chrome.exitCode===null&&chrome.signalCode===null?once(chrome,'exit').catch(()=>{}):Promise.resolve();
  chrome.kill('SIGTERM');await Promise.race([exiting,delay(2500)]);
  if(chrome.exitCode===null&&chrome.signalCode===null)chrome.kill('SIGKILL');
 }
 await delay(200);
 await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:150}).catch(()=>{});
 if(qa)await qa.close().catch(()=>{});
 if(site)await new Promise(resolve=>site.close(()=>resolve()));
}
