import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const origin='https://example.test/Offensive-meme-launch-pad/';
function harness({offline=false}={}){
 const handlers=new Map(), cacheWrites=[], fetches=[], matches=[];
 const cache={addAll:async urls=>{cacheWrites.push(...urls);}};
 const caches={
  open:async()=>cache,
  keys:async()=>[],
  delete:async()=>true,
  match:async request=>{matches.push(typeof request==='string'?request:request.url);return {cached:true};}
 };
 const self={registration:{scope:origin},location:{origin:new URL(origin).origin},
  clients:{claim:async()=>{}},addEventListener:(type,fn)=>handlers.set(type,fn)};
 const fetch=async request=>{fetches.push(request.url);if(offline)throw Error('offline');return {network:true};};
 runInNewContext(source,{self,caches,fetch,URL});
 return {handlers,cacheWrites,fetches,matches};
}
function request(url,{method='GET',mode='cors'}={}){
 return {url:new URL(url,origin).href,method,mode};
}
async function dispatch(h,type,req){
 let response,waiting;
 const event={request:req,respondWith:p=>{response=p;},waitUntil:p=>{waiting=p;}};
 h.handlers.get(type)(event);
 if(waiting)await waiting;
 return response?await response:undefined;
}

test('install pre-caches only the bounded offline shell, never game or wallet data',async()=>{
 const h=harness();await dispatch(h,'install');
 assert.equal(h.cacheWrites.length,4);
 for(const url of h.cacheWrites)assert.ok(url.startsWith(origin));
 assert.ok(h.cacheWrites.every(url=>!/city\\.html|wallet|api|token|reward/i.test(url)));
});

test('API, wallet, game scripts, POST and cross-origin requests bypass service-worker caching',async()=>{
 const h=harness();
 for(const req of [
  request('api/rooms'),request('wallet-mobile.js'),request('city.html?terrain=1'),
  request('city-voxel-renderer.js'),request('assets/icons/app-192.png',{method:'POST'}),
  request('https://other.example/asset.js')
 ]){
  assert.equal(await dispatch(h,'fetch',req),undefined,req.url);
 }
 assert.equal(h.matches.length,0);
 assert.equal(h.fetches.length,0);
});

test('offline navigation serves fallback without caching the requested game URL',async()=>{
 const h=harness({offline:true});
 const result=await dispatch(h,'fetch',request('city.html?terrain=1',{mode:'navigate'}));
 assert.equal(result.cached,true);
 assert.deepEqual(h.matches,[origin+'offline.html']);
 assert.equal(h.fetches.length,1);
});

test('cached shell assets use only the installed allowlist',async()=>{
 const h=harness();
 const cached=await dispatch(h,'fetch',request('assets/icons/app-192.png'));
 assert.equal(cached.cached,true);
 assert.equal(h.matches.length,1);
 assert.equal(await dispatch(h,'fetch',request('assets/icons/not-in-shell.png')),undefined);
 assert.equal(h.matches.length,1);
});
