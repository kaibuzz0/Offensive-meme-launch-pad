import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('./city-browser-runtime-probe.js', import.meta.url), 'utf8');

test('observer disconnect exception cannot strand probe lifecycle resources', () => {
  let canceled = 0, removed = 0, disconnectAttempts = 0;
  const sandbox = {
    performance: { now: () => 125, getEntriesByType: () => [] },
    document: {
      hidden: false,
      addEventListener() {},
      removeEventListener(name) { if (name === 'visibilitychange') removed++; }
    },
    location: { href: 'https://example.test/city.html', origin: 'https://example.test' },
    navigator: { userAgent: 'test' },
    requestAnimationFrame: () => 3,
    cancelAnimationFrame(id) { assert.equal(id, 3); canceled++; },
    PerformanceObserver: class {
      observe() {}
      takeRecords() { return []; }
      disconnect() { disconnectAttempts++; throw new Error('observer disposed'); }
    },
    console: { log() {}, warn() {} },
    URL
  };
  sandbox.globalThis = sandbox;
  runInNewContext(source, sandbox);
  const report = sandbox.__memeCityQA.stop();
  assert.equal(report.resourceTimingAvailable, true);
  assert.equal(report.longTaskSupported, true);
  assert.equal(disconnectAttempts, 1);
  assert.equal(canceled, 1);
  assert.equal(removed, 1);
  assert.equal(Object.hasOwn(sandbox, '__memeCityQA'), false);
});
