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
  const report = summarize(Array.from({ length: 120 }, () => ({ frameMs: 16, deviceClass: 'emulated-mobile', interactionStallMs: 30 })));
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
  const report = summarize(Array.from({ length: 120 }, () => ({ frameMs: 40, deviceClass: 'desktop', interactionStallMs: 250 })));
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

test('interaction stall alone fails even when frames meet budget', () => {
  const report = summarize(Array.from({ length: 120 }, (_, i) => ({
    frameMs: 16.7, deviceClass: 'physical-android', interactionStallMs: i === 119 ? 201 : 0
  })));
  assert.equal(report.frameMs.p95, 16.7);
  assert.equal(report.maxInteractionStallMs, 201);
  assert.equal(report.budgetResult, 'exceeds-provisional-budget');
});
test('negative or nonfinite interaction timings cannot yield a pass', () => {
  for (const interactionStallMs of [-1, Number.POSITIVE_INFINITY, Number.NaN]) {
    const report = summarize([{ frameMs: 16.7, deviceClass: 'desktop', interactionStallMs }]);
    assert.equal(report.budgetResult, 'incomplete-evidence');
  }
});

test('short recordings cannot claim a representative percentile pass', () => {
  const sample = { frameMs: 16.7, deviceClass: 'physical-android', interactionStallMs: 0 };
  const short = summarize(Array.from({ length: 119 }, () => sample));
  assert.equal(short.budgetResult, 'incomplete-evidence');
  assert.equal(short.provisionalBudgets.minimumFrameSamples, 120);
  const sufficient = summarize(Array.from({ length: 120 }, () => sample));
  assert.equal(sufficient.budgetResult, 'within-provisional-budget');
});

test('summarize sorts owned frame values without mutating source records', () => {
  const records = [40, 10, 30, 20];
  const samples = Array.from({ length: 30 }, () => records).flat().map(frameMs => ({
    frameMs, deviceClass: 'desktop', interactionStallMs: 0
  }));
  const before = structuredClone(samples);
  const report = summarize(samples);
  assert.equal(report.samples, 120);
  assert.equal(report.frameMs.p50, 25);
  assert.deepEqual(samples, before);
});

test('CLI streams JSONL including blank lines without changing percentile results', async () => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const dir = await mkdtemp(join(tmpdir(), 'meme-city-qa-'));
  try {
    const file = join(dir, 'frames.jsonl');
    const row = JSON.stringify({ frameMs: 16, deviceClass: 'emulated-mobile', interactionStallMs: 0 });
    await writeFile(file, '\n' + Array.from({ length: 120 }, () => row).join('\n') + '\n');
    const output = execFileSync(process.execPath, [new URL('./qa-frame-budget.mjs', import.meta.url).pathname, file], { encoding: 'utf8' });
    const result = JSON.parse(output);
    assert.equal(result.samples, 120);
    assert.equal(result.budgetResult, 'within-provisional-budget');
    assert.deepEqual(result.deviceClasses, ['emulated-mobile']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
