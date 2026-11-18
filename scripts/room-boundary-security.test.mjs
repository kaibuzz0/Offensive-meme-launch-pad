import test from 'node:test';
import assert from 'node:assert/strict';
import {createRooms, RoomError} from '../server/city-rooms.mjs';

class FakeEngine {
  static LAYOUT_VERSION = 1;
  static CAPABILITIES = {online: {actions: ['pickup']}};
  constructor() { this.players = new Map(); this.calls = []; }
  join(id, name, avatar) { this.players.set(id, {name, avatar}); }
  leave(id) { this.players.delete(id); }
  snapshot(id) { return {playerId: id, calls: [...this.calls]}; }
  input(id, x, y) { this.calls.push({kind: 'input', id, x, y}); }
  trigger() {}
  action(id, body) { this.calls.push({kind: 'action', id, type: body.type}); return 'ok'; }
  tick() {}
}

test('authenticated actions remain in their own private room and never accept client room selectors', () => {
  let clock = 1000;
  const rooms = createRooms(FakeEngine, {now: () => clock});
  const a = rooms.join({layoutVersion: 1, create: true, name: 'A'}, 'ip-a');
  const b = rooms.join({layoutVersion: 1, create: true, name: 'B'}, 'ip-b');
  const tokenA = a.session, tokenB = b.session;
  const sessionA = rooms.auth(tokenA), sessionB = rooms.auth(tokenB);
  assert.notEqual(sessionA.room, sessionB.room);
  rooms.action(sessionA, {type: 'pickup', room: sessionB.room, playerId: sessionB.id});
  const stateA = rooms.snapshot(sessionA), stateB = rooms.snapshot(sessionB);
  assert.equal(stateA.calls.length, 1);
  assert.equal(stateA.calls[0].id, sessionA.id);
  assert.equal(stateB.calls.length, 0);
  assert.throws(() => rooms.auth('invalid'), e => e instanceof RoomError && e.status === 401);
  rooms.leave(tokenA);
  assert.throws(() => rooms.auth(tokenA), e => e.status === 401);
  assert.equal(rooms.snapshot(rooms.auth(tokenB)).playerId, sessionB.id);
});

test('invalid movement and unauthorized action types fail before reaching the engine', () => {
  const rooms = createRooms(FakeEngine, {now: () => 1000});
  const {session: token} = rooms.join({layoutVersion: 1}, 'ip-a');
  const session = rooms.auth(token);
  for (const body of [{x: Infinity, y: 0}, {x: 2, y: 0}, {x: 0, y: 0, seq: -1}, {x: 0, y: 0, aimX: NaN}]) {
    assert.throws(() => rooms.input(session, body), RoomError);
  }
  assert.throws(() => rooms.action(session, {type: 'grant-reward', amount: 99999}), RoomError);
  assert.equal(rooms.snapshot(session).calls.length, 0);
  rooms.input(session, {x: 0.5, y: 0, seq: 1});
  rooms.input(session, {x: 1, y: 1, seq: 1});
  assert.equal(rooms.snapshot(session).calls.filter(c => c.kind === 'input').length, 1, 'replayed sequence must not move player twice');
});

test('expired room tokens cannot be used to mutate game state', () => {
  let clock = 1000;
  const rooms = createRooms(FakeEngine, {now: () => clock, sessionTTL: 2000});
  const {session: token} = rooms.join({layoutVersion: 1}, 'ip-a');
  rooms.auth(token);
  clock += 2001;
  assert.throws(() => rooms.auth(token), e => e instanceof RoomError && e.status === 401);
  assert.equal(rooms.health().players, 0);
});
