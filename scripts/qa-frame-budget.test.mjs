import test from 'node:test';
import assert from 'node:assert/strict';
import { percentile, summarize } from './qa-frame-budget.mjs';

test('percentiles interpolate deterministically without mutating input', () => {
  const samples = [40, 10, 30, 20];
  assert.equal(percentile(samples, 0.5), 25);
  assert.equal(percentile(samples, 0.95), 38.5);
  assert.deepEqual(samples, [40, 10, 30, 20]);
  assert.equal(percentile([], 0.95), null);
});
test('budget is labelled provisional and device evidence cannot be inferred', () => {
  const report = summarize([{ frameMs: 16, deviceClass: 'emulated-mobile', interactionStallMs: 30 }]);
  assert.equal(report.budgetResult, 'within-provisional-budget');
  assert.deepEqual(report.deviceClasses, ['emulated-mobile']);
  assert.equal(report.maxInteractionStallMs, 30);
});
test('bad samples cannot silently improve percentiles', () => {
  const report = summarize([
    { frameMs: 16, deviceClass: 'desktop' },
    { frameMs: 100, deviceClass: 'desktop', interactionStallMs: 250 },
    { frameMs: -1, deviceClass: 'physical-android' },
    { frameMs: 16, deviceClass: 'unknown' }
  ]);
  assert.equal(report.invalid, 2);
  assert.equal(report.samples, 2);
  assert.equal(report.budgetResult, 'incomplete-evidence');
  assert.deepEqual(report.deviceClasses, ['desktop']);
});
test('empty input explicitly reports no evidence', () => {
  assert.equal(summarize([]).budgetResult, 'no-evidence');
});

test('missing interaction timing cannot silently pass', () => {
  const report = summarize([{ frameMs: 16, deviceClass: 'desktop' }]);
  assert.equal(report.interactionSamples, 0);
  assert.equal(report.budgetResult, 'incomplete-evidence');
});
test('mixed device classes cannot mask a slow device', () => {
  const report = summarize([
    { frameMs: 16, deviceClass: 'desktop', interactionStallMs: 10 },
    { frameMs: 16, deviceClass: 'physical-android', interactionStallMs: 10 }
  ]);
  assert.equal(report.budgetResult, 'incomplete-evidence');
});
test('complete slow frames fail their provisional budget', () => {
  const report = summarize([{ frameMs: 40, deviceClass: 'desktop', interactionStallMs: 250 }]);
  assert.equal(report.budgetResult, 'exceeds-provisional-budget');
});


test('long sessions do not overflow the argument stack when summarizing stalls', () => {
  const records = Array.from({ length: 150000 }, () => ({
    frameMs: 16.7, deviceClass: 'physical-android', interactionStallMs: 12
  }));
  const report = summarize(records);
  assert.equal(report.samples, 150000);
  assert.equal(report.maxInteractionStallMs, 12);
  assert.equal(report.budgetResult, 'within-provisional-budget');
});
