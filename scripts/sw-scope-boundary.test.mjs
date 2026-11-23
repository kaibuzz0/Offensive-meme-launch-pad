import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('PWA service worker ignores same-origin URLs outside its registration scope', () => {
  const listeners = new Map();
  const scope = 'https://example.test/Offensive-meme-launch-pad/';
  const self = {
    location: { origin: 'https://example.test' },
    registration: { scope },
    addEventListener(type, listener) { listeners.set(type, listener); },
  };
  vm.runInNewContext(source, { self, URL, caches: {}, fetch() { return Promise.resolve({ ok: true }); } });
  let intercepted = 0;
  const dispatch = (url, method = 'GET') => listeners.get('fetch')({
    request: { url, method, mode: 'navigate' },
    respondWith() { intercepted++; },
  });
  dispatch('https://example.test/private/account');
  dispatch('https://example.test/Offensive-meme-launch-pad-other/city.html');
  dispatch('https://wallet.example.net/authorize');
  dispatch(scope + 'api/claim', 'POST');
  assert.equal(intercepted, 0);
  dispatch(scope + 'city.html?terrain=1');
  assert.equal(intercepted, 1);
});
