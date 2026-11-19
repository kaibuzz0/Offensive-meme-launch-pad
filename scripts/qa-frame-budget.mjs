#!/usr/bin/env node
// QA-only: summarize browser frame samples; does not claim physical-device evidence.
import { readFile } from 'node:fs/promises';

export function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const fraction = position - lower;
  return sorted[lower] + (sorted[Math.ceil(position)] - sorted[lower]) * fraction;
}
export function summarize(records) {
  const frames = [];
  const stalls = [];
  let invalid = 0;
  const devices = new Set();
  for (const sample of records) {
    if (!sample || typeof sample !== 'object' || !Number.isFinite(sample.frameMs) ||
        sample.frameMs <= 0 || sample.frameMs > 60000 ||
        !['physical-android', 'emulated-mobile', 'desktop'].includes(sample.deviceClass)) {
      invalid++;
      continue;
    }
    frames.push(sample.frameMs);
    devices.add(sample.deviceClass);
    if (Number.isFinite(sample.interactionStallMs) && sample.interactionStallMs >= 0)
      stalls.push(sample.interactionStallMs);
  }
  return {
    samples: frames.length, invalid, deviceClasses: [...devices].sort(),
    frameMs: { p50: percentile(frames, .5), p95: percentile(frames, .95), p99: percentile(frames, .99) },
    maxInteractionStallMs: stalls.length ? Math.max(...stalls) : null,
    provisionalBudgets: { frameP95Ms: 33.3, interactionStallMs: 200 },
    budgetResult: !frames.length ? 'no-evidence' :
      (percentile(frames, .95) <= 33.3 && (stalls.length === 0 || Math.max(...stalls) <= 200) ? 'within-provisional-budget' : 'exceeds-provisional-budget'),
    note: 'Only measures supplied samples. No Android hardware, GPU memory, download size, or real gameplay is inferred.'
  };
}
async function main() {
  const filename = process.argv[2];
  if (!filename) throw new Error('Usage: node scripts/qa-frame-budget.mjs samples.jsonl');
  const lines = (await readFile(filename, 'utf8')).split(/\r?\n/).filter(line => line.trim());
  const samples = lines.map((line, index) => {
    try { return JSON.parse(line); }
    catch { throw new Error(`Invalid JSON at line ${index + 1}`); }
  });
  const result = summarize(samples);
  console.log(JSON.stringify(result, null, 2));
  if (!result.samples) process.exitCode = 2;
  else if (result.budgetResult === 'exceeds-provisional-budget') process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 2; });
}
