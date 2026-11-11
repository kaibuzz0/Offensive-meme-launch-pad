import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./city-browser-runtime-probe.js', import.meta.url), 'utf8');

test('background tab frames are excluded and visibility listener is removed', () => {
  let now = 1000, tick, visibilityHandler, removed = false;
  const document = {
    hidden: false,
    addEventListener(type, fn) { assert.equal(type, 'visibilitychange'); visibilityHandler = fn; },
    removeEventListener(type, fn) { assert.equal(type, 'visibilitychange'); removed = fn === visibilityHandler; }
  };
  const ctx = {
    document,
    performance: { now: () => now, getEntriesByType: () => [] },
    PerformanceObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame(fn) { tick = fn; return 1; },
    cancelAnimationFrame() {},
    URL, location: { origin: 'https://example.test', href: 'https://example.test/city.html' },
    navigator: { userAgent: 'QA' },
    innerWidth: 390, innerHeight: 844, devicePixelRatio: 3,
    console: { log() {}, warn() {} }
  };
  ctx.globalThis = ctx;
  vm.runInNewContext(source, ctx);
  tick(1016);
  tick(1032);
  document.hidden = true;
  visibilityHandler();
  tick(8000);
  document.hidden = false;
  visibilityHandler();
  tick(8016);
  tick(8032);
  now = 9000;
  const report = ctx.__memeCityQA.stop();
  assert.equal(report.frameTotal, 2);
  assert.equal(report.hiddenTransitions, 1);
  assert.equal(report.viewportCssPx.width, 390);
  assert.equal(report.viewportCssPx.height, 844);
  assert.equal(report.devicePixelRatio, 3);
  assert.equal(removed, true);
});
