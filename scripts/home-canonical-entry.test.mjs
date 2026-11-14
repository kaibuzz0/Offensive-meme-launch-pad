import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('homepage has one prominent canonical first-person Play action', () => {
  const primary = [...homepage.matchAll(/<a\b[^>]*class="[^"]*\bgame-direct-play\b[^"]*"[^>]*>/g)];
  assert.equal(primary.length, 1, 'one primary Play action is required');
  assert.match(primary[0][0], /href="city\.html\?terrain=1"/,
    'primary Play must use the shared first-person entry during migration');
  assert.doesNotMatch(primary[0][0], /(?:wallet|login|connect|token)/i,
    'offline Solo Play must not require wallet authentication');
});

test('legacy Solo entry remains recoverable until validated migration', () => {
  assert.match(homepage, /href="city\.html\?release=center-city-v1"/,
    'do not retire original Solo before save migration and gameplay parity');
});

test('compatibility rendering remains an adaptation of the same terrain entry', () => {
  assert.match(homepage, /href="city\.html\?terrain=1&amp;render=canvas"/,
    'compatibility path must retain the canonical terrain flag');
});
