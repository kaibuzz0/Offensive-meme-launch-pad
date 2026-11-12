import test from 'node:test';
import assert from 'node:assert/strict';
import {createCityServer} from '../server/city-server.mjs';

test('API rejects cross-origin mutation and oversized JSON before session handling', async t => {
  const app = createCityServer();
  const server = app.server;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = (route, body, headers = {}) => fetch(base + route, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', ...headers},
    body
  });

  const forbidden = await post('/api/city/action', '{}', {Origin: 'https://untrusted.example'});
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.headers.get('access-control-allow-origin'), null);
  assert.equal(forbidden.headers.get('cache-control'), 'no-store');

  const oversized = await post('/api/city/action', JSON.stringify({payload: 'x'.repeat(5000)}));
  assert.equal(oversized.status, 413);
  assert.match((await oversized.json()).error, /large/i);

  const malformed = await post('/api/city/action', '{bad');
  assert.equal(malformed.status, 400);

  const array = await post('/api/city/action', '[]');
  assert.equal(array.status, 400);

  const wrongType = await fetch(base + '/api/city/action', {
    method: 'POST',
    headers: {'Content-Type': 'text/plain'},
    body: '{}'
  });
  assert.equal(wrongType.status, 415);

  const unauthenticated = await post('/api/city/action', '{}');
  assert.ok([401, 403].includes(unauthenticated.status),
    'client actions must not be accepted without a valid session');
});
