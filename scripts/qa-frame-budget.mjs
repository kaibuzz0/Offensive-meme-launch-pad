#!/usr/bin/env node
// QA-only: summarize browser frame samples; does not claim physical-device evidence.
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

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
  let interactionSamples = 0;
  let invalid = 0;
  let maxStall = null;
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
    if (Number.isFinite(sample.interactionStallMs) && sample.interactionStallMs >= 0) {
      interactionSamples++;
      maxStall = maxStall === null ? sample.interactionStallMs : Math.max(maxStall, sample.interactionStallMs);
    }
  }
  // Sort once: three percentile calls previously copied and sorted the full recording independently.
  // Frame values are owned by this summary; sort in place to avoid a second large recording buffer.
  frames.sort((a, b) => a - b);
  const sortedFrames = frames;
  const quantile = p => {
    if (!sortedFrames.length) return null;
    const position = (sortedFrames.length - 1) * p;
    const lower = Math.floor(position);
    const fraction = position - lower;
    return sortedFrames[lower] + (sortedFrames[Math.ceil(position)] - sortedFrames[lower]) * fraction;
  };
  const p95 = quantile(.95);
  // A handful of frames cannot establish a representative percentile.
  const minimumFrameSamples = 120;
  return {
    samples: frames.length, invalid, interactionSamples, deviceClasses: [...devices].sort(),
    frameMs: { p50: quantile(.5), p95, p99: quantile(.99) },
    maxInteractionStallMs: maxStall,
    provisionalBudgets: { frameP95Ms: 33.3, interactionStallMs: 200, minimumFrameSamples },
    budgetResult: !frames.length ? 'no-evidence' :
      (invalid || frames.length < minimumFrameSamples || interactionSamples !== frames.length || devices.size !== 1 ? 'incomplete-evidence' :
      (p95 <= 33.3 && maxStall <= 200 ? 'within-provisional-budget' : 'exceeds-provisional-budget')),
    note: 'Only measures supplied samples; deviceClass is self-reported, not hardware-attested. Fewer than 120 frames, missing interaction stalls, invalid samples or mixed device classes cannot yield a pass. No Android hardware, GPU memory, download size, or real gameplay is inferred.'
  };
}
async function main() {
  const filename = process.argv[2];
  if (!filename) throw new Error('Usage: node scripts/qa-frame-budget.mjs samples.jsonl');
  // Read incrementally to avoid simultaneously retaining the complete text and split lines.
  // Percentile calculation still retains parsed samples until summarization.
  const records = [];
  let lineNumber = 0;
  const reader = createInterface({ input: createReadStream(filename, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of reader) {
    lineNumber++;
    if (!line.trim()) continue;
    try { records.push(JSON.parse(line)); }
    catch { throw new Error(`Invalid JSON at line ${lineNumber}`); }
  }
  const result = summarize(records);
  console.log(JSON.stringify(result, null, 2));
  if (!result.samples) process.exitCode = 2;
  else if (result.budgetResult !== 'within-provisional-budget') process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 2; });
}
