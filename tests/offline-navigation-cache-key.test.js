import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const source = readFileSync(resolve(import.meta.dirname, '../sw.js'), 'utf8');
const match = source.match(/function cacheKey\(request\)\{[\s\S]*?\n\}/);
assert.ok(match, 'service worker must provide a canonical cache key');
const context = { URL, Request };
vm.runInNewContext(match[0] + '\nthis.cacheKey = cacheKey;', context);

test('different world seeds share a single offline HTML cache key', () => {
  const base = 'https://example.test/Offensive-meme-launch-pad/city.html';
  const a = context.cacheKey({ url: base + '?terrain=1&seed=alpha', mode: 'navigate' });
  const b = context.cacheKey({ url: base + '?terrain=1&seed=beta', mode: 'navigate' });
  assert.equal(a.url, base);
  assert.equal(b.url, base);
});

test('homepage query variants share the homepage offline cache entry', () => {
  const base = 'https://example.test/Offensive-meme-launch-pad/';
  const a = context.cacheKey({ url: base + '?seed=one', mode: 'navigate' });
  const b = context.cacheKey({ url: base + '?seed=two', mode: 'navigate' });
  assert.equal(a.url, b.url);
});

test('non-navigation assets retain their original request', () => {
  const request = { url: 'https://example.test/Offensive-meme-launch-pad/city.js?v=3', mode: 'cors' };
  assert.equal(context.cacheKey(request), request);
});
