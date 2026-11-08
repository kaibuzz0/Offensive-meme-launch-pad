import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const game = readFileSync(new URL('../city.html', import.meta.url), 'utf8');

test('homepage primary Play uses the shared first-person terrain entry', () => {
  const matches = [...homepage.matchAll(/<a\b[^>]*class="[^"]*\bgame-direct-play\b[^"]*"[^>]*>/g)];
  assert.equal(matches.length, 1, 'homepage must expose exactly one primary game Play link');
  assert.match(matches[0][0], /href="city\.html\?terrain=1"/);
});

test('canonical entry loads the same first-person world and player controller', () => {
  for (const script of ['city-voxel-world.js', 'city-voxel-renderer.js', 'city-voxel-physics.js', 'city-terrain-mode.js']) {
    assert.ok(game.includes('src="' + script + '?'), 'missing canonical runtime script: ' + script);
  }
  assert.match(game, /id="city-canvas"/);
});

test('primary Play is a normal link without wallet or mode selection', () => {
  const link = homepage.match(/<a\b[^>]*\bgame-direct-play\b[^>]*>/)?.[0];
  assert.ok(link);
  assert.doesNotMatch(link, /onclick=|data-wallet|target=/i);
  assert.match(homepage, /No token purchase is needed to play\./);
});
