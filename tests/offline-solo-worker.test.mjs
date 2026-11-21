import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
function worker(){
  const listeners={};
  const scope='https://example.test/Offensive-meme-launch-pad/';
  const context={
    URL, caches:{}, fetch(){},
    self:{registration:{scope},location:{origin:'https://example.test'},clients:{claim(){}},addEventListener(name,callback){listeners[name]=callback;}}
  };
  vm.runInNewContext(source,context);
  return {context,listeners,scope};
}
test('canonical game scripts and navigation are cache eligible',()=>{
  const {context,scope}=worker();
  for(const file of ['city.html','index.html','city-voxel-renderer.js','city-terrain-mode.js','city.css','tokens.js']){
    assert.equal(context.eligible(new URL(file,scope),{method:'GET',credentials:'same-origin'}),true,file);
  }
});
test('cross-origin, wallet endpoints, POST and authenticated fetches are not cached',()=>{
  const {context,scope}=worker();
  for(const file of ['api/rewards','wallet.js','../../private.js']){
    assert.equal(context.eligible(new URL(file,scope),{method:'GET',credentials:'same-origin'}),false,file);
  }
  assert.equal(context.eligible(new URL('city.js',scope),{method:'POST',credentials:'same-origin'}),false);
  assert.equal(context.eligible(new URL('city.js',scope),{method:'GET',credentials:'include'}),false);
  assert.equal(context.eligible(new URL('https://other.test/city.js'),{method:'GET',credentials:'same-origin'}),false);
});
test('fetch listener does not intercept unsafe methods or foreign origins',()=>{
  const {listeners,scope}=worker();
  for(const [url,method] of [['https://other.test/city.js','GET'],[scope+'city.js','POST']]){
    let intercepted=false;
    listeners.fetch({request:{url,method,mode:'cors'},respondWith(){intercepted=true;}});
    assert.equal(intercepted,false);
  }
});

test('directory homepage is cacheable only as a navigation for offline Play',()=>{
  const {context,scope}=worker();
  assert.equal(context.eligible(new URL(scope),{method:'GET',mode:'navigate',credentials:'same-origin'}),true);
  assert.equal(context.eligible(new URL(scope),{method:'GET',mode:'cors',credentials:'same-origin'}),false);
});
