import test from 'node:test';
import assert from 'node:assert/strict';
import {createCityServer} from '../server/city-server.mjs';

// Wallet proof endpoints must not become an unlimited unauthenticated request
// source. The fake clock makes the minute-window boundary deterministic.
test('solo wallet challenge throttles unauthenticated requests and recovers after window', async t => {
  let clock = 1_000_000;
  const {server} = createCityServer({now: () => clock});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const endpoint = `http://127.0.0.1:${server.address().port}/api/city/solo-wallet/challenge`;
  const challenge = () => fetch(endpoint, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({address: 'invalid-wallet-address'})
  });
  for (let i = 0; i < 8; i++) {
    const response = await challenge();
    assert.notEqual(response.status, 429, `attempt ${i + 1} must not be rate-limited`);
    await response.arrayBuffer();
  }
  const blocked = await challenge();
  assert.equal(blocked.status, 429, 'ninth attempt in a minute must be blocked');
  assert.match((await blocked.json()).error, /too many/i);
  clock += 60_000;
  const recovered = await challenge();
  assert.notEqual(recovered.status, 429, 'window expiry must restore access');
  await recovered.arrayBuffer();
});
