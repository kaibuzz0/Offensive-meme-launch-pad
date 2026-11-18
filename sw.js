'use strict';
const CACHE='offensive-shell-v2';
const OWN_PREFIX='offensive-shell-';
const SHELL=['offline.html','assets/icons/app-192.png','assets/icons/app-512.png','assets/icons/apple-touch-180.png'];
const urls=SHELL.map(path=>new URL(path,self.registration.scope).href);
const GAME_CACHE='offensive-game-v1';
const GAME_MAX_ENTRIES=80;
const GAME_MAX_BYTES=12*1024*1024;
const GAME_MAX_RESPONSE_BYTES=4*1024*1024;
const scopeUrl=new URL(self.registration.scope);
const gamePath=/^(?:city\.html|city(?:-[a-z0-9-]+)?\.(?:js|css)|assets\/icon\.svg)$/;
function localGameAsset(url){
  if(url.origin!==scopeUrl.origin||!url.pathname.startsWith(scopeUrl.pathname))return false;
  return gamePath.test(url.pathname.slice(scopeUrl.pathname.length));
}
let cacheWriteQueue=Promise.resolve();
let gameSizes=null;
let gameTotal=0;
async function initializeGameAccounting(cache){
  if(gameSizes)return;
  const sizes=new Map();
  let total=0;
  // A worker restart performs one bounded reconciliation, not one full scan per download.
  for(const key of await cache.keys()){
    const response=await cache.match(key);
    const bytes=response?(await response.arrayBuffer()).byteLength:0;
    sizes.set(key.url,bytes);
    total+=bytes;
  }
  gameSizes=sizes;
  gameTotal=total;
}
function scheduleGameCache(request,response){
  // Serialize cache mutations and the initial reconciliation.
  const operation=cacheWriteQueue.catch(()=>{}).then(()=>putGame(request,response));
  cacheWriteQueue=operation.catch(()=>{});
  return operation.catch(()=>{}); // Cache failures must not break network gameplay.
}
async function putGame(request,response){
  // Partial responses cannot safely satisfy a later full offline script request.
  if(!response||response.status!==200||response.type==='opaque')return;
  const sizeHeader=Number(response.headers.get('content-length'));
  if(Number.isFinite(sizeHeader)&&sizeHeader>GAME_MAX_RESPONSE_BYTES)return;
  const body=await response.clone().arrayBuffer();
  if(body.byteLength>GAME_MAX_RESPONSE_BYTES)return;
  const cache=await caches.open(GAME_CACHE);
  await initializeGameAccounting(cache);
  const key=new URL(request.url).href;
  await cache.put(request,response.clone());
  gameTotal+=body.byteLength-(gameSizes.get(key)||0);
  gameSizes.delete(key);
  gameSizes.set(key,body.byteLength);
  // Use CacheStorage's actual key order for eviction; replacements retain their
  // existing insertion position in CacheStorage even though the size map updates.
  for(const oldest of await cache.keys()){
    if(gameSizes.size<=GAME_MAX_ENTRIES&&gameTotal<=GAME_MAX_BYTES)break;
    if(await cache.delete(oldest)){
      gameTotal-=gameSizes.get(oldest.url)||0;
      gameSizes.delete(oldest.url);
    }
  }
}
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(urls)));});
// Updates wait for existing app windows to close; do not reload an active wallet flow.
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith(OWN_PREFIX)&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})());});
self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    if(localGameAsset(url)){
      event.respondWith(fetch(request).then(response=>{if(response.status===200)event.waitUntil(scheduleGameCache(request,response));return response;}).catch(async()=>await caches.match(request,{ignoreSearch:true})||await caches.match(new URL('offline.html',self.registration.scope).href)));
    }else{
      event.respondWith(fetch(request).catch(()=>caches.match(new URL('offline.html',self.registration.scope).href)));
    }
    return;
  }
  // Game scripts, styles and worker source are bounded and same-origin; no API,
  // wallet, token, reward, credential or player-save responses enter this cache.
  if(localGameAsset(url)){
    // Network-first keeps scripts and workers aligned with the deployed HTML.
    // A failed network request may reuse the previously loaded offline copy.
    event.respondWith(fetch(request).then(response=>{
      if(!response.ok)throw new Error('Game asset HTTP '+response.status);
      event.waitUntil(scheduleGameCache(request,response));
      return response;
    }).catch(async()=>{
      const cached=await caches.match(request);
      return cached||Response.error();
    }));
    return;
  }
  if(urls.includes(url.href))event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
