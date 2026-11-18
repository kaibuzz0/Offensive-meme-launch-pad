import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
test('offline game shell only accepts bounded local game resources',()=>{
  const handlers={};
  const scope='https://example.test/Offensive-meme-launch-pad/';
  const self={registration:{scope},location:{origin:'https://example.test'},addEventListener:(name,fn)=>{handlers[name]=fn;},clients:{claim:async()=>{}}};
  const context={self,URL,caches:{},fetch:()=>{throw Error('network not expected');}};
  vm.runInNewContext(source,context);
  assert.equal(typeof handlers.fetch,'function');
  assert.equal(vm.runInNewContext('localGameAsset(new URL("city.html?terrain=1",self.registration.scope))',context),true);
  assert.equal(vm.runInNewContext('localGameAsset(new URL("city-voxel-mesh-worker.js",self.registration.scope))',context),true);
  for(const path of ['tokens.js','pwa.js','wallet-mobile.js','api/rooms','city.html/../beta.html']){
    assert.equal(vm.runInNewContext('localGameAsset(new URL('+JSON.stringify(path)+',self.registration.scope))',context),false,path);
  }
  assert.equal(vm.runInNewContext('GAME_MAX_ENTRIES',context),80);
});

test('game worker refreshes online and is available after an offline revisit',async()=>{
  const handlers={};
  const scope='https://example.test/Offensive-meme-launch-pad/';
  const asset=scope+'city-voxel-mesh-worker.js';
  let online=true;
  let networkCalls=0;
  const entries=new Map([[asset,new Response('old')]]);
  const keyOf=request=>typeof request==='string'?request:request.url;
  const cache={
    async put(request,response){entries.set(keyOf(request),response.clone());},
    async match(request){const found=entries.get(keyOf(request));return found?.clone();},
    async keys(){return [...entries.keys()];},
    async delete(request){return entries.delete(keyOf(request));}
  };
  const caches={
    async open(){return cache;},
    async match(request){return cache.match(request);}
  };
  const self={
    registration:{scope},location:{origin:'https://example.test'},
    addEventListener:(name,fn)=>{handlers[name]=fn;},
    clients:{claim:async()=>{}}
  };
  const context={
    self,URL,caches,Response,
    fetch:async()=>{networkCalls++;if(!online)throw Error('offline');return new Response('new');}
  };
  vm.runInNewContext(source,context);
  async function requestAsset(){
    let result;
    const writes=[];
    handlers.fetch({
      request:{url:asset,method:'GET',mode:'cors'},
      respondWith(promise){result=promise;},
      waitUntil(promise){writes.push(promise);}
    });
    const response=await result;
    await Promise.all(writes);
    return response.text();
  }
  assert.equal(await requestAsset(),'new');
  assert.equal(await (await cache.match(asset)).text(),'new','online refresh must reach cache');
  online=false;
  assert.equal(await requestAsset(),'new','offline worker must use the refreshed copy');
  assert.equal(networkCalls,2);
});
