'use strict';
const CACHE='offensive-shell-v1';
const OWN_PREFIX='offensive-shell-';
const SHELL=['offline.html','assets/icons/app-192.png','assets/icons/app-512.png','assets/icons/apple-touch-180.png'];
const urls=SHELL.map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(urls)));});
// Updates wait for existing app windows to close; do not reload an active wallet flow.
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(OWN_PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(()=>caches.match(new URL('offline.html',self.registration.scope).href)));
    return;
  }
  // Never cache token metadata, reward configuration, wallet scripts, quotes, or API calls.
  if(urls.includes(url.href))event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
