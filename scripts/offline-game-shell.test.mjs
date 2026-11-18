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

test('game scripts refresh online and fall back to cached copies offline',async()=>{
  const handlers={};
  const scope='https://example.test/Offensive-meme-launch-pad/';
  const asset=scope+'city-voxel-mesh-worker.js';
  let online=true;
  let networkCalls=0;
  let saved={ok:true,status:200,body:'old',clone(){return this;}};
  const cache={
    async put(_request,response){saved=response;},
    async keys(){return [asset];},
    async delete(){return true;}
  };
  const caches={
    async open(){return cache;},
    async match(request){return (typeof request==='string'?request:request.url)===asset?saved:undefined;}
  };
  const self={
    registration:{scope},location:{origin:'https://example.test'},
    addEventListener:(name,fn)=>{handlers[name]=fn;},
    clients:{claim:async()=>{}}
  };
  const context={
    self,URL,caches,Response:{error:()=>({ok:false,status:0})},
    fetch:async()=>{networkCalls++;if(!online)throw Error('offline');return {ok:true,status:200,body:'new',clone(){return this;}};}
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
    return response;
  }
  assert.equal((await requestAsset()).body,'new');
  assert.equal(saved.body,'new');
  online=false;
  assert.equal((await requestAsset()).body,'new');
  assert.equal(networkCalls,2);
});
