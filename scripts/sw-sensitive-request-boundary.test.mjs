import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const scope = 'https://example.test/Offensive-meme-launch-pad/';
function harness() {
  const handlers = new Map();
  const fetchCalls = [];
  const self = {
    location: { origin: 'https://example.test' },
    registration: { scope },
    clients: { claim: async () => {} },
    addEventListener(type, handler) { handlers.set(type, handler); },
  };
  const caches = {
    open: async () => ({ addAll: async () => {} }),
    keys: async () => [],
    match: async () => undefined,
    delete: async () => true,
  };
  const fetch = async request => {
    fetchCalls.push(request.url);
    return { ok: true, url: request.url };
  };
  runInNewContext(source, { self, caches, fetch, URL });
  return {
    fetchCalls,
    async request(path, options = {}) {
      let response;
      const request = { url: new URL(path, scope).href, method: 'GET', mode: 'cors', ...options };
      handlers.get('fetch')({ request, respondWith(promise) { response = promise; } });
      if (response) await response;
      return Boolean(response);
    },
  };
}

test('service worker does not intercept API, wallet, or multiplayer data requests', async () => {
  const app = harness();
  for (const path of ['api/world', 'api/rewards', 'server/session', 'wallet/connect', 'token/metadata.json']) {
    assert.equal(await app.request(path), false, path);
  }
  assert.deepEqual(app.fetchCalls, []);
});

test('service worker never intercepts mutation requests or cross-origin fetches', async () => {
  const app = harness();
  assert.equal(await app.request('api/world', { method: 'POST' }), false);
  assert.equal(await app.request('api/world', { method: 'DELETE' }), false);
  assert.equal(await app.request('https://external.example/wallet.js'), false);
  assert.deepEqual(app.fetchCalls, []);
});

test('offline shell resources remain eligible for cache interception', async () => {
  const app = harness();
  assert.equal(await app.request('offline.html'), true);
  assert.equal(await app.request('assets/icons/app-192.png'), true);
});
