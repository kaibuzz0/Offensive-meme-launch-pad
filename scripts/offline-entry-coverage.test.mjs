import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Release gate: the offline worker must recognize the actual static assets
// reached from both public entry documents, not just a handpicked fixture.
const root = resolve(import.meta.dirname, '..');
const worker = readFileSync(resolve(root, 'sw.js'), 'utf8');
const declaration = worker.match(/const GAME_FILES=(\/[^\n]+\/);/);
assert.ok(declaration, 'service worker must declare its game-file allowlist');
const literal = declaration[1];
const lastSlash = literal.lastIndexOf('/');
const allowlist = new RegExp(literal.slice(1, lastSlash), literal.slice(lastSlash + 1));

for (const entry of ['index.html', 'city.html']) {
  test(`offline allowlist covers every local static dependency in ${entry}`, () => {
    const html = readFileSync(resolve(root, entry), 'utf8');
    const dependencies = [...html.matchAll(/(?:src|href)\s*=\s*["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)]
      .map((match) => match[1].split('?')[0])
      .filter((path) => !/^(?:https?:)?\/\//i.test(path));
    assert.ok(dependencies.length > 0, 'entry must expose dependencies');
    for (const path of dependencies) {
      assert.ok(!path.includes('..'), `unexpected relative traversal: ${path}`);
      assert.ok(existsSync(resolve(root, path)), `missing entry asset: ${path}`);
      assert.ok(allowlist.test(path), `not available for offline caching: ${path}`);
    }
  });
}
