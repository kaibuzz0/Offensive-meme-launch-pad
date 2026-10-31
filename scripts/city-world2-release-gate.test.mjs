import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../city-v2-release-gate.js',import.meta.url),'utf8');
function context({origin='https://kaibuzz0.github.io',path='/Offensive-meme-launch-pad/city.html',search=''}={}){
 const visited=[],window={location:{origin,protocol:origin.startsWith('https:')?'https:':'http:',pathname:path,search,
  replace:to=>visited.push(to)}};
 Object.defineProperty(window,'localStorage',{get(){throw Error('World-v1 stored data must remain untouched.')}});
 window.window=window;
 vm.runInNewContext(source,window);
 return {visited,window};
}
test('official Meme City entrance always loads world-v2 without a release-ready API or durable save',()=>{
 const x=context();
 assert.deepEqual(x.visited,['./city-world2-production.html']);
 assert.equal(x.window.CityWorld2ReleaseGate.enabled(),true);
});
test('legacy query does not expose a second playable game',()=>{
 for(const search of ['?legacy=1','?from=menu','?legacy=1&x=1']){
  assert.deepEqual(context({search}).visited,['./city-world2-production.html']);
 }
});
test('redirect is pinned to official HTTPS site and cannot loop on v2 page',()=>{
 for(const args of [{origin:'http://localhost:8787'},{origin:'https://evil.example'},
  {path:'/Offensive-meme-launch-pad/city-world2-production.html'}]){
  assert.deepEqual(context(args).visited,[]);
 }
});
test('world-v2 redirect never accesses client localStorage or requires a backend call',()=>{
 const c=context();
 assert.equal(c.visited.length,1);
 assert.match(source,/World-v2-only public entry/);
 assert.doesNotMatch(source,/\/api\/world2\/health/);
});
