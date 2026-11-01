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
 // Center City must also render the playable map with a home plot, independent
 // clan regions, scattered shops and accessible mobile/desktop map controls.
 assert.equal(await evalPage("document.querySelector('[data-panel=map]')!==null"),true,'world map control exists');
 await evalPage("document.querySelector('[data-panel=map]').click();true");
 await waitFor(()=>evalPage("document.querySelector('canvas.large-map')!==null"),'interactive expanded city map');
 const mapData=await evalPage(`(()=>{
  const C=window.MemeCityCore,fort=C.DISTRICTS.find(d=>d.id==='fortress');
  const map=document.querySelector('canvas.large-map'),g=map.getContext('2d'),center=g.getImageData(map.width/2,map.height/2,1,1).data;
  return {width:C.WORLD.width,height:C.WORLD.height,fort:[fort.ox,fort.oy],
   plot:[C.PLOT.x,C.PLOT.y],clans:C.NEIGHBORHOODS.length,
   shopRegions:new Set(['launch','arcade','club','shop','market','garage'].map(id=>{
    const b=C.WORLD.buildings.find(b=>b.id===id);return C.areaAt(b.x+b.w/2,b.y+b.h/2);
   })).size,painted:Array.from(center).some(x=>x>0),mapWidth:map.width,mapHeight:map.height};
 })()`);
 assert.equal(mapData.width,11200);assert.equal(mapData.height,11200);
 assert.deepEqual(mapData.fort,[4480,4480]);assert.equal(mapData.clans,6);
 assert.ok(mapData.plot[0]>mapData.fort[0]&&mapData.plot[0]<mapData.fort[0]+2240);
 assert.ok(mapData.shopRegions>=4);assert.ok(mapData.painted);
 assert.ok(mapData.mapWidth>=800&&mapData.mapHeight>=800);
 const mobileMapShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 assert.ok(mobileMapShot.data.length>2000,'mobile expanded-city map rendered in Chrome');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await delay(250);
 const desktopMapShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 assert.ok(desktopMapShot.data.length>2000,'desktop expanded-city map rendered in Chrome');
 // Regression: the Avatar wallet button must report missing providers INSIDE its modal.
 // Previously the only error notification was behind the modal and appeared inert on phones.
 await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/city.html?release=wallet-feedback-qa'});
 await waitFor(()=>evalPage("!!window.CityRoomClient && !!document.querySelector('[data-panel=multiplayer]')"),'online game scripts');
 await evalPage("document.getElementById('start-button').click();true");
 await evalPage("document.querySelector('[data-panel=multiplayer]').click();true");
 await waitFor(()=>evalPage("document.querySelector('#panel-content .panel-button')!==null"),'room join action');
 await evalPage("Array.from(document.querySelectorAll('#panel-content button')).find(b=>b.textContent.includes('Quick play')).click();true");
 await waitFor(()=>evalPage("document.querySelector('#room-mode').textContent.startsWith('ONLINE /') && !document.querySelector('#city-panel').open"),'online room connected');
 await evalPage("document.querySelector('[data-panel=avatar]').click();true");
 await waitFor(()=>evalPage("!!document.querySelector('#offender-wallet-verify')"),'OFFENDED holder wallet button');
 const initial=await evalPage("({open:document.querySelector('#city-panel').open,missing:document.querySelector('.wallet-browser-help')?.textContent,solflare:document.querySelector('.wallet-open-options a')?.href})");
 assert.equal(initial.open,true);assert.match(initial.missing,/No wallet detected/);
 const target=new URL(initial.solflare);
 assert.equal(target.hostname,'solflare.com');assert.ok(target.pathname.startsWith('/ul/v1/browse/'),'official mobile wallet browse link');
 assert.equal(decodeURIComponent(target.pathname.slice('/ul/v1/browse/'.length)), 'http://127.0.0.1:'+server.address().port+'/city.html?release=offender-skin');
 await evalPage("document.getElementById('offender-wallet-verify').click();true");
 const status=await waitFor(()=>evalPage("document.querySelector('#offender-wallet-status')?.textContent.includes('No compatible Solana wallet found')"),'visible missing-wallet message in Avatar modal');
 assert.equal(status,true);
 assert.equal(await evalPage("document.querySelector('#offender-wallet-status').getAttribute('aria-live')"),'polite','accessible inline status announces errors');
 assert.equal(await evalPage("document.querySelector('#offender-wallet-status').closest('dialog').open"),true,'wallet errors stay visible inside the open modal');
 // A wallet popup rejection is reported inline too; button returns to usable state.
 await evalPage("window.phantom={solana:{connect:async()=>{throw Error('Wallet permission cancelled');},signMessage:async()=>({signature:new Uint8Array(64)})}};document.querySelector('[data-panel=avatar]').click();true");
 await waitFor(()=>evalPage("!!document.querySelector('#offender-wallet-verify') && !document.querySelector('.wallet-browser-help')"),'detected wallet state');
 await evalPage("document.getElementById('offender-wallet-verify').click();true");
 await waitFor(()=>evalPage("document.querySelector('#offender-wallet-status')?.textContent.includes('Wallet permission cancelled')"),'wallet rejection shown inline');
 assert.equal(await evalPage("document.getElementById('offender-wallet-verify').disabled"),false,'retry works after a rejected wallet connection');
 // Six skin cards are clickable inside the actual mobile Avatar UI.
 assert.equal(await evalPage("document.querySelectorAll('.clan-skin-grid [data-skin]').length"),6,'six skins appear in the Avatar panel');
 for(const id of ['redacted','congress','exit','you-missed','maduro','rug']){
  await evalPage("document.querySelector('[data-skin="+id+"] button').click();true");
  await waitFor(()=>evalPage("document.querySelector('[data-skin="+id+"] button')?.getAttribute('aria-pressed')==='true'"),'equipped '+id+' clan skin');
  assert.equal(await evalPage("document.querySelector('.wardrobe-canvas')?.width"),480,'existing 360-degree rig is retained');
 }
 await evalPage("Array.from(document.querySelectorAll('#panel-content button')).find(b=>b.textContent.includes('Return to classic avatar')).click();true");
 await waitFor(()=>evalPage("Array.from(document.querySelectorAll('.clan-skin-tile button')).every(b=>b.getAttribute('aria-pressed')==='false')"),'classic outfit restored');
 // Connecting the main wallet MUST set the site theme, no separate theme UI.
 assert.equal(await evalPage("document.querySelectorAll('[data-install-app]').length>0"),true,'game remains installable');
 assert.equal(await evalPage("document.querySelector('.wallet-theme-trigger')===null"),true,'no redundant Wallet theme button in game');
 assert.equal(await evalPage("window.MemeCityCore.TOKEN_PLOTS.length"),6,'holder reserves preserved');
 await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
 await waitFor(()=>evalPage("!!document.querySelector('.global-wallet-trigger') && !!window.OffensiveWallet"),'global wallet on homepage');
 assert.equal(await evalPage("document.querySelector('.wallet-theme-trigger')===null"),true,'home does not require a second wallet theme button');
 // Global wallet connection works BEFORE launching the game and across page changes.
 assert.equal(await evalPage("!!document.querySelector('.global-wallet-trigger')"),true,'home has wallet connect');
 await evalPage(`(()=>{
  const publicKey='11111111111111111111111111111111';
  const listeners={};
  const p={isConnected:false,publicKey:null,on:(name,listener)=>{listeners[name]=listener;},connect:async function(){this.isConnected=true;this.publicKey={toString:()=>publicKey};return {publicKey:this.publicKey};},disconnect:async function(){this.isConnected=false;this.publicKey=null;listeners.disconnect?.();}};
  window.__walletQa={listeners};
  window.phantom={solana:p};
  const real=window.fetch.bind(window);
  window.fetch=(url,opts)=>String(url).includes('/api/city/theme')
   ?new Promise(resolve=>setTimeout(()=>resolve({ok:true,json:async()=>({
     themeId:new URL(url,location.href).searchParams.get('address')===publicKey?'congress':'offensive'
    })}),110)):real(url,opts);
  return true;
 })()`);
 await evalPage("document.querySelector('.global-wallet-trigger').click();document.querySelector('.global-wallet-actions button').click();true");
 await waitFor(()=>evalPage("window.OffensiveWallet.state().connected===true"),'global wallet connected on homepage');
 const connected=await evalPage("({label:document.querySelector('.global-wallet-trigger').textContent,address:window.OffensiveWallet.state().address,saved:localStorage.getItem('offensive-wallet-last-public-v1')})");
 assert.match(connected.label,/Wallet 1111/);assert.equal(connected.address,'11111111111111111111111111111111');
 assert.equal(connected.saved,connected.address,'only public reconnect hint is stored');
 await waitFor(()=>evalPage("document.documentElement.dataset.walletTheme==='congress'"),'connected wallet automatically changes website theme');
 assert.equal(await evalPage("document.documentElement.style.getPropertyValue('--theme-accent')"),'#f2c94c','theme uses largest holding’s clan color');
 assert.match(await evalPage("document.querySelector('.global-wallet-theme-status').textContent"),/Theme active: Insider/,'user sees which token controls the theme');
 assert.equal(await evalPage("getComputedStyle(document.body).backgroundColor"),'rgb(33, 26, 16)','real page background changes, not just metadata');
 assert.equal(await evalPage("document.querySelectorAll('.global-wallet-trigger').length"),1,'only one wallet connection button');
 assert.equal(await evalPage("document.querySelector('.wallet-theme-trigger')===null"),true,'no second theme button needed after connecting');
 // An account change must immediately clear any stale theme even if the RPC later fails.
 await evalPage("window.__walletQa.listeners.accountChanged?.({toString:()=> '11111111111111111111111111111112'});true");
 await waitFor(()=>evalPage("window.OffensiveWallet.state().address==='11111111111111111111111111111112'"),'account switch updates connected wallet');
 await waitFor(()=>evalPage("document.documentElement.dataset.walletTheme==='offensive'"),'new account applies the OFFENDED palette');
 assert.equal(await evalPage("document.documentElement.style.getPropertyValue('--theme-backdrop')"),'#171122','OFFENDED has a visually different background');
 // Reconnect the original address to restore the tested high-balance theme.
 await evalPage("window.__walletQa.listeners.accountChanged?.({toString:()=> '11111111111111111111111111111111'});true");
 await waitFor(()=>evalPage("document.documentElement.dataset.walletTheme==='congress'"),'original wallet re-applies theme');

 for(const page of ['/beta.html','/creators.html','/city-roadmap.html','/tokens/offensive/','/tokens/redacted/','/tokens/you-missed/','/city.html']){
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+page});
  await waitFor(()=>evalPage("!!document.querySelector('.global-wallet-trigger')&&!!window.OffensiveWallet"),'wallet button on '+page);
  const state=await evalPage("({label:document.querySelector('.global-wallet-trigger').textContent,connected:window.OffensiveWallet.state().connected,remembered:window.OffensiveWallet.state().remembered,theme:document.documentElement.dataset.walletTheme})");
  assert.equal(state.connected,false,'address hint is not a connected wallet on '+page);
  assert.match(state.label,/Reconnect wallet/,'wallet reconnect shown on '+page);
  assert.equal(state.remembered,'11111111111111111111111111111111');
  assert.equal(state.theme,'congress','theme follows between website and app pages');
 }
 await evalPage("document.querySelector('.global-wallet-trigger').click();true");
 await waitFor(()=>evalPage("document.querySelector('.global-wallet-dialog').open"),'wallet dialog on game page');
 const noProvider=await evalPage("({phantom:document.querySelector('.global-wallet-links a')?.href,help:document.querySelector('.global-wallet-help')?.textContent})");
 assert.ok(new URL(noProvider.phantom).hostname.includes('phantom'),'wallet-app handoff present');
 assert.match(noProvider.help,/Installed apps/);
 await evalPage("document.querySelector('.global-wallet-actions button').click();true");
 await waitFor(()=>evalPage("document.querySelector('.global-wallet-status').textContent.includes('No Solana wallet detected')"),'visible missing-provider feedback in global wallet dialog');
  assert.deepEqual(exceptions,[],'no uncaught runtime exceptions in real Chrome');
 console.log('PASS: 80 real Canvas armed/unarmed V1 character renders, Center City map, six clan skins, gated plots, global wallet connection on every site page, automatic token theme on connect and account change, and wallet-button feedback in Chromium.');
}finally{
 try{ws?.close();}catch{}
 if(chrome){
  try{chrome.kill('SIGTERM');}catch{}
  if(chrome.exitCode===null&&chrome.signalCode===null){
   await Promise.race([new Promise(resolve=>chrome.once('exit',resolve)),delay(3000)]);
  }
  if(chrome.exitCode===null&&chrome.signalCode===null){
   try{chrome.kill('SIGKILL');}catch{}
   await Promise.race([new Promise(resolve=>chrome.once('exit',resolve)),delay(1500)]);
  }
 }
 try{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}catch{}
 await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:150});
}
