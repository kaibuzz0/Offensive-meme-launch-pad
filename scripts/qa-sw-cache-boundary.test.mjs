import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the shipped worker without a browser or third-party dependency.
const source=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const scope='https://example.test/Offensive-meme-launch-pad/';
function harness(){
 const handlers=new Map(),store=new Map(),requests=[];
 const caches={
  async open(name){if(!store.has(name))store.set(name,new Set());return {async addAll(urls){urls.forEach(url=>store.get(name).add(url));}};},
  async keys(){return [...store.keys()];},
  async delete(name){return store.delete(name);},
  async match(req){const url=typeof req==='string'?req:req.url;return [...store.values()].some(set=>set.has(url))?{cached:true,url}:undefined;}
 };
 const self={location:{origin:'https://example.test'},registration:{scope},clients:{claim:async()=>{}},addEventListener:(type,fn)=>handlers.set(type,fn)};
 const fetch=async request=>{requests.push(request.url);return {network:true};};
 vm.runInNewContext(source,{self,caches,fetch,URL});
 async function dispatch(type,request){let task;const event={request,waitUntil:p=>task=p,respondWith:p=>task=p};handlers.get(type)(event);return task&&await task;}
 return {dispatch,store,requests};
}
test('worker shell cache remains bounded and excludes gameplay, wallet and token assets',async()=>{
 const h=harness();await h.dispatch('install');
 const all=[...h.store.values()].flatMap(set=>[...set]);
 assert.equal(all.length,4);
 assert.ok(all.every(url=>url.startsWith(scope)));
 assert.ok(all.every(url=>!/(city\\.html|city\\.js|wallet|token|api|reward)/i.test(url)));
});
test('worker does not intercept wallet, API or cross-origin requests',async()=>{
 const h=harness();await h.dispatch('install');
 for(const url of [scope+'wallet-mobile.js',scope+'api/rewards','https://external.test/asset.js']){
  const result=await h.dispatch('fetch',{url,method:'GET',mode:'cors'});
  assert.equal(result,undefined,url);
 }
 assert.equal(h.requests.length,0);
});
test('worker removes obsolete owned caches without deleting unrelated caches',async()=>{
 const h=harness();h.store.set('offensive-shell-old',new Set());h.store.set('other-app',new Set());
 await h.dispatch('install');await h.dispatch('activate');
 assert.equal(h.store.has('offensive-shell-old'),false);
 assert.equal(h.store.has('other-app'),true);
});
