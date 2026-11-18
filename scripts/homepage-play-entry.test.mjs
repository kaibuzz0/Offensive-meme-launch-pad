import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('homepage primary Play link resolves to the seeded first-person entry', t => {
  const html = readFileSync(resolve(root, 'index.html'), 'utf8');
  const primary = [...html.matchAll(/<a\b([^>]*\bclass=["'][^"']*\bgame-direct-play\b[^"']*["'][^>]*)>/gi)];
  assert.equal(primary.length, 1, 'homepage must expose exactly one primary Play anchor');
  const href = primary[0][1].match(/\bhref=["']([^"']+)["']/i)?.[1];
  assert.ok(href, 'primary Play link must have an href');
  const url = new URL(href.replaceAll('&amp;', '&'), 'https://example.test/game/');
  assert.equal(url.origin, 'https://example.test');
  assert.equal(url.pathname, '/game/city.html', 'primary Play must enter canonical game HTML');
  assert.equal(url.searchParams.get('terrain'), '1', 'primary Play must enter first-person seeded world');
  assert.ok(existsSync(resolve(root, 'city.html')), 'primary game HTML must exist');
  const alternate = [...html.matchAll(/href=["']([^"']*city\.html[^"']*)["']/gi)]
    .map(m => m[1]).filter(link => link !== href);
  t.diagnostic(alternate.length + ' additional game entry links remain; migrate only after save and renderer parity verification');
});
