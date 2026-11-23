import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the real service worker without installing a browser-only test dependency.
const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
function harness() {
  const listeners = new Map();
  const scope = 'https://example.test/Offensive-meme-launch-pad/';
  const requests = [];
  const cacheEntries = new Map();
  const cache = {
    addAll: async urls => { for (const url of urls) cacheEntries.set(url, { url }); },
    match: async request => cacheEntries.get(typeof request === 'string' ? request : request.url),
  };
  const self = {
    location: { origin: 'https://example.test' },
    registration: { scope },
    clients: { claim: async () => {} },
    addEventListener: (type, fn) => listeners.set(type, fn),
  };
  const caches = {
    open: async () => cache,
    keys: async () => ['offensive-shell-v1'],
    delete: async () => true,
    match: cache.match,
  };
  vm.runInNewContext(source, { self, caches, URL, fetch: async request => { requests.push(request.url); return { url: request.url }; } });
  async function dispatch(type, request) {
    let promise;
    const event = { request, waitUntil: value => { promise = value; }, respondWith: value => { promise = value; } };
    listeners.get(type)(event);
    return promise && await promise;
  }
  return { dispatch, cacheEntries, requests, scope };
}

test('precache remains bounded and install is repeat-safe', async () => {
  const h = harness();
  await h.dispatch('install');
  const first = [...h.cacheEntries.keys()];
  assert.equal(first.length, 4);
  assert(first.every(url => url.startsWith(h.scope)));
  await h.dispatch('install');
  assert.deepEqual([...h.cacheEntries.keys()], first);
});

test('ordinary asset requests do not grow the shell cache', async () => {
  const h = harness();
  await h.dispatch('install');
  for (let i = 0; i < 200; i++) {
    await h.dispatch('fetch', { method: 'GET', mode: 'cors', url: h.scope + 'chunks/' + i + '.bin' });
  }
  assert.equal(h.cacheEntries.size, 4);
  assert.equal(h.requests.length, 0);
});

test('wallet and multiplayer mutations bypass the shell cache', async () => {
  const h = harness();
  await h.dispatch('install');
  for (const path of ['api/reward', 'wallet/claim', 'multiplayer/state']) {
    await h.dispatch('fetch', { method: 'POST', mode: 'cors', url: h.scope + path });
  }
  assert.equal(h.cacheEntries.size, 4);
  assert.equal(h.requests.length, 0);
});
