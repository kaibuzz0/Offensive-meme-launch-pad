'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function worker() {
  const saved = [];
  const cache = { put: async (...args) => saved.push(args), keys: async () => [] };
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
  return { context, saved };
}
function response({ redirected = false, url = '', size = '1024' } = {}) {
  return {
    ok: true, type: 'basic', redirected, url,
    headers: { has: () => false, get: name => name === 'content-length' ? size : null },
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
