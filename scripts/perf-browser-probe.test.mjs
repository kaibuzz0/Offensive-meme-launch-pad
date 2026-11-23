import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from './perf-browser-probe.mjs';

test('frame percentile summary is deterministic and filters invalid samples', () => {
  assert.deepEqual(summarize([20, 10, 40, NaN, Infinity, 30]), {
    count: 4, p50: 20, p95: 40, p99: 40, max: 40
  });
});
test('empty samples have explicit unavailable metrics', () => {
  assert.deepEqual(summarize([]), { count: 0, p50: null, p95: null, p99: null, max: null });
});
