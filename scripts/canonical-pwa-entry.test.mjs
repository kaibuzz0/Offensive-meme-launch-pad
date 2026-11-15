import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');
const home = read('index.html');
const manifest = JSON.parse(read('manifest.webmanifest'));

test('primary homepage Play and installed PWA shortcut share one first-person entry', () => {
  const primary = home.match(/<a\b[^>]*class="[^"]*game-direct-play[^"]*"[^>]*href="([^"]+)"/);
  assert.ok(primary, 'Homepage must expose a primary Play link');
  const play = new URL(primary[1].replaceAll('&amp;', '&'), 'https://example.invalid/');
  const shortcut = manifest.shortcuts?.find(item => item.name === 'Play Meme City');
  assert.ok(shortcut, 'Installed PWA must expose the game shortcut');
  const installed = new URL(shortcut.url, 'https://example.invalid/');
  assert.equal(play.pathname, '/city.html');
  assert.equal(installed.pathname, play.pathname, 'PWA and homepage must load the same game document');
  assert.equal(play.searchParams.get('terrain'), '1', 'Canonical first-person world must remain the public Play target during migration');
  assert.equal(installed.searchParams.get('terrain'), play.searchParams.get('terrain'));
  assert.equal(installed.searchParams.get('release'), null, 'Installed shortcut must not select a separate legacy edition');
  assert.equal(installed.searchParams.get('render'), null, 'Installed shortcut must not force a different renderer');
});

test('legacy URLs remain recoverable until migration and renderer parity are proven', () => {
  assert.match(home, /city\.html\?release=center-city-v1/, 'Original Solo link must remain reachable during migration');
  assert.match(home, /city\.html\?terrain=1&amp;render=canvas/, 'Compatibility link must remain reachable during parity testing');
});
