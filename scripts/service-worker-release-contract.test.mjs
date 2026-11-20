import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('../sw.js', import.meta.url)), 'utf8');

test('service worker restricts interception to same-origin GET', () => {
  assert.match(source, /request\.method\s*!==\s*['"]GET['"]/);
  assert.match(source, /url\.origin\s*!==\s*self\.location\.origin/);
});

test('service worker does not cache arbitrary API or wallet requests', () => {
  // Existing shell cache is an explicit allowlist; a future game cache must
  // retain this boundary instead of caching every successful GET response.
  assert.match(source, /urls\.includes\(url\.href\)/);
  assert.match(source, /event\.respondWith\(caches\.match\(request\)/);
});

test('offline navigation falls back to a same-scope document', () => {
  assert.match(source, /request\.mode\s*===\s*['"]navigate['"]/);
  assert.match(source, /new URL\(['"]offline\.html['"],\s*self\.registration\.scope\)/);
});

test.todo('homepage Play opens wallet-free Solo after offline reload with cached game dependencies');
test.todo('saved pickup and player position survive offline reload on mobile Chromium');
test.todo('accelerated and compatibility renderers retain identical collision and interactions');
