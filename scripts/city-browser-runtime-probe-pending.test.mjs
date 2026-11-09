import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./city-browser-runtime-probe.js', import.meta.url), 'utf8');

test('stop drains pending long tasks once before disconnect', () => {
  let disconnected = false;
  let drains = 0;
  const ctx = {
    performance: { now: () => 1200, getEntriesByType: () => [] },
    PerformanceObserver: class {
      observe() {}
      takeRecords() { drains++; return [{ startTime: 1190, duration: 75 }, { startTime: 100, duration: 900 }]; }
      disconnect() { disconnected = true; }
    },
    document: { hidden: false, addEventListener() {}, removeEventListener() {} },
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    URL, location: { origin: 'https://example.test', href: 'https://example.test/city.html' },
    navigator: { userAgent: 'QA' }, console: { log() {}, warn() {} }
  };
  ctx.globalThis = ctx;
  vm.runInNewContext(source, ctx);
  const session = ctx.__memeCityQA;
  const report = session.stop();
  assert.equal(report.longTaskCount, 1);
  assert.equal(report.longTaskMsP95, 75);
  assert.equal(disconnected, true);
  assert.equal(drains, 1);
  assert.equal(session.stop(), null);
  assert.equal(drains, 1);
});
