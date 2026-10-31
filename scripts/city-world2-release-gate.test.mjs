import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../city-v2-release-gate.js',import.meta.url),'utf8');
function context({origin='https://kaibuzz0.github.io',path='/Offensive-meme-launch-pad/city.html',search='',health={}}={}){
 const visited=[],requests=[],window={location:{origin,protocol:origin.startsWith('https:')?'https:':'http:',pathname:path,search,
  replace:to=>visited.push(to)},fetch:async(uri,opts)=>{
  requests.push({uri,opts});return {ok:true,json:async()=>health};}};
 window.window=window;
 vm.runInNewContext(source,window);
 return {visited,requests,window};
}
const good=()=>({worldVersion:2,preview:false,persistence:true,releaseReady:true});
test('v2 health-gated cutover activates ONLY after explicit approved durable production API',async()=>{
 const c=context({health:good()});
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(c.visited,['./city-world2-production.html']);
 assert.equal(c.requests.length,1);
 assert.equal(c.requests[0].opts.cache,'no-store');
 assert.equal(c.requests[0].uri,'https://offensive-meme-city-rooms.onrender.com/api/world2/health');
});
test('v1 remains default when no production approval, durability or preview isolation is missing',async()=>{
 for(const health of [{}, {...good(),releaseReady:false},{...good(),persistence:false},
  {...good(),preview:true},{...good(),worldVersion:1}]){
  const c=context({health});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(c.visited.length,0);
 }
});
test('legacy query flag and non-official domains permanently bypass cutover',async()=>{
 for(const args of [{search:'?legacy=1'},{origin:'http://localhost:8787'},
  {origin:'https://evil.example'},{path:'/Offensive-meme-launch-pad/city-world2-production.html'}]){
  const c=context({...args,health:good()});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(c.requests.length,0);assert.equal(c.visited.length,0);
 }
});
test('release guard never accesses browser storage and handles offline API safely',async()=>{
 const c={location:{origin:'https://kaibuzz0.github.io',protocol:'https:',
  pathname:'/Offensive-meme-launch-pad/city.html',search:'',replace:()=>{throw Error('must not redirect');}},
  fetch:async()=>{throw Error('offline');}};
 Object.defineProperty(c,'localStorage',{get(){throw Error('must not read original world1 save');}});
 c.window=c;vm.runInNewContext(source,c);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(c.CityWorld2ReleaseGate.eligible(good()),true);
});
