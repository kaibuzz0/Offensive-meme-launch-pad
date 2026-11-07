import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('both homepage Play calls enter the canonical first-person route', () => {
  assert.match(homepage, /class="button primary game-direct-play" href="city\.html\?terrain=1"/);
  assert.match(homepage, /class="button primary" href="city\.html\?terrain=1">Explore Meme City in first person/);
});

test('original offline Solo remains explicitly accessible', () => {
  const links = homepage.match(/href="city\.html\?release=center-city-v1"/g) ?? [];
  assert.ok(links.length >= 2, 'both collapsed and expanded portals expose Solo');
});

test('expanded game portal does not silently launch legacy mode', () => {
  assert.doesNotMatch(homepage, /class="button primary" href="city\.html">Play Meme City/);
});
