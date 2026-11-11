import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Guard against a passing feature-branch browser test replacing and silently
// dropping the other branch's mobile controls or fallback acceptance coverage.
const smoke = readFileSync(new URL('./city-terrain-browser-smoke.mjs', import.meta.url), 'utf8');

test('mobile landscape dual-stick gameplay acceptance remains present', () => {
  for (const evidence of [
    'right thumbstick rotates actual first-person camera',
    'right thumbstick must recenter after release',
    'left movement joystick must respond independently',
    'right look joystick must respond independently',
  ]) assert.ok(smoke.includes(evidence), 'missing browser acceptance: ' + evidence);
});

test('Canvas2D fallback retains visible world and saved progress checks', () => {
  for (const evidence of [
    'first-person rendering with WebGL unavailable',
    'compatibility renderer must paint actual scene pixels',
    'roadside supplies persist across reload',
    'reload terrain mode',
  ]) assert.ok(smoke.includes(evidence), 'missing browser acceptance: ' + evidence);
});
