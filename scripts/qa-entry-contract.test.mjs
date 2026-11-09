import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = name => readFileSync(resolve(root, name), 'utf8');

// Static contract only: this is NOT a substitute for browser pixel/render,
// physical Android, offline reload, or interaction acceptance.
test('homepage exposes the first-person Play route and keeps recoverable Solo', () => {
  const home = read('index.html');
  const city = read('city.html');
  assert.match(home, /href=["']city\.html\?terrain=1["']/,
    'Homepage must link to the canonical first-person entry');
  assert.match(home, /href=["']city\.html\?release=center-city-v1["']/,
    'Keep original Solo reachable until validated save migration');
  assert.match(city, /city-terrain-mode\.js/,
    'First-person entry must load the terrain runtime');
});

test('public entry does not accidentally require a wallet for offline Solo', () => {
  const home = read('index.html');
  assert.match(home, /city\.html\?terrain=1/);
  assert.match(home, /city\.html\?release=center-city-v1/);
  // Presence of wallet integration is allowed; wallet-free game access is
  // validated by the browser smoke, not inferred from this static check.
});

test('server and client networking code exist for authority review', () => {
  const server = read('server/city-server.mjs');
  const client = read('city-network.js');
  assert.ok(server.length > 0 && client.length > 0);
  // Deliberately do not assert server authority based on file existence.
});
