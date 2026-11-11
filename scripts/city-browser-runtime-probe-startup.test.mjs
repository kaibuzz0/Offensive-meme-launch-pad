import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./city-browser-runtime-probe.js', import.meta.url), 'utf8');

test('DevTools probe explicitly disclaims cold-start coverage', () => {
  let now = 4200;
  const ctx = {
    performance: { now: () => now, getEntriesByType: () => [] },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    URL,
    location: { origin: 'https://example.test', href: 'https://example.test/city.html' },
    navigator: { userAgent: 'QA' },
    console: { log() {}, warn() {} }
  };
  ctx.globalThis = ctx;
  vm.runInNewContext(source, ctx);
  now = 4400;
  const report = ctx.__memeCityQA.stop();
  assert.equal(report.startupMeasuredByProbe, false);
  assert.equal(report.probeStartedAfterNavigationMs, 4200);
  assert.match(report.notes, /cannot measure cold startup/);
});
