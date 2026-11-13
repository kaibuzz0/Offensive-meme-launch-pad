import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const city = readFileSync(new URL('../city.html', import.meta.url), 'utf8');

test('homepage primary Play enters the existing canonical first-person route', () => {
  const gameCard = home.match(/<article class="home-portal game-portal">([\s\S]*?)<\/article>/)?.[1];
  assert.ok(gameCard, 'Meme City game card must exist');
  assert.match(gameCard, /<a\s+class="button primary game-direct-play"\s+href="city\.html\?terrain=1"/);
  assert.match(home, /<a\s+class="nav-cta"|href="city\.html\?terrain=1"/);
});

test('wallet-free offline Solo and legacy recovery links remain reachable during migration', () => {
  assert.match(home, /href="city\.html\?terrain=1&amp;render=canvas"/);
  assert.match(home, /href="city\.html\?release=center-city-v1"/);
  assert.match(home, /No wallet required/);
  assert.match(city, /id="start-button"/);
  assert.match(city, /href="city\.html\?terrain=1"/);
});

test('homepage does not advertise unshipped workbench construction as live', () => {
  const gameCard = home.match(/<article class="home-portal game-portal">([\s\S]*?)<\/article>/)?.[1];
  assert.ok(gameCard);
  const visibleHeading = gameCard.split('<details')[0];
  assert.doesNotMatch(visibleHeading, /workbench|craft a torch|build a shelter/i);
});
