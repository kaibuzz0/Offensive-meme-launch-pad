import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../sw.js',import.meta.url),'utf8');

function serviceWorkerHarness(){
  const listeners=new Map();
  const cacheNames=new Set();
  const requests=[];
  const cacheReads=[];
  const scope='https://example.test/Offensive-meme-launch-pad/';
  const cache={addAll:async urls=>{urls.forEach(url=>cacheNames.add(url));}};
  const caches={open:async()=>cache,keys:async()=>[],delete:async()=>true,match:async request=>{cacheReads.push(request);return null;}};
  const self={location:{origin:'https://example.test'},registration:{scope},clients:{claim:async()=>{}},addEventListener:(name,fn)=>listeners.set(name,fn)};
  const fetch=async request=>{requests.push(request);return {ok:true,url:request.url};};
  runInNewContext(source,{self,caches,fetch,URL,console});
  return {listeners,cacheNames,requests,cacheReads,scope};
}

function dispatch(h,name,request){
  let response;
  h.listeners.get(name)({request,respondWith(value){response=Promise.resolve(value);},waitUntil(value){response=Promise.resolve(value);}});
  return response;
}

test('PWA installation precaches only bounded offline shell assets',async()=>{
  const h=serviceWorkerHarness();await dispatch(h,'install');
  assert.equal(h.cacheNames.size,4);
  for(const url of h.cacheNames)assert.match(url,/offline\.html|assets\/icons\//);
  assert.ok(![...h.cacheNames].some(url=>/city|wallet|token|\.js|\.mp4/.test(url)));
});

test('game scripts and wallet requests never enter service-worker runtime cache',async()=>{
  const h=serviceWorkerHarness();
  for(const path of ['city.html?terrain=1','city-voxel-renderer.js','wallet-mobile.js','tokens.js','server/api/room']){
    const request={url:new URL(path,h.scope).href,method:'GET',mode:'cors'};
    assert.equal(dispatch(h,'fetch',request),undefined,path+' should be left to browser network');
  }
  assert.equal(h.cacheReads.length,0);
});

test('navigation fetches network first and falls back to offline page',async()=>{
  const h=serviceWorkerHarness();
  const request={url:new URL('city.html?terrain=1',h.scope).href,method:'GET',mode:'navigate'};
  const result=await dispatch(h,'fetch',request);
  assert.equal(result.url,request.url);
  assert.equal(h.requests.length,1);
});
