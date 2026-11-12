// Detect duplicate eager downloads on the public homepage without a browser dependency.
// This is a source-level preflight, not a substitute for CDP network measurements.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const attrs = (tag) => Object.fromEntries(
  [...tag.matchAll(/([\w-]+)\s*=\s*["']([^"']*)["']/g)]
    .map(([, key, value]) => [key.toLowerCase(), value])
);
const local = (value) => value && !/^(?:https?:|data:|blob:|\/\/|#)/i.test(value);
const normalize = (value) => new URL(value, 'https://example.invalid/').pathname;

test('homepage does not eagerly load the same local script or stylesheet twice', () => {
  const resources = [
    ...[...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["'][^"']+["'][^>]*>/gi)]
      .map(([tag]) => ({ kind: 'script', value: attrs(tag).src })),
    ...[...html.matchAll(/<link\b[^>]*>/gi)]
      .map(([tag]) => attrs(tag))
      .filter((a) => /stylesheet/i.test(a.rel || ''))
      .map((a) => ({ kind: 'style', value: a.href }))
  ].filter(({ value }) => local(value));
  const seen = new Map();
  for (const resource of resources) {
    const key = resource.kind + ':' + normalize(resource.value);
    assert.equal(seen.has(key), false,
      'Duplicate homepage asset (even if cache-busting query differs): ' + key);
    seen.set(key, resource.value);
  }
  assert.ok(seen.size > 0, 'Homepage asset discovery must not silently become empty');
});

test('homepage primary Play remains a single wallet-free canonical link', () => {
  const play = [...html.matchAll(/<a\b[^>]*>/gi)]
    .map(([tag]) => attrs(tag))
    .filter((a) => (a.class || '').split(/\s+/).includes('game-direct-play'));
  assert.equal(play.length, 1, 'Exactly one primary homepage Play entry');
  assert.equal(play[0].href, 'city.html?terrain=1',
    'Do not change the primary entry without migration and browser acceptance');
  assert.doesNotMatch(play[0].href, /wallet|token|login/i);
});
