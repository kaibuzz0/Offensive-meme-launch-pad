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
