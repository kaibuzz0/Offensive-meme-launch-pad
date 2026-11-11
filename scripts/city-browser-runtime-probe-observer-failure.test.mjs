import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('./city-browser-runtime-probe.js', import.meta.url), 'utf8');

test('observer takeRecords failure still stops probe and releases lifecycle resources', () => {
  let disconnected = 0, canceled = 0, removed = 0;
  const sandbox = {
    performance: { now: () => 120, getEntriesByType: () => [] },
    document: {
      hidden: false,
      addEventListener() {},
      removeEventListener(name) { if (name === 'visibilitychange') removed++; }
    },
    location: { href: 'https://example.test/city.html', origin: 'https://example.test' },
    navigator: { userAgent: 'test' },
    requestAnimationFrame: () => 7,
    cancelAnimationFrame(id) { assert.equal(id, 7); canceled++; },
    PerformanceObserver: class {
      observe() {}
      takeRecords() { throw new Error('observer context disposed'); }
      disconnect() { disconnected++; }
    },
    console: { log() {}, warn() {} },
    URL
  };
  sandbox.globalThis = sandbox;
  runInNewContext(source, sandbox);
  const report = sandbox.__memeCityQA.stop();
  assert.equal(report.longTaskCount, 0);
  assert.equal(report.resourceTimingAvailable, true);
  assert.equal(disconnected, 1);
  assert.equal(canceled, 1);
  assert.equal(removed, 1);
  assert.equal(Object.hasOwn(sandbox, '__memeCityQA'), false);
});
