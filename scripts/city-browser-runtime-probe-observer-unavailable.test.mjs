import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('./city-browser-runtime-probe.js', import.meta.url), 'utf8');

test('rejected long-task observer is reported unavailable without breaking stop', () => {
  let canceled = 0;
  const sandbox = {
    performance: { now: () => 100, getEntriesByType: () => [] },
    PerformanceObserver: class {
      observe() { throw new Error('longtask unsupported'); }
      disconnect() { throw new Error('should not disconnect failed observer'); }
    },
    requestAnimationFrame: () => 5,
    cancelAnimationFrame: () => { canceled++; },
    location: { href: 'https://example.test/city.html', origin: 'https://example.test' },
    navigator: { userAgent: 'QA' },
    URL,
    console: { log() {}, warn() {} }
  };
  sandbox.globalThis = sandbox;
  runInNewContext(source, sandbox);
  const report = sandbox.__memeCityQA.stop();
  assert.equal(report.longTaskSupported, false);
  assert.equal(report.longTaskCount, 0);
  assert.equal(canceled, 1);
  assert.equal(sandbox.__memeCityQA, undefined);
});
