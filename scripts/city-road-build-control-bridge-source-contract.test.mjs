import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Guard against escaped newline text accidentally swallowing the status
// callback inside a JavaScript line comment.
test('construction control bridge executes saved/render-pending feedback', () => {
  const source = readFileSync(new URL('../city-road-build-control-bridge.js', import.meta.url), 'utf8');
  assert.match(source, /^\s*const sceneReady = interaction\.sceneReady === true;/m);
  assert.match(source, /^\s*status\(sceneReady \? 'saved' : 'render-pending',/m);
  assert.doesNotMatch(source, /\/\/[^\r\n]*\\n[^\r\n]*const sceneReady/);
});
