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
function response({ redirected = false, url = '', size = '1024', cacheControl = null } = {}) {
  return {
    ok: true, type: 'basic', redirected, url,
    headers: { has: () => false, get: name => name === 'content-length' ? size : name === 'cache-control' ? cacheControl : null },
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
  const req = { url: 'https://example.test/game/city.js' };
  await context.remember(req, response({ size: String(3 * 1024 * 1024) }));
  assert.equal(saved.length, 0);
  await context.remember(req, response({ redirected: true, url: req.url }));
  assert.equal(saved.length, 1);
});

test('offline cache respects private and no-store response directives', async () => {
  const { context, saved } = worker();
  const req = { url: 'https://example.test/game/city.js' };
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
