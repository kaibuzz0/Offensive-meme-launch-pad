import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const homepage = readFileSync(resolve(root, 'index.html'), 'utf8');

test('homepage primary Play enters the existing first-person game without a separate edition', () => {
  const anchor = homepage.match(/<a\b(?=[^>]*\bclass="[^"]*\bgame-direct-play\b[^"]*")[^>]*>/i);
  assert.ok(anchor, 'Missing prominent homepage game-direct-play anchor');
  const href = anchor[0].match(/\bhref="([^"]+)"/i)?.[1]?.replaceAll('&amp;', '&');
  assert.ok(href, 'Primary Play must have a direct href');
  const url = new URL(href, 'https://example.invalid/Offensive-meme-launch-pad/');
  assert.equal(url.origin, 'https://example.invalid', 'Play must remain same-origin');
  assert.equal(url.pathname, '/Offensive-meme-launch-pad/city.html', 'Play must target the current first-person game');
  assert.equal(url.searchParams.get('terrain'), '1', 'Preserve the transitional terrain entry until migration is verified');
  assert.equal(url.searchParams.has('render'), false, 'Primary Play must auto-select its renderer');
  assert.equal(url.searchParams.has('release'), false, 'Primary Play must not select a legacy edition');
  assert.ok(existsSync(resolve(root, 'city.html')), 'Play destination must exist in the published source');
});

test('legacy homepage routes remain recoverable until save migration and parity are verified', () => {
  assert.match(homepage, /city\.html\?release=center-city-v1/, 'Keep original Solo route during migration');
  assert.match(homepage, /city\.html\?terrain=1&amp;render=canvas/, 'Keep explicit compatibility route during migration');
});
