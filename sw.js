'use strict';
const CACHE='offensive-shell-v2';
const OWN_PREFIX='offensive-shell-';
const SHELL=['offline.html','assets/icons/app-192.png','assets/icons/app-512.png','assets/icons/apple-touch-180.png'];
const urls=SHELL.map(path=>new URL(path,self.registration.scope).href);
const scope=new URL(self.registration.scope);
const MAX_GAME_ENTRIES=96;
const GAME_FILES=/^(?:city(?:-[a-z0-9-]+)?\.js|city\.css|index\.html|city\.html|styles\.css|launchpad\.css|launchpad\.js|launchpad-config\.js|tokens\.js|share-core\.js|social\.js|pwa\.js)$/;
function eligible(url,request){
  if(request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(scope.pathname))return false;
  if(request.credentials==='include'&&request.mode!=='navigate')return false;
  // Explicitly authenticated requests must never be persisted as public game assets.
  if(request.headers&&request.headers.has('authorization'))return false;
  // Never retain authentication or wallet callback parameters in offline navigation caches.
  const sensitive=/^(?:access_token|id_token|refresh_token|token|code|state|session|session_id|auth|authorization|signature|sig|api_key|key|wallet|address)$/i;
  for(const key of url.searchParams.keys())if(sensitive.test(key))return false;
  const relative=url.pathname.slice(scope.pathname.length);
  // GitHub Pages serves the homepage at the directory URL, not only index.html.
  // Without this case offline homepage Play falls back to offline.html even after warmup.
  return (request.mode==='navigate'&&relative==='')||GAME_FILES.test(relative);
}
// Navigation HTML is seed-independent; avoid one cache entry per world query string.
// The live URL remains untouched so game initialization still reads its seed.
function cacheKey(request){
  if(request.mode!=='navigate')return request;
  const url=new URL(request.url);
  return new Request(url.origin+url.pathname,{method:'GET'});
}
async function remember(request,response){
  if(!response||response.status!==200||response.type==='opaque'||response.headers.has('set-cookie'))return response;
  // Do not persist a login/error redirect or another document under the requested game URL.
  if(response.redirected&&(!response.url||!eligible(new URL(response.url),request)))return response;
  // A 200 HTML fallback served for a missing JS/CSS file can poison the offline
  // cache and produce a blank scene on the next launch. Validate response type.
  const requestedPath=new URL(request.url).pathname;
  const mime=(response.headers.get('content-type')||'').split(';',1)[0].trim().toLowerCase();
  if(/\.js$/.test(requestedPath)&&!['text/javascript','application/javascript','application/x-javascript'].includes(mime))return response;
  if(/\.css$/.test(requestedPath)&&mime!=='text/css')return response;
  if((request.mode==='navigate'||/\.html$/.test(requestedPath))&&mime!=='text/html')return response;
  // Respect origin cache policy even for otherwise public game files.
  if(/(?:^|,)\s*(?:no-store|private)(?:\s|,|$)/i.test(response.headers.get('cache-control')||''))return response;
  // A same-origin request can redirect to a third-party URL. Never persist that response.
  if(response.redirected&&(!response.url||new URL(response.url).origin!==scope.origin))return response;
  // Prevent unexpectedly large files from evicting the whole offline working set.
  const declaredLength=response.headers.get('content-length');
  // Headers are only hints: a missing or dishonest Content-Length must not
  // disable offline Solo or bypass the actual two-megabyte cache-write budget.
  const LIMIT=2*1024*1024;
  if(declaredLength!==null){
    if(!/^(?:0|[1-9][0-9]*)$/.test(declaredLength.trim()))return response;
    const claimed=Number(declaredLength);
    if(!Number.isSafeInteger(claimed)||claimed>LIMIT)return response;
  }
  try{
    // Read a clone, not the response returned to the game. Stop reading as soon
    // as the real byte count exceeds the limit, and never cache partial bytes.
    const clone=response.clone();
    if(!clone.body)return response;
    const reader=clone.body.getReader();
    const chunks=[];
    let total=0;
    let oversized=false;
    try{
      while(true){
        const {done,value}=await reader.read();
        if(done)break;
        total+=value.byteLength;
        if(total>LIMIT){oversized=true;await reader.cancel();break;}
        chunks.push(value);
      }
    }finally{if(oversized)reader.releaseLock();}
    if(oversized)return response;
    const body=new Uint8Array(total);
    let offset=0;
    for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
    const bounded=new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});
    const cache=await caches.open(CACHE);
    await cache.put(cacheKey(request),bounded);
    const keys=await cache.keys();
    // Cache insertion order is stable; keep the static shell plus a bounded game working set.
    let excess=Math.max(0,keys.length-MAX_GAME_ENTRIES);
    for(const key of keys){
      if(excess===0)break;
      if(urls.includes(key.url))continue;
      await cache.delete(key);
      excess--;
    }
  }catch(_error){/* Quota limits must not break online gameplay. */}
  return response;
}
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(urls)));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(OWN_PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    if(eligible(url,request)){
      event.respondWith(fetch(request).then(response=>remember(request,response)).catch(async()=>await caches.match(cacheKey(request))||await caches.match(new URL('offline.html',scope).href)));
    }else{
      event.respondWith(fetch(request).catch(()=>caches.match(new URL('offline.html',scope).href)));
    }
    return;
  }
  if(urls.includes(url.href)){event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));return;}
  // Only versioned, local, public game code is cached. No wallet, API or remote responses.
  if(eligible(url,request))event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>remember(request,response))));
});
