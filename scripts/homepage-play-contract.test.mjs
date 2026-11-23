import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const homepage = readFileSync(resolve(root, 'index.html'), 'utf8');
const canonical = 'city.html?terrain=1';

test('homepage primary Play leads to an existing first-person entry', () => {
  const matches = [...homepage.matchAll(/<a\b[^>]*class="[^"]*\bgame-direct-play\b[^"]*"[^>]*>/gi)];
  assert.equal(matches.length, 1, 'Exactly one primary homepage Play link is required');
  const href = matches[0][0].match(/\bhref="([^"]+)"/i)?.[1];
  assert.equal(href, canonical, 'Primary Play must preserve the currently documented first-person route');
  assert.ok(existsSync(resolve(root, href.split('?')[0])), 'Primary Play target must exist');
});

test('primary Play is not gated by wallet or token purchase in homepage markup', () => {
  const play = homepage.match(/<a\b[^>]*\bgame-direct-play\b[^>]*>/i)?.[0] ?? '';
  assert.ok(play, 'Primary Play control missing');
  assert.doesNotMatch(play, /data-(?:wallet|token|purchase|connect)|onclick=/i);
  assert.match(play, /href="city\.html\?terrain=1"/);
});
