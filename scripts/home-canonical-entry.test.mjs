import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const anchors = [...homepage.matchAll(/<a\b[^>]*>/g)].map(([tag]) => tag);
const href = (tag) => tag.match(/\bhref="([^"]+)"/)?.[1] ?? '';

test('homepage has one prominent canonical first-person Play action', () => {
  const primary = anchors.filter((tag) => /\bgame-direct-play\b/.test(tag));
  assert.equal(primary.length, 1, 'one primary Play action is required');
  assert.equal(href(primary[0]), 'city.html?terrain=1',
    'primary Play must use the shared first-person entry during migration');
  assert.doesNotMatch(primary[0], /(?:wallet|login|connect|token)/i,
    'offline Solo Play must not require wallet authentication');
});

test('all first-person homepage game links preserve the same terrain entry', () => {
  const firstPerson = anchors.filter((tag) =>
    /(?:Meme City|FIRST PERSON|first person|Low graphics)/i.test(tag) &&
    href(tag).startsWith('city.html?'));
  assert.ok(firstPerson.length >= 3, 'navigation, primary Play and detail entry must remain visible');
  for (const tag of firstPerson) {
    assert.match(href(tag), /^city\.html\?terrain=1(?:&amp;render=canvas)?$/,
      'homepage first-person links must share the canonical terrain world');
  }
});

test('legacy Solo entry remains recoverable until validated migration', () => {
  assert.match(homepage, /href="city\.html\?release=center-city-v1"/,
    'do not retire original Solo before save migration and gameplay parity');
});

test('compatibility rendering remains an adaptation of the same terrain entry', () => {
  assert.match(homepage, /href="city\.html\?terrain=1&amp;render=canvas"/,
    'compatibility path must retain the canonical terrain flag');
});
