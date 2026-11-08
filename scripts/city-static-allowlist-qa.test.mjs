import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createCityServer} from '../server/city-server.mjs';

test('static serving remains allowlisted and never exposes repository secrets', async t => {
  const {server}=createCityServer();
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  for(const target of [
    '/package.json','/.git/config','/.env','/server/city-server.mjs',
    '/docs/DEVELOPMENT_COUNCIL.md','/scripts/check.mjs',
    '/%2e%2e/package.json','/assets/../../package.json'
  ]){
    const response=await fetch(base+target);
    assert.equal(response.status,404,'unexpected static exposure: '+target);
  }
  const homepage=await fetch(base+'/');
  assert.equal(homepage.status,200);
  assert.match(homepage.headers.get('content-type')||'',/text\\/html/);
  assert.equal(homepage.headers.get('x-content-type-options'),'nosniff');
  const head=await fetch(base+'/city.html',{method:'HEAD'});
  assert.equal(head.status,200);
  assert.equal((await head.text()).length,0);
});

test('non-GET static methods and API origins are rejected', async t=>{
  const {server}=createCityServer();
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  const post=await fetch(base+'/city.html',{method:'POST'});
  assert.equal(post.status,405);
  const denied=await fetch(base+'/api/city/health',{headers:{Origin:'https://untrusted.invalid'}});
  assert.equal(denied.status,403);
  assert.equal(denied.headers.get('access-control-allow-origin'),null);
});
