import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const scope = 'https://example.test/Offensive-meme-launch-pad/';

function boot({ network = async () => new Response('network'), cached = null } = {}) {
  const listeners = new Map();
  const matched = [];
  const writes = [];
  const store = {
    addAll: async paths => { writes.push(...paths); },
    match: async request => { matched.push(request); return cached; }
  };
  const caches = {
    open: async () => store,
    keys: async () => [],
    delete: async () => true,
    match: store.match
  };
  const self = {
    registration: { scope },
    location: { origin: 'https://example.test' },
    clients: { claim: async () => {} },
    addEventListener: (name, fn) => listeners.set(name, fn)
  };
  vm.runInNewContext(source, { self, caches, fetch: network, URL }, { filename: 'sw.js' });
  return { listeners, matched, writes };
}

async function dispatchFetch(runtime, path, options = {}) {
  let result;
  const event = {
    request: {
      method: options.method ?? 'GET',
      url: new URL(path, scope).href,
      mode: options.mode ?? 'cors'
    },
    respondWith(promise) { result = promise; }
  };
  runtime.listeners.get('fetch')(event);
  return result === undefined ? undefined : await result;
}

test('install caches only offline shell resources, not wallet or game state', async () => {
  const runtime = boot();
  let installation;
  runtime.listeners.get('install')({ waitUntil(promise) { installation = promise; } });
  await installation;
  assert.equal(runtime.writes.length, 4);
  assert.ok(runtime.writes.every(url => url.startsWith(scope)));
  assert.ok(runtime.writes.some(url => url.endsWith('/offline.html')));
  assert.ok(runtime.writes.every(url => !/wallet|token|api|city\.html/.test(url)));
});

test('wallet, API and cross-origin requests are never intercepted', async () => {
  const runtime = boot();
  for (const path of ['api/rewards', 'wallet.js', 'https://external.test/wallet.js']) {
    assert.equal(await dispatchFetch(runtime, path), undefined);
  }
  assert.equal(await dispatchFetch(runtime, 'offline.html', { method: 'POST' }), undefined);
  assert.equal(runtime.matched.length, 0);
});

test('shell assets use cache while ordinary game assets use network', async () => {
  const runtime = boot({ cached: new Response('cached') });
  assert.equal(await (await dispatchFetch(runtime, 'assets/icons/app-192.png')).text(), 'cached');
  assert.equal(await dispatchFetch(runtime, 'city.js'), undefined);
  assert.equal(runtime.matched.length, 1);
});

test('offline navigation serves offline notice, not an invented playable game', async () => {
  const runtime = boot({ network: async () => { throw new Error('offline'); }, cached: new Response('offline notice') });
  const response = await dispatchFetch(runtime, 'city.html', { mode: 'navigate' });
  assert.equal(await response.text(), 'offline notice');
  assert.equal(runtime.matched.length, 1);
});
