import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Guard the canonical first-person loop against accidental reintroduction of
// independent, collision-free movement paths. These are source-contract tests;
// browser traversal and physical Android acceptance remain separate gates.
const source = readFileSync(new URL('../city-terrain-mode.js', import.meta.url), 'utf8');
const frame = source.slice(source.indexOf(' function frame(t){'), source.indexOf(" $('#pause-toggle').addEventListener"));
assert.ok(frame.startsWith(' function frame(t){'), 'first-person frame loop must exist');

test('movement remains owned by the shared physics controller', () => {
  assert.match(frame, /physics\.tick\(input,PHYSICS_STEP\)/);
  assert.match(frame, /const position=physics\.snapshot\(\)/);
  assert.match(frame, /player\.x=position\.x;player\.y=position\.z;/);
  assert.doesNotMatch(frame, /player\.[xy]\s*\+=\s*move\./,
    'no uncollided movement may be added in atlas or fallback branches');
  assert.doesNotMatch(frame, /player\.[xy]\s*=\s*player\.[xy]\s*\+\s*move\./);
});

test('fixed-step catch-up is bounded and physics failure fails closed', () => {
  assert.match(source, /PHYSICS_STEP=1\/60,MAX_PHYSICS_STEPS=4/);
  assert.match(frame, /Math\.min\(allowedPhysicsSeconds,pendingPhysicsSeconds\)/);
  assert.match(frame, /steps<MAX_PHYSICS_STEPS/);
  assert.match(frame, /physicsAccumulator=0;\s*status\.dataset\.physicsSteps='0';\s*status\.dataset\.physicsActiveBodies='0'/);
  assert.match(frame, /status\.dataset\.physicsUnavailable='true'/);
});

test('atlas is read-only and pause clears simulation debt', () => {
  assert.match(frame, /Atlas is a view of the same world, not a collision-free movement mode/);
  assert.match(frame, /physicsAccumulator=0;status\.dataset\.physicsSteps='0'/);
  assert.match(source, /visibilitychange[^\n]*physicsAccumulator=0/);
  assert.match(source, /start\.addEventListener\('click'[^\n]*physicsAccumulator=0/);
});
