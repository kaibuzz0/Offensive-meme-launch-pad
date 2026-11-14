import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createCityServer} from '../server/city-server.mjs';

// Exercise real HTTP routing: browser-side validation alone cannot protect rooms.
test('room API rejects hostile origins, malformed bodies and unauthenticated mutations', async (t) => {
  const {server} = createCityServer({origins: []});
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve())); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = (route, body, headers = {}) => fetch(base + '/api/city' + route, {
    method: 'POST', headers: {'Content-Type': 'application/json', ...headers}, body
  });

  const health = await fetch(base + '/api/city/health');
  assert.equal(health.status, 200, 'read-only health must remain reachable without wallet');

  const forbidden = await post('/action', '{}', {Origin: 'https://untrusted.example'});
  assert.equal(forbidden.status, 403, 'hostile browser origin cannot mutate a room');
  assert.equal(forbidden.headers.get('access-control-allow-origin'), null);

  const malformed = await post('/action', '{');
  assert.equal(malformed.status, 400, 'malformed JSON must be rejected');

  const oversized = await post('/action', JSON.stringify({payload: 'x'.repeat(5000)}));
  assert.equal(oversized.status, 413, 'oversized action must be bounded');

  const missingAuth = await post('/action', JSON.stringify({type: 'collect', amount: 999999}));
  assert.ok([400, 401, 403].includes(missingAuth.status), 'unauthenticated mutation must fail');

  const invalidContentType = await fetch(base + '/api/city/action', {
    method: 'POST', headers: {'Content-Type': 'text/plain'}, body: '{}'
  });
  assert.equal(invalidContentType.status, 415);

  const noAuthState = await fetch(base + '/api/city/state');
  assert.ok([400, 401, 403].includes(noAuthState.status), 'room state requires authentication');
});
