import test from 'node:test';
import assert from 'node:assert/strict';
import {createCityServer} from '../server/city-server.mjs';

// HTTP boundary coverage: requests must never reach multiplayer state mutation
// without a valid room session, even when sent from the same origin.
test('multiplayer mutation endpoints reject unauthenticated requests', async (t) => {
  const {server} = createCityServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const endpoint of ['/api/city/input', '/api/city/action']) {
    const response = await fetch(base + endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({playerId: 'other-player', room: 'default', action: 'grant', amount: 999999})
    });
    assert.equal(response.ok, false, `${endpoint} must require a room session`);
    assert.notEqual(response.status, 500, `${endpoint} must fail safely`);
  }
});

test('cross-origin multiplayer mutations are denied before authentication', async (t) => {
  const {server} = createCityServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(base + '/api/city/action', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Origin: 'https://untrusted.example'},
    body: '{}'
  });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test('oversized multiplayer JSON is rejected before session lookup', async (t) => {
  const {server} = createCityServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(base + '/api/city/action', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({payload: 'x'.repeat(5000)})
  });
  assert.equal(response.status, 413);
});
