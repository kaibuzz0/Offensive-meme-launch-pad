import test from 'node:test';
import assert from 'node:assert/strict';
import {createCityServer} from '../server/city-server.mjs';

// Unlike the lightweight createRooms fixture, this runs the production Engine
// through the real HTTP router. It does not require a wallet or network service.
test('real engine keeps authenticated private-room state isolated from forged selectors and replayed inputs', async t => {
  const {server} = createCityServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}/api/city`;
  const post = (route, body, token) => fetch(base + route, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', ...(token ? {Authorization: 'Bearer ' + token} : {})},
    body: JSON.stringify(body)
  });
  const state = async token => {
    const response = await fetch(base + '/state', {headers: {Authorization: 'Bearer ' + token}});
    assert.equal(response.status, 200);
    return response.json();
  };
  const aResponse = await post('/join', {layoutVersion: 2, create: true, name: 'Alice', avatar: 'offensive'});
  const bResponse = await post('/join', {layoutVersion: 2, create: true, name: 'Bob', avatar: 'offensive'});
  assert.equal(aResponse.status, 201);
  assert.equal(bResponse.status, 201);
  const a = await aResponse.json(), b = await bResponse.json();
  assert.notEqual(a.state.roomInfo.code, b.state.roomInfo.code);
  assert.equal(a.state.players.length, 1);
  assert.equal(b.state.players.length, 1);
  const beforeB = await state(b.session);
  const foreign = {room: b.state.roomInfo.code, playerId: b.state.self.id};
  for (const payload of [
    {type: 'setCredits', credits: 1000000, ...foreign},
    {type: 'repairDefense', amount: 1000000, ...foreign},
    {type: 'grant-reward', amount: 1000000, ...foreign}
  ]) {
    assert.equal((await post('/action', payload, a.session)).status, 400);
  }
  assert.equal((await post('/input', {x: 0.5, y: 0, seq: 7, ...foreign}, a.session)).status, 200);
  // A duplicate sequence must be accepted as an idempotent no-op.
  assert.equal((await post('/input', {x: 1, y: 1, seq: 7, ...foreign}, a.session)).status, 200);
  const afterB = await state(b.session);
  assert.deepEqual(afterB.self, beforeB.self, 'foreign room player must not change');
  assert.deepEqual(afterB.players, beforeB.players, 'foreign room roster must not change');
  assert.equal(afterB.roomInfo.code, beforeB.roomInfo.code);
  assert.equal((await post('/leave', {}, a.session)).status, 200);
  assert.equal((await fetch(base + '/state', {headers: {Authorization: 'Bearer ' + a.session}})).status, 401);
  assert.equal((await state(b.session)).players.length, 1, 'leaving room A must not evict room B');
});
