'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

test('offline game HTML navigation reuses static cached entry across query variants', async () => {
  const handlers = new Map();
  const scope = 'https://example.test/Offensive-meme-launch-pad/';
  const stores = new Map();
  const urlOf = req => typeof req === 'string' ? req : req.url;
  const open = async name => {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    return {
      keys: async () => [...entries.keys()].map(url => ({url})),
      match: async (req, options = {}) => {
        const url = urlOf(req);
        const key = options.ignoreSearch
          ? [...entries.keys()].find(k => k.split('?')[0] === url.split('?')[0])
          : url;
        return entries.get(key)?.clone();
      },
      put: async (req, res) => { entries.set(urlOf(req), res.clone()); },
      delete: async req => entries.delete(urlOf(req)),
      addAll: async urls => { for (const url of urls) entries.set(url, new Response('shell')); }
    };
  };
  const caches = {
    open,
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name),
    match: async (req, options) => {
      for (const name of stores.keys()) {
        const hit = await (await open(name)).match(req, options);
        if (hit) return hit;
      }
    }
  };
  let online = true;
  const context = {
    URL, Response, Promise, Map, Number, Error, caches,
    fetch: async () => {
      if (!online) throw Error('offline');
      return new Response('canonical game HTML');
    },
    self: {
      location: {origin:'https://example.test'},
      registration: {scope},
      clients: {claim: async () => {}},
      addEventListener: (name, handler) => handlers.set(name, handler)
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), context);
  const visit = async url => {
    let response;
    const tasks = [];
    handlers.get('fetch')({
      request: {url, method:'GET', mode:'navigate'},
      respondWith: promise => {response = promise;},
      waitUntil: promise => tasks.push(promise)
    });
    assert.ok(response, 'navigation intercepted');
    const result = await response;
    await Promise.all(tasks);
    return result.text();
  };
  assert.equal(await visit(scope + 'city.html?terrain=1'), 'canonical game HTML');
  online = false;
  assert.equal(await visit(scope + 'city.html?terrain=1&seed=42'), 'canonical game HTML');
});
