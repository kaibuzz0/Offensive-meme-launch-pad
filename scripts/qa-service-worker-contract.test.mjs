import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

function boot() {
  const listeners = new Map();
  const cacheNames = ['offensive-shell-old', 'unrelated-cache'];
  const deleted = [];
  const cached = [];
  const scope = 'https://example.test/Offensive-meme-launch-pad/';
  const cache = { addAll: async urls => cached.push(...urls) };
  const caches = {
    open: async () => cache,
    keys: async () => [...cacheNames],
    delete: async name => { deleted.push(name); return true; },
    match: async () => undefined
  };
  const self = {
    location: { origin: 'https://example.test' },
    registration: { scope },
    clients: { claim: async () => {} },
    addEventListener: (type, handler) => listeners.set(type, handler)
  };
  vm.runInNewContext(source, { self, caches, URL, fetch: async () => ({ ok: true }) });
  return { listeners, cached, deleted, scope };
}

async function dispatch(handler, event) {
  const jobs = [];
  handler({ ...event, waitUntil: p => jobs.push(p), respondWith: p => jobs.push(p) });
  await Promise.all(jobs);
}

test('offline shell is scoped and does not claim to cache the playable game', async () => {
  const env = boot();
  await dispatch(env.listeners.get('install'), {});
  assert.ok(env.cached.length > 0);
  for (const url of env.cached) assert.ok(url.startsWith(env.scope), url);
  assert.ok(env.cached.some(url => url.endsWith('/offline.html')));
  assert.ok(!env.cached.some(url => /\/(?:city\.html|city-terrain-mode\.js|city-voxel-world\.js)$/.test(url)),
    'A minimal offline shell must not be mistaken for complete offline Solo');
});

test('activation deletes only caches owned by this service worker', async () => {
  const env = boot();
  await dispatch(env.listeners.get('activate'), {});
  assert.deepEqual(env.deleted, ['offensive-shell-old']);
});

test('wallet and API traffic never enters service-worker cache handlers', async () => {
  const env = boot();
  for (const path of ['api/city/state', 'wallet-mobile.js', 'tokens.js']) {
    let intercepted = false;
    await dispatch(env.listeners.get('fetch'), {
      request: { method: 'GET', url: env.scope + path, mode: 'cors' },
      respondWith: () => { intercepted = true; }
    });
    assert.equal(intercepted, false, path);
  }
});

test('cross-origin and non-GET requests bypass service-worker interception', async () => {
  const env = boot();
  for (const request of [
    { method: 'GET', url: 'https://other.test/city.html', mode: 'navigate' },
    { method: 'POST', url: env.scope + 'api/city/action', mode: 'cors' }
  ]) {
    let intercepted = false;
    env.listeners.get('fetch')({
      request,
      respondWith: () => { intercepted = true; }
    });
    assert.equal(intercepted, false);
  }
});
