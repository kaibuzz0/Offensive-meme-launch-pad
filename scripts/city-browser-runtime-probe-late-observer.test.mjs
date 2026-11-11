import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./city-browser-runtime-probe.js', import.meta.url), 'utf8');

test('late long-task observer callbacks after stop do not alter completed session', () => {
  let callback;
  let disconnected = false;
  let now = 1000;
  const ctx = {
    performance: { now: () => now, getEntriesByType: () => [] },
    PerformanceObserver: class {
      constructor(fn) { callback = fn; }
      observe() {}
      disconnect() { disconnected = true; }
    },
    document: { hidden: false, addEventListener() {}, removeEventListener() {} },
    requestAnimationFrame() { return 1; },
    cancelAnimationFrame() {},
    URL,
    location: { origin: 'https://example.test', href: 'https://example.test/city.html' },
    navigator: { userAgent: 'QA' },
    console: { log() {}, warn() {} }
  };
  ctx.globalThis = ctx;
  vm.runInNewContext(source, ctx);
  callback({ getEntries: () => [{ startTime: 1010, duration: 55 }] });
  now = 1100;
  const report = ctx.__memeCityQA.stop();
  assert.equal(report.longTaskCount, 1);
  assert.equal(disconnected, true);
  callback({ getEntries: () => [{ startTime: 1050, duration: 999 }] });
  assert.equal(report.longTaskCount, 1);
  assert.equal(ctx.__memeCityQA, undefined);
});
