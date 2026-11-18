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
function scheduleGameCache(request,response){
  // Serialize cache mutations: simultaneous chunk/script downloads must not race eviction.
  const operation=cacheWriteQueue.catch(()=>{}).then(()=>putGame(request,response));
  cacheWriteQueue=operation.catch(()=>{});
  return operation.catch(()=>{}); // Storage pressure must never break a successful network load.
}
async function putGame(request,response){
  if(!response||!response.ok||response.type==='opaque')return;
  const sizeHeader=Number(response.headers.get('content-length'));
  if(Number.isFinite(sizeHeader)&&sizeHeader>GAME_MAX_RESPONSE_BYTES)return;
  const body=await response.clone().arrayBuffer();
  if(body.byteLength>GAME_MAX_RESPONSE_BYTES)return;
  const cache=await caches.open(GAME_CACHE);
  await cache.put(request,new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers}));
  const keys=await cache.keys();
  let total=0;
  const sizes=[];
  for(const key of keys){
    const cached=await cache.match(key);
    const bytes=cached?(await cached.arrayBuffer()).byteLength:0;
    sizes.push(bytes);
    total+=bytes;
  }
  for(let i=0;i<keys.length&&(keys.length-i>GAME_MAX_ENTRIES||total>GAME_MAX_BYTES);i++){
    await cache.delete(keys[i]);
    total-=sizes[i];
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
      event.respondWith(fetch(request).then(response=>{if(response.ok)event.waitUntil(scheduleGameCache(request,response));return response;}).catch(async()=>await caches.match(request)||await caches.match(new URL('offline.html',self.registration.scope).href)));
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
