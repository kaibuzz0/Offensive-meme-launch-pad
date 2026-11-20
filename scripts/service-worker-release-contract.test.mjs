import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('../sw.js', import.meta.url)), 'utf8');

test('service worker restricts interception to same-origin GET', () => {
  assert.match(source, /request\.method\s*!==\s*['"]GET['"]/);
  assert.match(source, /url\.origin\s*!==\s*self\.location\.origin/);
});

test('service worker does not cache arbitrary API or wallet requests', () => {
  // Existing shell cache is an explicit allowlist; a future game cache must
  // retain this boundary instead of caching every successful GET response.
  assert.match(source, /urls\.includes\(url\.href\)/);
  assert.match(source, /event\.respondWith\(caches\.match\(request\)/);
});

test('offline navigation falls back to a same-scope document', () => {
  assert.match(source, /request\.mode\s*===\s*['"]navigate['"]/);
  assert.match(source, /new URL\(['"]offline\.html['"],\s*self\.registration\.scope\)/);
});

test.todo('homepage Play opens wallet-free Solo after offline reload with cached game dependencies');
test.todo('saved pickup and player position survive offline reload on mobile Chromium');
test.todo('accelerated and compatibility renderers retain identical collision and interactions');

import vm from 'node:vm';

test('runtime: offline navigation returns the scoped notice, not a playable Solo document', async () => {
  const listeners = new Map();
  const scope = 'https://example.test/Offensive-meme-launch-pad/';
  const notice = new URL('offline.html', scope).href;
  const cachedNotice = { status: 200, url: notice, text: async () => 'offline notice' };
  const context = {
    URL,
    self: {
      location: { origin: 'https://example.test' },
      registration: { scope },
      clients: { claim: async () => {} },
      addEventListener: (name, listener) => listeners.set(name, listener),
    },
    caches: {
      open: async () => ({ addAll: async () => {} }),
      keys: async () => [],
      delete: async () => true,
      match: async (request) => (String(request) === notice ? cachedNotice : undefined),
    },
    fetch: async () => { throw new Error('network offline'); },
  };
  vm.runInNewContext(source, context, { filename: 'sw.js', timeout: 1000 });
  const event = {
    request: {
      method: 'GET',
      url: new URL('index.html', scope).href,
      mode: 'navigate',
    },
    respondWith(promise) { this.response = promise; },
  };
  listeners.get('fetch')(event);
  assert.ok(event.response, 'navigation must be intercepted');
  assert.equal(await event.response, cachedNotice, 'current offline fallback is a notice, not game entry');
});

test('runtime: cross-origin and POST requests are not intercepted', () => {
  const listeners = new Map();
  const scope = 'https://example.test/Offensive-meme-launch-pad/';
  const context = {
    URL,
    self: {
      location: { origin: 'https://example.test' },
      registration: { scope },
      addEventListener: (name, listener) => listeners.set(name, listener),
    },
  };
  vm.runInNewContext(source, context, { filename: 'sw.js', timeout: 1000 });
  for (const request of [
    { method: 'POST', url: scope + 'api/claim', mode: 'cors' },
    { method: 'GET', url: 'https://wallet.example/api', mode: 'cors' },
  ]) {
    let intercepted = false;
    listeners.get('fetch')({ request, respondWith() { intercepted = true; } });
    assert.equal(intercepted, false);
  }
});
