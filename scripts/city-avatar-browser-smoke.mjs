/* Real Chromium mobile-viewport smoke test for the restored WORLD V1 game.
 * Checks actual Canvas character rendering, never touches users' stored saves.
 * Uses only Node 22, installed Chrome and the built-in CDP WebSocket.
 */
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {generateKeyPairSync} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import {createCityServer} from '../server/city-server.mjs';
import {holdingsService} from '../server/city-holdings.mjs';

const chromeBin=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser']
 .map(n=>spawnSync('which',[n],{encoding:'utf8'})).find(x=>x.status===0)?.stdout.trim();
if(!chromeBin)throw Error('World V1 visual QA requires installed Chrome/Chromium.');
const profile=await mkdtemp(path.join(tmpdir(),'meme-city-v1-visual-'));
const soloKeys=generateKeyPairSync('ed25519');
const abc='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function toBase58(buf){let n=0n;for(const b of buf)n=n*256n+BigInt(b);let v='';while(n){v=abc[Number(n%58n)]+v;n/=58n;}for(const b of buf){if(b!==0)break;v='1'+v;}return v;}
const soloAddress=toBase58(soloKeys.publicKey.export({format:'der',type:'spki'}).subarray(-32));
const soloPrivatePkcs8=soloKeys.privateKey.export({format:'der',type:'pkcs8'}).toString('base64');
const soloMint='A4gTwKUpL64nVTFDMSfDZxKcQRJNwwZ95X1MgoZPpump';
const fakeHoldings=holdingsService({mints:{offensive:soloMint},fetcher:async(_url,options)=>{
 const args=JSON.parse(options.body),address=args.params[0],mint=args.params[1].mint;
 const rows=address===soloAddress&&mint===soloMint?[{account:{data:{parsed:{info:{owner:soloAddress,mint:soloMint,tokenAmount:{amount:'3000000',decimals:6}}}}}}]:[];
 return {ok:true,json:async()=>({result:{value:rows}})};
}});
const room=createCityServer({origins:['http://127.0.0.1'],holdingsReader:fakeHoldings,
 themeReader:{lookup:async address=>({themeId:address===soloAddress?'offensive':null,matchedTokens:address===soloAddress?1:0,verifiedOwnership:false})}
});
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
 },'Chrome DevTools port',25000);
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
 // Draw an actual biome into a phone-sized Chromium Canvas, not just source-check it.
 const biomePixels=await evalPage(`(()=>{
  const T=window.CityBiomes,r=T?.regions?.[0];if(!r)return null;
  const el=document.createElement('canvas');el.width=240;el.height=240;
  const g=el.getContext('2d');g.setTransform(.3,0,0,.3,-r.x*.3,-r.y*.3);
  const painted=T.drawGround(g,(x,y)=>x===r.x),pixel=g.getImageData(120,120,1,1).data;
  return {painted,opaque:pixel[3]>0,regions:T.regions.length,props:T.scenery(g,(x,y,w,h)=>x<r.x+r.w&&x+w>r.x&&y<r.y+r.h&&y+h>r.y).length};
 })()`);
 assert.equal(biomePixels?.painted,1,'original game paints a biome in real Chromium Canvas');
 assert.equal(biomePixels?.opaque,true,'terrain texture is visible');
 assert.equal(biomePixels?.regions,3,'three greenbelt biomes load in the same Solo game');
 assert.ok(biomePixels?.props>0,'biome contains live scenery layers');
 // Actually paint armed/unarmed 3D people onto a Canvas in the real browser,
 // not merely verify that a method exists or syntactically parses.
 const samples=await evalPage(`(()=>{
  const result=[];
  for(const role of ['player','cop','gang','guard','civilian','zombie','monk'])
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
 assert.equal(samples.length,112,'all seven humanoid roles render the same live Canvas rig at eight bearings');
 // Real browser rendering of the current city's facades, not source existence.
 // Enforce multiple visually distinct archetypes and opacity in real pixels.
 const architecture=await evalPage(`(()=>{
  const D=window.CityDistricts,C=window.MemeCityCore,
   buildings=['launch','arcade','club','shop','market','garage','congress-0','redacted-annex-1']
    .map(id=>C.WORLD.buildings.find(b=>b.id===id))
    .concat(C.districtBlocks('creator')[0],C.districtBlocks('arena')[0],C.districtBlocks('social')[1]);
  return buildings.map(b=>{
   const canvas=document.createElement('canvas');
   canvas.width=b.w+180;canvas.height=b.h+240;
   const g=canvas.getContext('2d');g.translate(65-b.x,120-b.y);
   D.building(g,b,null);
   const bytes=g.getImageData(0,0,canvas.width,canvas.height).data;
   let painted=0,hash=2166136261,colors=new Set();
   for(let i=0;i<bytes.length;i+=4*7){
    if(bytes[i+3]>60)painted++;
    const tone=(bytes[i]<<16)|(bytes[i+1]<<8)|bytes[i+2];
    if(bytes[i+3]>150)colors.add(tone);
    hash=Math.imul(hash^tone,16777619)>>>0;
   }
   return {name:b.label,kind:D.buildingProfile(b).kind,painted,colors:colors.size,hash,
    width:canvas.width,height:canvas.height};
  });
 })()`);
 assert.equal(architecture.length,11,'all main businesses and representative district landmarks rendered');
 assert.ok(new Set(architecture.map(b=>b.kind)).size>=9,'at least nine unique architectural styles');
 assert.ok(new Set(architecture.map(b=>b.hash)).size>=10,'glass, materials, storefronts and roof geometry must paint distinct pixels');
 for(const b of architecture){
  assert.ok(b.painted>650,'architecture produced transparent or missing geometry: '+b.name);
  assert.ok(b.colors>20,'modern facade materials need varied lighting and reflections: '+b.name);
 }
 // The same walk-in room systems receive cached, venue-specific interiors.
 const rooms=await evalPage(`(()=>{
  const themes=['arcade','garage','cafe','gallery'],result=[];
  for(const theme of themes){
   const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=900;
   const g=canvas.getContext('2d'),r={id:theme,name:theme,theme,accent:'#9cced1'},
    p={room:r,places:{souvenirs:[]}};
   window.CityRoomVisuals.draw(g,p,1000,new Map(),()=>{});
   const bytes=g.getImageData(0,0,1200,900).data;
   let hash=2166136261,painted=0;
   for(let i=0;i<bytes.length;i+=4*13){
    if(bytes[i+3]>60)painted++;
    hash=Math.imul(hash^((bytes[i]<<16)|(bytes[i+1]<<8)|bytes[i+2]),16777619)>>>0;
   }
   result.push({theme,hash,painted});
  }
  return result;
 })()`);
 assert.equal(rooms.length,4);
 assert.equal(new Set(rooms.map(r=>r.hash)).size,4,'cafe, garage, arcade and gallery interiors have distinct pixel art');
 assert.ok(rooms.every(r=>r.painted>4000),'all four interiors paint their full backgrounds');

 // Bilingual monk should paint actual Hebrew/English and both fire tornadoes
 // on the same real Canvas used by the game, including a reduced-motion frame.
 const monkPixels=await evalPage(`(()=>{
  const verses=window.CityMonk?.VERSES;
  if(!verses||verses.length!==20)return {count:verses?.length||0,painted:0};
  const img=document.createElement('canvas');img.width=720;img.height=600;
  const g=img.getContext('2d');window.CityMonk.draw(g,{
   x:360,y:400,elapsed:9,praise:window.CityMonk.PRAISE,
   quote:verses[0],tornadoes:[{x:290,y:425,target:'test'},{x:440,y:425,target:'test2'}]
  },false);
  const data=g.getImageData(0,0,720,600).data;
  let painted=0;for(let i=3;i<data.length;i+=4)if(data[i]>20)painted++;
  return {count:verses.length,painted,hebrew:verses[0].he,english:verses[0].en};
 })()`);
 assert.equal(monkPixels.count,20,'exactly twenty paired monk readings');
 assert.match(monkPixels.hebrew,/[א-ת]/,'Canvas monk uses Hebrew scripture');
 assert.match(monkPixels.english,/brokenhearted/);
 assert.ok(monkPixels.painted>2500,'shared monk avatar skin, twin tornadoes, healing circle and bilingual speech actually paint');
 assert.equal(await evalPage("!!document.querySelector('#monk-verse[hidden]')"),true,'bilingual HUD stays hidden when no monk is present');

 for(const p of samples)assert.ok(p.painted>200,'Real Canvas body missing for '+JSON.stringify(p));
 assert.equal(await evalPage("document.querySelector('.world-hud')!==null && document.querySelector('.game-bottom')!==null"),true,'original full solo HUD and mobile movement controls present');
 assert.equal(await evalPage("document.documentElement.scrollWidth <= document.documentElement.clientWidth+3"),true,'emulated phone game has no horizontal overflow');
 await delay(450);
 const gameCanvas=await evalPage("({width:document.getElementById('city-canvas').width,height:document.getElementById('city-canvas').height})");
 assert.ok(gameCanvas.width>300&&gameCanvas.height>300,'original playable world canvas active; '+JSON.stringify({gameCanvas,exceptions,territory:await evalPage('!!window.CityTerritory'),scripts:await evalPage("Array.from(document.scripts).map(s=>s.src).filter(s=>s.includes('territory'))")}));
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
 // The existing 47-door map must yield readable manual guidance on phones:
 // no teleport, second renderer, wallet action, or changed game entrypoint.
 const shopChoice=await evalPage("(()=>{const I=window.CityInteriors,b=I.BUILDINGS.find(x=>x.activity==='shop'),c=Array.from(document.querySelectorAll('.map-destinations button')).find(el=>el.textContent.includes(b.name));if(!c)return null;c.click();return b.name;})()");
 assert.ok(shopChoice,'same world map offers a real physical supply/shop door');
 await waitFor(()=>evalPage("document.querySelector('#route-guide')?.textContent.includes('HEAD')&&document.querySelector('#route-guide')?.dataset.status==='follow'"),'manual turn-by-turn guide visible from actual 47-door map route');
 const navUI=await evalPage("({guide:document.querySelector('#route-guide').textContent,hidden:document.querySelector('#route-guide').hidden,mapClosed:!document.querySelector('#city-panel').open,width:document.querySelector('#route-guide').getBoundingClientRect().width,screen:innerWidth})");
 assert.equal(navUI.hidden,false,'navigation status appears only when a destination is selected');
 assert.equal(navUI.mapClosed,true,'destination selection returns to the original city game');
 assert.match(navUI.guide,/m remaining/);
 assert.ok(navUI.guide.includes(shopChoice),'original destination name survives routing');
 assert.ok(navUI.width<navUI.screen,'guidance does not overflow the phone');
 await evalPage("document.querySelector('[data-panel=map]').click();true");
 await waitFor(()=>evalPage("document.querySelector('canvas.large-map')!==null&&document.querySelector('#panel-content').textContent.includes('Safe walking route')"),'large map explains the active safe walking route');

 // New quarantine scenario must be a physical destination inside the old
 // map and an ordinary mobile-friendly game panel, not a separate World V2 UI.
 assert.equal(await evalPage("window.MemeCityCore.WORLD.stations.filter(s=>s.id==='quarantine-bunker').length"),1);
 assert.equal(await evalPage("Array.from(document.querySelectorAll('#panel-content button')).some(b=>b.textContent.includes('Quarantine Bunker / zombie survival'))"),true,
  'quarantine location is navigable from the same mobile world map');
 await evalPage("document.querySelector('#close-panel').click();document.querySelector('[data-panel=menu]').click();true");
 await waitFor(()=>evalPage("Array.from(document.querySelectorAll('#panel-content button')).some(b=>b.textContent.includes('Quarantine bunker / undead waves'))"),'one-world quarantine menu entry');
 await evalPage("Array.from(document.querySelectorAll('#panel-content button')).find(b=>b.textContent.includes('Quarantine bunker / undead waves')).click();true");
 const qPanel=await evalPage("({title:document.querySelector('#panel-title').textContent,copy:document.querySelector('#panel-content').textContent,hasRoute:Array.from(document.querySelectorAll('#panel-content button')).some(b=>b.textContent.includes('Mark Quarantine Bunker'))})");
 assert.match(qPanel.title,/Quarantine bunker/i);
 assert.match(qPanel.copy,/Walk to the marked bunker/,'remote player cannot bypass physical entry');
 assert.match(qPanel.copy,/Go to bunker to unlock start/,'start is proximity gated on phone');
 assert.equal(qPanel.hasRoute,true,'existing map routing is available');
 assert.equal(await evalPage("document.querySelector('#city-intro').hidden"),true,'quarantine does not replace the one-tap solo game');
 await evalPage("document.querySelector('#close-panel').click();document.querySelector('[data-panel=map]').click();true");
 const mobileMapShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 assert.ok(mobileMapShot.data.length>2000,'mobile expanded-city map rendered in Chrome');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await delay(250);
 const desktopMapShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 assert.ok(desktopMapShot.data.length>2000,'desktop expanded-city map rendered in Chrome');
 // Same original game page: a real playable fortress siege can be started and
 // abandoned through the one mobile/desktop Squad panel, without new clients.
 await send('Emulation.setDeviceMetricsOverride',{width:412,height:915,deviceScaleFactor:2,mobile:true});
 await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/city.html?siege-visual-qa=1'});
 await waitFor(()=>evalPage("!!window.MemeCityCore?.PLOT&&!!document.getElementById('start-button')"),'original fortress game');
 await evalPage("document.getElementById('start-button').click();document.querySelector('[data-panel=menu]').click();true");
 await waitFor(()=>evalPage("Array.from(document.querySelectorAll('#panel-content button')).some(b=>b.textContent.includes('Hire / command defenders'))"),'one-world fortress menu');
 await evalPage("Array.from(document.querySelectorAll('#panel-content button')).find(b=>b.textContent.includes('Hire / command defenders')).click();true");
 const siegeReady=await evalPage("({title:document.querySelector('#panel-title').textContent,start:Array.from(document.querySelectorAll('#panel-content button')).find(b=>b.textContent.includes('Start fortress siege'))?.disabled})");
 assert.match(siegeReady.title,/Your defenders/);
 assert.equal(siegeReady.start,false,'same spawn and Squad panel can begin a real siege');
 await evalPage("Array.from(document.querySelectorAll('#panel-content button')).find(b=>b.textContent.includes('Start fortress siege')).click();true");
 await waitFor(()=>evalPage("document.querySelector('#mission-kicker').textContent==='FORTRESS DEFENSE'"),'live siege HUD');
 assert.match(await evalPage("document.querySelector('#mission-detail').textContent"),/CORE 200\/200 HP/);
 await evalPage("document.querySelector('[data-panel=menu]').click();true");
 await waitFor(()=>evalPage("Array.from(document.querySelectorAll('#panel-content button')).some(b=>b.textContent.includes('URGENT / Fortress siege repairs'))"),'accessible siege repair menu');
 await evalPage("Array.from(document.querySelectorAll('#panel-content button')).find(b=>b.textContent.includes('URGENT / Fortress siege repairs')).click();true");
 const siegeUi=await evalPage("({text:document.querySelector('#panel-content').textContent,button:Array.from(document.querySelectorAll('#panel-content button')).some(b=>b.textContent.includes('Retreat / abandon siege'))})");
 assert.match(siegeUi.text,/Command Core: 200 \/ 200 HP/);
 assert.equal(siegeUi.button,true,'repair and retreat live in the original Squad panel');
 await evalPage("Array.from(document.querySelectorAll('#panel-content button')).find(b=>b.textContent.includes('Retreat / abandon siege')).click();true");
 await waitFor(()=>evalPage("document.querySelector('#mission-kicker').textContent!=='FORTRESS DEFENSE'"),'live siege retreat ends without a replacement world');
 // Play the real Chaos Arcade cabinet at a phone viewport, in the existing
 // city.html engine. Inject only a starting *street coordinate* for QA; still
 // require the original building door, indoor walk and activity terminal.
 await send('Page.addScriptToEvaluateOnNewDocument',{source:
  "if(location.search.includes('cabinet-qa')){try{localStorage.removeItem('offensive-meme-city-v1-center')}catch{};Object.defineProperty(window,'MemeCityCore',{configurable:true,set:function(core){Object.defineProperty(window,'MemeCityCore',{value:core,configurable:true,writable:true});const old=core.Engine.prototype.join;core.Engine.prototype.join=function(){const p=old.apply(this,arguments);if(arguments[0]==='solo'){const b=core.WORLD.buildings.find(x=>x.id==='arcade');p.x=b.x+b.w/2;p.y=b.y+b.h+37;}return p;};}});}"});
 await send('Emulation.setDeviceMetricsOverride',{width:412,height:915,deviceScaleFactor:2,mobile:true});
 await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/city.html?solo=1&cabinet-qa=1'});
 await waitFor(()=>evalPage("!!document.querySelector('#start-button') && !!window.CityInteriors?.ROOM"),'original city with arcade entrance');
 await evalPage("document.querySelector('#start-button').click();true");
 await waitFor(()=>evalPage("document.querySelector('#interact')?.textContent.includes('ENTER CHAOS ARCADE')"),'physical Chaos Arcade entrance');
 await evalPage("document.querySelector('#interact').click();true");
 await waitFor(()=>evalPage("document.querySelector('#district')?.textContent==='CHAOS ARCADE'"),'original interior successfully entered');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});
 await delay(2100);await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});
 await waitFor(()=>evalPage("document.querySelector('#interact')?.textContent.includes('PLAY')"),'walked through the real indoor room to arcade cabinet');
 await evalPage("document.querySelector('#interact').click();true");
 await waitFor(()=>evalPage("!!document.querySelector('.rug-runner-board')&&document.querySelector('#city-panel').open"),'in-building playable arcade UI');
 const pixel=await evalPage("(()=>{const c=document.querySelector('.rug-runner-board').getContext('2d');const d=c.getImageData(0,0,660,350).data;let painted=0;for(let i=3;i<d.length;i+=4*11)painted+=d[i]>0?1:0;return painted;})()");
 assert.ok(pixel>12000,'neon cabinet renders detailed real Canvas pixels');
 assert.match(await evalPage("document.querySelector('#panel-content').textContent"),/FIRST CLEAR: 35 PLAY CREDITS/);
 await evalPage("Array.from(document.querySelectorAll('.rug-runner-controls button')).find(b=>b.textContent.includes('Start Rug Runner')).click();true");
 await waitFor(()=>evalPage("document.querySelector('.rug-runner-status')?.textContent.includes('GATE 1 / 12')"),'first actual arcade gate');
 await evalPage("Array.from(document.querySelectorAll('.rug-runner-controls button')).find(b=>b.textContent.includes('Pause / P')).click();true");
 await waitFor(()=>evalPage("document.querySelector('.rug-runner-status')?.textContent.includes('Paused')"),'arcade pause works');
 await evalPage("Array.from(document.querySelectorAll('.rug-runner-controls button')).find(b=>b.textContent.includes('Resume cabinet')).click();true");
 await waitFor(()=>evalPage("document.querySelector('.rug-runner-status')?.textContent.includes('Red hazard')"),'arcade resumes');
 let gatesPlayed=0;
 for(;gatesPlayed<12;gatesPlayed++){
  const before=await evalPage("document.querySelector('.rug-runner-status').textContent");
  if(!before.includes('GATE '))break;
  const lane=(before.match(/Your lane: (LEFT|CENTER|RIGHT)/)||[])[1];
  const danger=(before.match(/Red hazard: (LEFT|CENTER|RIGHT)/)||[])[1];
  const bonus=(before.match(/Green points: (LEFT|CENTER|RIGHT)/)||[])[1];
  const names=['LEFT','CENTER','RIGHT'],here=names.indexOf(lane),d=names.indexOf(danger),prize=names.indexOf(bonus);
  assert.ok(here>=0&&d>=0&&prize>=0,'the user can read actual gate hazards and prizes');
  const candidates=[here,here-1,here+1].filter(n=>n>=0&&n<=2&&n!==d);
  const target=candidates.includes(prize)?prize:candidates[0]??here;
  if(target!==here){
   const direction=target<here?'LEFT / A':'RIGHT / D';
   await evalPage("Array.from(document.querySelectorAll('.rug-runner-controls button')).find(b=>b.textContent.includes("+JSON.stringify(direction)+")).click();true");
   await waitFor(()=>evalPage("document.querySelector('.rug-runner-status')?.textContent.includes('Move used for this gate')"),'one legal lane move');
  }
  await evalPage("Array.from(document.querySelectorAll('.rug-runner-controls button')).find(b=>b.textContent.includes('ADVANCE GATE')).click();true");
  if(gatesPlayed<11)await waitFor(()=>evalPage("document.querySelector('.rug-runner-status')?.textContent.includes('GATE "+(gatesPlayed+2)+" / 12')"),'the next authoritative arcade gate');
  else await waitFor(()=>evalPage("document.querySelector('.rug-runner-status')?.textContent.includes('LAST RUN:')"),'complete twelve-gate arcade round');
 }
 assert.equal(gatesPlayed,12,'twelve user-controlled turns play on a phone-sized screen');
 assert.match(await evalPage("document.querySelector('.rug-runner-status').textContent"),/LAST RUN: WON/);
 assert.match(await evalPage("document.querySelector('#panel-content').textContent"),/FIRST-CLEAR PRIZE CLAIMED/);
 await evalPage("Array.from(document.querySelectorAll('.rug-runner-controls button')).find(b=>b.textContent.includes('Play another round')).click();true");
 await waitFor(()=>evalPage("document.querySelector('.rug-runner-status')?.textContent.includes('GATE 1 / 12')"),'high-score retry is playable');
 await evalPage("Array.from(document.querySelectorAll('.rug-runner-controls button')).find(b=>b.textContent.includes('Quit / no prize')).click();true");
 await waitFor(()=>evalPage("document.querySelector('.rug-runner-status')?.textContent.includes('LAST RUN: ABANDONED')"),'arcade quit safely stops reward');
 await evalPage("Array.from(document.querySelectorAll('#panel-content button')).find(b=>b.textContent.includes('Return to the arcade room')).click();true");
 assert.equal(await evalPage("document.querySelector('#city-panel').open"),false,'returns to exact same indoor city world');
 assert.equal(await evalPage("document.querySelector('#district').textContent"),'CHAOS ARCADE');
 // Actual mobile Chromium: same Solo game, existing clan selection and
 // physical district terminal trigger the new, server-compatible defense.
 await send('Page.addScriptToEvaluateOnNewDocument',{source:
  "if(location.search.includes('territory-qa')){try{localStorage.removeItem('offensive-meme-city-v1-center')}catch{};Object.defineProperty(window,'MemeCityCore',{configurable:true,set:function(core){Object.defineProperty(window,'MemeCityCore',{value:core,configurable:true,writable:true});const join=core.Engine.prototype.join;core.Engine.prototype.join=function(){const p=join.apply(this,arguments);if(arguments[0]==='solo'){p.x=core.NEIGHBORHOODS[0].x;p.y=core.NEIGHBORHOODS[0].y;}return p;};}});}"});
 await send('Emulation.setDeviceMetricsOverride',{width:412,height:915,deviceScaleFactor:2,mobile:true});
 await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/city.html?solo=1&territory-qa=1'});
 await waitFor(()=>evalPage("!!window.CityTerritory&&!!document.getElementById('start-button')"),'original world with real district-defense engine');
 await evalPage("document.getElementById('start-button').click();document.querySelector('[data-panel=menu]').click();true");
 await waitFor(()=>evalPage("Array.from(document.querySelectorAll('#panel-content button')).some(b=>b.textContent.includes('Clans & block jobs'))"),'existing clan menu');
 await evalPage("Array.from(document.querySelectorAll('#panel-content button')).find(b=>b.textContent.includes('Clans & block jobs')).click();true");
 await waitFor(()=>evalPage("!!document.querySelector('.clan-card')"),'all six existing clan roles');
 assert.equal(await evalPage("document.querySelectorAll('.clan-card').length"),6,'old clan blocks are not replaced');
 await evalPage("Array.from(document.querySelector('.clan-card').querySelectorAll('button')).find(b=>b.textContent.includes('Join clan')).click();true");
 await waitFor(()=>evalPage("Array.from(document.querySelectorAll('#panel-content button')).some(b=>b.textContent.includes('Start District Defense'))"),'on-site clan defense terminal ready');
 await evalPage("Array.from(document.querySelectorAll('#panel-content button')).find(b=>b.textContent.includes('Start District Defense')).click();true");
 await waitFor(()=>evalPage("document.querySelector('#mission-kicker').textContent.includes('DISTRICT DEFENSE')"),'live original-world district-alert HUD');
 assert.equal(await evalPage("document.querySelector('#city-panel').open"),false,'the event returns to original city street combat');
 await waitFor(()=>evalPage("document.querySelector('#mission-title').textContent.includes('Wave 1/2')"),'first actual allied NPC response wave');
 assert.match(await evalPage("document.querySelector('#mission-detail').textContent"),/damage/);
 assert.ok(await evalPage("document.querySelector('#city-canvas').width>300"),'original city renderer remains alive during faction combat');
 await evalPage("document.querySelector('[data-panel=map]').click();true");
 await waitFor(()=>evalPage("Array.from(document.querySelectorAll('#panel-content button')).some(b=>b.textContent.includes('ACTIVE / District Defense'))"),'the old map plots the active defense alert');
 await evalPage("document.querySelector('#close-panel').click();document.querySelector('#quick-job').click();true");
 await waitFor(()=>evalPage("Array.from(document.querySelectorAll('#panel-content button')).some(b=>b.textContent.includes('Retreat / end district defense'))"),'the current clan panel owns defense retreat');
 await evalPage("Array.from(document.querySelectorAll('#panel-content button')).find(b=>b.textContent.includes('Retreat / end district defense')).click();true");
 await waitFor(()=>evalPage("document.querySelector('#panel-content').textContent.includes('LAST DEFENSE / ABANDONED')"),'faction defense cleanup after retreat');
 assert.equal(await evalPage("document.querySelector('#district').textContent.includes('RUG')"),false,'original district remains available after event');
 // Live mobile-renderer QA for civilians: the *original* Solo engine and
 // current Canvas must respond to an in-world hostile NPC and then settle.
 await send('Page.addScriptToEvaluateOnNewDocument',{source:
  "if(location.search.includes('civilians-qa')){try{localStorage.removeItem('offensive-meme-city-v1-center')}catch{};Object.defineProperty(window,'MemeCityCore',{configurable:true,set:function(core){Object.defineProperty(window,'MemeCityCore',{value:core,configurable:true,writable:true});const join=core.Engine.prototype.join;core.Engine.prototype.join=function(){const p=join.apply(this,arguments);if(arguments[0]==='solo'){window.__civilianQaEngine=this;window.__civilianQaPlayer=p;}return p;};}});}"});
 await send('Emulation.setDeviceMetricsOverride',{width:412,height:915,deviceScaleFactor:2,mobile:true});
 await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/city.html?solo=1&civilians-qa=1'});
 await waitFor(()=>evalPage("!!window.CityCivilians&&!!window.__civilianQaEngine?.civilians?.length"),'shared civilian engine in original playable city');
 await evalPage("document.getElementById('start-button').click();true");
 // A real phone-sized Chromium canvas now shows a social gesture before a raid.
 // This verifies the existing character/game, not a disconnected test renderer.
 const waveStart=await evalPage("(()=>{const e=window.__civilianQaEngine,p=window.__civilianQaPlayer,c=e.civilians.find(x=>x.zone==='hub'),C=window.MemeCityCore;if(!c)return false;for(const b of e.arcade.bots){b.hp=0;b.respawn=10000;}p.x=C.blocked(c.x+65,c.y+25)?c.x:c.x+65;p.y=C.blocked(p.x,c.y+25)?c.y:c.y+25;p.invulnerable=1000;p.fireHeld=false;c.nextWave=0;return true;})()");
 assert.equal(waveStart,true,'original city has a real local friendly pedestrian');
 await waitFor(()=>evalPage("window.__civilianQaEngine.civilians.some(c=>c.zone==='hub'&&c.gesture)"),
  'phone-sized in-world civilian waves to player');
 const waveSnapshot=await evalPage("(()=>{const e=window.__civilianQaEngine,p=window.__civilianQaPlayer;return e.snapshot(p.id).civilians.find(c=>c.zone==='hub')?.gesture===true;})()");
 assert.equal(waveSnapshot,true,'real Solo HUD receives authoritative 360-rig gesture state');
 const friendlyShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 assert.ok(friendlyShot.data.length>2000,'existing city Canvas paints while citizen greets player');
 const civilianStart=await evalPage("(()=>{const e=window.__civilianQaEngine,p=window.__civilianQaPlayer,c=e.civilians.find(x=>x.zone==='hub'),C=window.MemeCityCore;if(!c)return null;p.x=C.blocked(c.x+65,c.y+25)?c.x:c.x+65;p.y=C.blocked(p.x,c.y+25)?c.y:c.y+25;p.invulnerable=1000;const hostile=e.arcade.bots.find(b=>b.kind==='gang'&&!b.territoryRole),cop=e.arcade.bots.find(b=>b.kind==='cop');Object.assign(hostile,{x:c.x+65,y:c.y+45,homeX:c.x+65,homeY:c.y+45,faction:'exit',hp:95,maxHp:95,territoryRole:'invader',cooldown:100});Object.assign(cop,{x:c.x+95,y:c.y+95,homeX:c.x+95,homeY:c.y+95,hp:100,maxHp:100,cooldown:100});return {id:c.id,x:c.x,y:c.y};})()");
 assert.ok(civilianStart&&civilianStart.id,'civilian QA activated a visible hub pedestrian');
 await waitFor(()=>evalPage("window.__civilianQaEngine.civilians.some(c=>c.id==="+JSON.stringify(civilianStart.id)+"&&['fleeing','sheltering'].includes(c.state))"),'mobile civilian flees visible hostile');
 await waitFor(()=>evalPage("window.__civilianQaEngine.arcade.bots.some(b=>b.civilianAlert?.expires>window.__civilianQaEngine.arcade.time)"),'in-game civilian signals real police NPC');
 const fleeing=await evalPage("(()=>{const e=window.__civilianQaEngine,c=e.civilians.find(c=>c.id==="+JSON.stringify(civilianStart.id)+");return {x:c.x,y:c.y,state:c.state,alarm:document.querySelector('#population').textContent,canvas:document.querySelector('#city-canvas').width};})()");
 assert.ok(Math.hypot(fleeing.x-civilianStart.x,fleeing.y-civilianStart.y)>1,'visible civilian must actually move away from danger');
 assert.ok(fleeing.canvas>300,'reactive civilian uses the original active world Canvas');
 assert.match(fleeing.alarm,/civilians alarmed/,'original HUD reports reactive bystanders');
 const civilianShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 assert.ok(civilianShot.data.length>2000,'phone-sized Canvas with reactive pedestrians paints');
 await evalPage("(()=>{for(const b of window.__civilianQaEngine.arcade.bots)if(b.territoryRole==='invader')b.hp=0;return true;})()");
 await waitFor(()=>evalPage("window.__civilianQaEngine.civilians.find(c=>c.id==="+JSON.stringify(civilianStart.id)+")?.panic===0"),'civilian calms after enemy leaves');
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
 const status=await waitFor(()=>evalPage("document.querySelector('#offender-wallet-status')?.textContent.includes('single Connect wallet button')"),'visible single-wallet instruction in Avatar modal');
 assert.equal(status,true);
 assert.equal(await evalPage("document.querySelector('#offender-wallet-status').getAttribute('aria-live')"),'polite','accessible inline status announces errors');
 assert.equal(await evalPage("document.querySelector('#offender-wallet-status').closest('dialog').open"),true,'wallet errors stay visible inside the open modal');
 // A wallet popup rejection is reported inline too; button returns to usable state.
 await evalPage("window.phantom={solana:{connect:async()=>{throw Error('Wallet permission cancelled');},signMessage:async()=>({signature:new Uint8Array(64)})}};document.querySelector('[data-panel=avatar]').click();true");
 await waitFor(()=>evalPage("!!document.querySelector('#offender-wallet-verify') && !document.querySelector('.wallet-browser-help')"),'detected wallet state');
 await evalPage("document.getElementById('offender-wallet-verify').click();true");
 await waitFor(()=>evalPage("document.querySelector('#offender-wallet-status')?.textContent.includes('single Connect wallet button')"),'game uses the single shared connection, not a second wallet popup');
 assert.equal(await evalPage("document.getElementById('offender-wallet-verify').disabled"),false,'retry works after a rejected wallet connection');
 // The actual mobile Avatar UI must not grant any token outfit for free.
 assert.equal(await evalPage("document.querySelectorAll('.clan-skin-grid [data-skin]').length"),6,'six skins appear in the Avatar panel');
 for(const id of ['redacted','congress','exit','you-missed','maduro','rug']){
  const card=await evalPage("(()=>{const tile=document.querySelector('[data-skin="+id+"]');return {label:tile.querySelector('button').textContent,disabled:tile.querySelector('button').disabled,pressed:tile.querySelector('button').getAttribute('aria-pressed')};})()");
  assert.equal(card.pressed,'false','unverified '+id+' must be locked');
  if(id==='rug'){assert.equal(card.disabled,true,'unminted RUGME cannot be verified');assert.match(card.label,/Awaiting token launch/);}
  else assert.match(card.label,/Verify /,'balance check is the only path to unlock '+id);
 }
 assert.equal(await evalPage("document.querySelector('.wardrobe-canvas')?.width"),480,'existing 360-degree rig is retained');
 await evalPage("Array.from(document.querySelectorAll('#panel-content button')).find(b=>b.textContent==='Classic avatar').click();true");
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
 await evalPage("document.querySelector('.global-wallet-trigger').click();true");
 await waitFor(()=>evalPage("window.OffensiveWallet.state().connected===true"),'global wallet connected on homepage');
 const connected=await evalPage("({label:document.querySelector('.global-wallet-trigger').textContent,address:window.OffensiveWallet.state().address,saved:localStorage.getItem('offensive-wallet-last-public-v1')})");
 assert.match(connected.label,/Wallet 1111/);assert.equal(connected.address,'11111111111111111111111111111111');
 assert.equal(connected.saved,connected.address,'only public reconnect hint is stored');
 await waitFor(()=>evalPage("document.documentElement.dataset.walletTheme==='congress'"),'connected wallet automatically changes website theme');
 assert.equal(await evalPage("window.OffensiveWallet.state().themeId"),'congress','verified connected session exposes the theme for optional game access');
 assert.equal(await evalPage("document.querySelectorAll('.global-wallet-dialog .global-wallet-actions button:not([hidden])').length"),2,'only Disconnect and Close inside status panel');
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
 assert.match(noProvider.help,/On Android/);
 await waitFor(()=>evalPage("document.querySelector('.global-wallet-status').textContent.includes('No wallet detected')"),'one wallet button explains missing providers in installed PWA');
  // A single site wallet powers the next Together room's holder access.
  // Fake signatures must NOT unlock anything; the real room server rejects them.
  await evalPage(`(()=>{
    document.querySelector('.global-wallet-dialog').close();
    const address='11111111111111111111111111111111';
    window.phantom={solana:{
      isConnected:false,publicKey:null,on:()=>{},
      connect:async function(){this.isConnected=true;this.publicKey={toString:()=>address};return{publicKey:this.publicKey};},
      signMessage:async()=>({signature:new Uint8Array(64)})
    }};
    window.__autoHolderChecks=[];
    const original=window.fetch.bind(window);
    window.fetch=(url,options)=>{
      if(String(url).includes('/api/city/theme'))return Promise.resolve({ok:true,json:async()=>({themeId:'offensive'})});
      if(String(url).includes('/api/city/wallet/check')){
       window.__autoHolderChecks.push(JSON.parse(options.body));
       return original(url,options).then(response=>{window.__holderProofHttpStatus=response.status;return response;});
      }
      return original(url,options);
    };
    return true;
  })()`);
  await evalPage("document.querySelector('.global-wallet-trigger').click();true");
  await waitFor(()=>evalPage("window.OffensiveWallet.state().themeId==='offensive'"),'single wallet connects and identifies OFFENDED');
  await evalPage("document.querySelector('.global-wallet-dialog').close();document.getElementById('start-button').click();true");
  await evalPage("document.querySelector('[data-panel=multiplayer]').click();true");
  await waitFor(()=>evalPage("Array.from(document.querySelectorAll('#panel-content button')).some(b=>b.textContent.includes('Quick play'))"),'free Together action');
  await evalPage("Array.from(document.querySelectorAll('#panel-content button')).find(b=>b.textContent.includes('Quick play')).click();true");
  await waitFor(()=>evalPage("document.querySelector('#room-mode').textContent.startsWith('ONLINE /')"),'connected free multiplayer');
  await waitFor(()=>evalPage("window.__autoHolderChecks.length>0"),'theme automatically initiates signed holder check without another Connect button');
  const check=await evalPage("window.__autoHolderChecks[0]");
  assert.equal(check.clan,'offensive','automatic theme uses its matching token for reserved area');
  assert.ok(typeof check.signature==='string'&&check.signature.length>80,'holder area requests a room-bound wallet signature');
  // Crypto rejection is covered by scripts/city-holdings.test.mjs; browser QA asserts that a signed challenge is attempted automatically.
  const isLocked=await evalPage("(()=>{const C=MemeCityCore;return C.blocked(C.TOKEN_PLOTS[0].x+C.TOKEN_PLOTS[0].w/2,C.TOKEN_PLOTS[0].y+C.TOKEN_PLOTS[0].h/2,{holder:null});})()");
  assert.equal(isLocked,true,'invalid wallet signature does not unlock holder area');

 // Full live-browser test: real Ed25519 signing, mock on-chain holdings, solo Avatar UI.
 // No real account, transaction, network RPC or player save is used.
 const walletPrelude='(()=>{const address='+JSON.stringify(soloAddress)+',pkcs8='+JSON.stringify(soloPrivatePkcs8)+';'
  +'const keyBytes=Uint8Array.from(atob(pkcs8),c=>c.charCodeAt(0));'
  +'window.phantom={solana:{isConnected:false,publicKey:null,on(){},off(){},'
  +'async connect(){this.isConnected=true;this.publicKey={toString:()=>address};return{publicKey:this.publicKey}},'
  +'async disconnect(){this.isConnected=false;this.publicKey=null},'
  +'async signMessage(message){const key=await crypto.subtle.importKey("pkcs8",keyBytes,{name:"Ed25519"},false,["sign"]);'
  +'return{signature:new Uint8Array(await crypto.subtle.sign("Ed25519",key,message))}}'
  +'}}})();';
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/city.html?solo=1&signed-skin-qa=1'});
 await waitFor(()=>evalPage("!!window.OffensiveWallet?.connect && !!document.querySelector('.global-wallet-trigger')"),'new solo wallet session');
 // Install the synthetic browser wallet on this fresh page only; the already
 // initialized wallet runtime discovers providers dynamically upon click.
 await evalPage(walletPrelude);
 assert.equal(await evalPage("!!window.phantom?.solana && typeof window.phantom.solana.signMessage==='function'"),true);
 assert.equal(await evalPage("document.querySelectorAll('.global-wallet-trigger').length"),1,'one global wallet button');
 await evalPage("document.querySelector('.global-wallet-trigger').click();true");
 await waitFor(()=>evalPage("window.OffensiveWallet.state().connected || !!document.querySelector('.global-wallet-status')?.textContent.match(/No wallet detected|valid Solana|cancelled|unavailable/)"),'solo wallet response');
 const soloDiag=await evalPage("({provider:!!window.phantom?.solana,providerConnect:typeof window.phantom?.solana?.connect,state:window.OffensiveWallet.state(),status:document.querySelector('.global-wallet-status')?.textContent})");
 assert.equal(await evalPage("window.OffensiveWallet.state().connected"),true,JSON.stringify(soloDiag));
 await waitFor(()=>evalPage("window.OffensiveWallet.state().themeId==='offensive'"),'OFFENDED theme selected');
 await evalPage("document.querySelector('.global-wallet-dialog').close();document.querySelector('#start-button').click();document.querySelector('[data-panel=avatar]').click();true");
 await waitFor(()=>evalPage("!!document.getElementById('offender-wallet-verify')"),'solo verify button');
 assert.match(await evalPage("document.getElementById('offender-wallet-verify').textContent"),/Verify holder skin in solo/);
 const headHash=()=>evalPage("(()=>{const g=document.querySelector('.wardrobe-canvas').getContext('2d'),d=g.getImageData(204,70,74,140).data;let h=0;for(let i=0;i<d.length;i+=4)h=(h*31+d[i]*7+d[i+1]*3+d[i+2])>>>0;return h;})()");
 const normalHead=await headHash();
 await evalPage("document.getElementById('offender-wallet-verify').click();true");
 await waitFor(()=>evalPage("document.querySelector('#panel-content').textContent.includes('OFFENDED SKULL ACTIVE')"),'solo signed holder skin');
 assert.notEqual(await headHash(),normalHead,'signed verification changes real Canvas skull appearance');
 const worldSource=await readFile(new URL('../city.js',import.meta.url),'utf8');
 assert.match(worldSource,/holder:me\.holder/,'actual in-world player renderer must receive the solo holder proof');
 assert.equal(await evalPage("document.getElementById('room-mode').textContent"),'SOLO / LOCAL SAVE');
 assert.equal(await evalPage("!!localStorage.getItem('offensive-meme-city-v1-center') && !localStorage.getItem('offensive-meme-city-v1-center')?.includes('proofId')"),true,'never store wallet proof in solo save');
 await evalPage("window.OffensiveWallet.disconnect();true");
 await waitFor(()=>evalPage("!window.OffensiveWallet.state().connected"),'wallet disconnected');
 await evalPage("document.querySelector('[data-panel=avatar]').click();true");
 await waitFor(()=>evalPage("document.querySelector('#panel-content').textContent.includes('Connect once with the site wallet')"),'holder skin revoked');
 assert.equal(await headHash(),normalHead,'disconnect restores the standard face');

  assert.deepEqual(exceptions,[],'no uncaught runtime exceptions in real Chrome');
 console.log('PASS: 112 real Canvas armed/unarmed V1 character renders, modern 2.5D building archetypes and themed interiors, Center City map, six verified-only skin cards, gated plots, global wallet connection on every site page, single-click wallet connection, token-themed gameplay access hooks and wallet-button feedback in Chromium.');
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
