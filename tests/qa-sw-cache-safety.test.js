'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function worker(existingKeys = []) {
  const saved = [];
  const deleted = [];
  const cache = { put: async (...args) => saved.push(args), keys: async () => existingKeys, delete: async key => { deleted.push(key.url); return true; } };
  const context = vm.createContext({
    URL, Number, self: {
      location: { origin: 'https://example.test' },
      registration: { scope: 'https://example.test/game/' },
      addEventListener() {},
      clients: { claim: async () => {} }
    },
    caches: { open: async () => cache }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), context);
  return { context, saved, deleted };
}
function response({ redirected = false, url = '', size = '1024', cacheControl = null, status = 200, mime = 'text/javascript' } = {}) {
  return {
    ok: status >= 200 && status < 300, status, type: 'basic', redirected, url,
    headers: { has: () => false, get: name => name === 'content-length' ? size : name === 'cache-control' ? cacheControl : name === 'content-type' ? mime : null },
    clone() { return this; }
  };
}
test('offline cache rejects cross-origin redirected responses', async () => {
  const { context, saved } = worker();
  await context.remember({ url: 'https://example.test/game/city.js' },
    response({ redirected: true, url: 'https://external.test/script.js' }));
  assert.equal(saved.length, 0);
});
test('offline cache rejects oversized assets but accepts ordinary same-origin scripts', async () => {
  const { context, saved } = worker();
  const req = { url: 'https://example.test/game/city.js', method: 'GET', mode: 'cors', credentials: 'same-origin' };
  await context.remember(req, response({ size: String(3 * 1024 * 1024) }));
  assert.equal(saved.length, 0);
  await context.remember(req, response({ redirected: true, url: req.url }));
  assert.equal(saved.length, 1);
});

test('offline cache respects private and no-store response directives', async () => {
  const { context, saved } = worker();
  const req = { url: 'https://example.test/game/city.js', method: 'GET', mode: 'cors', credentials: 'same-origin' };
  await context.remember(req, response({ cacheControl: 'public, no-store' }));
  await context.remember(req, response({ cacheControl: 'private, max-age=60' }));
  assert.equal(saved.length, 0);
  await context.remember(req, response({ cacheControl: 'public, max-age=60' }));
  assert.equal(saved.length, 1);
});

test('cache eviction skips shell entries without exceeding the entry cap', async () => {
  const scope = 'https://example.test/game/';
  const shell = ['offline.html', 'assets/icons/app-192.png', 'assets/icons/app-512.png', 'assets/icons/apple-touch-180.png'];
  const keys = [...shell.map(name => ({ url: scope + name })),
    ...Array.from({ length: 95 }, (_, i) => ({ url: scope + 'city.js?v=' + i }))];
  const { context, deleted } = worker(keys);
  await context.remember({ url: scope + 'city.js' }, response());
  assert.equal(deleted.length, 3);
  assert.ok(deleted.every(url => !shell.some(name => url === scope + name)));
});


test('authorized game requests are not eligible for public offline caching', () => {
  const { context } = worker();
  const url = new URL('https://example.test/game/city.js');
  const anonymous = { method: 'GET', mode: 'cors', credentials: 'same-origin', headers: new Headers() };
  const authorized = { ...anonymous, headers: new Headers({ Authorization: 'Bearer example-secret' }) };
  assert.equal(context.eligible(url, anonymous), true);
  assert.equal(context.eligible(url, authorized), false);
});


test('cache rejects partial content and redirects outside the game allowlist', async () => {
  const { context, saved } = worker();
  const req = { url: 'https://example.test/game/city.js', method: 'GET', mode: 'cors', credentials: 'same-origin' };
  await context.remember(req, response({ status: 206 }));
  await context.remember(req, response({ redirected: true, url: 'https://example.test/game/api/rewards' }));
  await context.remember(req, response({ redirected: true, url: 'https://example.test/game/wallet.js' }));
  assert.equal(saved.length, 0);
  await context.remember(req, response({ redirected: true, url: req.url }));
  assert.equal(saved.length, 1);
});


test('HTML fallback cannot poison the cached JavaScript or CSS game entry', async () => {
  const { context, saved } = worker();
  const js = { url: 'https://example.test/game/city.js', method: 'GET', mode: 'cors', credentials: 'same-origin' };
  const css = { ...js, url: 'https://example.test/game/city.css' };
  const page = { ...js, url: 'https://example.test/game/city.html', mode: 'navigate' };
  await context.remember(js, response({ mime: 'text/html' }));
  await context.remember(css, response({ mime: 'text/html' }));
  await context.remember(page, response({ mime: 'text/javascript' }));
  assert.equal(saved.length, 0);
  await context.remember(js, response({ mime: 'application/javascript; charset=utf-8' }));
  await context.remember(css, response({ mime: 'text/css' }));
  await context.remember(page, response({ mime: 'text/html' }));
  assert.equal(saved.length, 3);
});
