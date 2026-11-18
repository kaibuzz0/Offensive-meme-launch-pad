import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
test('offline game cache enforces both entry and byte limits',()=>{
  assert.match(source,/GAME_MAX_ENTRIES=80/);
  assert.match(source,/GAME_MAX_BYTES=12\*1024\*1024/);
  assert.match(source,/GAME_MAX_RESPONSE_BYTES=4\*1024\*1024/);
  assert.match(source,/body\.byteLength>GAME_MAX_RESPONSE_BYTES/);
  assert.match(source,/total>GAME_MAX_BYTES/);
  assert.match(source,/await cache\.delete\(keys\[i\]\)/);
});
test('offline cache never includes wallet or remote API routes',()=>{
  assert.match(source,/url\.origin!==scopeUrl\.origin/);
  assert.match(source,/gamePath\.test\(url\.pathname\.slice/);
  assert.doesNotMatch(source,/cache\.put\(request,response\.clone\(\)\)/);
});
