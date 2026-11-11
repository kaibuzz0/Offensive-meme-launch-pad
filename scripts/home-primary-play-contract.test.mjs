import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Release gate: public Play must keep targeting the existing first-person world.
// Compatibility and legacy recovery links are allowed until save migration is proven.
const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const game = readFileSync(new URL('../city.html', import.meta.url), 'utf8');

test('homepage primary Play and main navigation share the canonical first-person entry', () => {
  const nav = homepage.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/i)?.[0];
  const play = homepage.match(/<a\b[^>]*class="[^"]*game-direct-play[^"]*"[^>]*>/i)?.[0];
  assert.ok(nav, 'main navigation missing');
  assert.ok(play, 'primary Play link missing');
  assert.match(nav, /href="city\.html\?terrain=1"/);
  assert.match(play, /href="city\.html\?terrain=1"/);
  assert.ok(game.length > 0, 'canonical game document missing');
});

test('homepage does not label a compatibility renderer as the primary Play link', () => {
  const play = homepage.match(/<a\b[^>]*class="[^"]*game-direct-play[^"]*"[^>]*>/i)?.[0];
  assert.ok(play);
  assert.doesNotMatch(play, /(?:render=canvas|release=center-city-v1|low|legacy)/i);
});

test('homepage preserves wallet-free Solo messaging during consolidation', () => {
  assert.match(homepage, /No token purchase is needed to play\./i);
});
