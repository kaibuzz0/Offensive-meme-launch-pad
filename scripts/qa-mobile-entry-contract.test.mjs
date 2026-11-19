import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../city.html', import.meta.url), 'utf8');
const terrain = readFileSync(new URL('../city-terrain-mode.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../city.css', import.meta.url), 'utf8');

test('canonical first-person entry includes mobile viewport and gameplay canvas', () => {
  assert.match(html, /<meta\s+name="viewport"[^>]*width=device-width/);
  assert.match(html, /<canvas\s+id="city-canvas"/);
  assert.match(html, /city-terrain-mode\.js\?[^"]+"\s+defer/);
});

test('terrain controller retains mobile look and movement input implementations', () => {
  // Static contract only: browser acceptance must still prove that both
  // controls are visible, usable and mapped to the same simulation.
  assert.match(terrain, /(?:look|camera)/i);
  assert.match(terrain, /(?:joystick|pointer|touch)/i);
  assert.match(terrain, /(?:move|movement)/i);
});

test('mobile layout rules are present without depending on a wallet', () => {
  assert.match(css, /@media/i);
  assert.match(html, /SOLO\s*\/\s*LOCAL SAVE/);
  assert.match(html, /id="interact"/);
});
