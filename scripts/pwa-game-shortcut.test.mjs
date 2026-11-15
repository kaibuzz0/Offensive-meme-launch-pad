import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('installed Meme City shortcut uses the homepage first-person world', () => {
  const shortcut = manifest.shortcuts.find(item => item.name === 'Play Meme City');
  assert.ok(shortcut, 'PWA must expose its game shortcut');
  const url = new URL(shortcut.url, 'https://example.test/Offensive-meme-launch-pad/');
  assert.equal(url.pathname, '/Offensive-meme-launch-pad/city.html');
  assert.equal(url.searchParams.get('terrain'), '1');
  assert.equal(url.searchParams.get('from'), 'installed');
  assert.equal(url.searchParams.has('release'), false);
  assert.equal(url.searchParams.has('render'), false);
  assert.match(homepage, /class="button primary game-direct-play" href="city\.html\?terrain=1"/);
});
