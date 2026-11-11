import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./city-browser-runtime-probe.js', import.meta.url), 'utf8');

for (const mode of ['missing', 'throws', 'non-array']) {
  test('probe shutdown survives unavailable resource timing: ' + mode, () => {
    let disconnected = false;
    let cancelled = false;
    let removed = false;
    const performance = { now: () => 1100 };
    if (mode === 'throws') performance.getEntriesByType = () => { throw new Error('blocked'); };
    if (mode === 'non-array') performance.getEntriesByType = () => null;
    const context = {
      performance,
      PerformanceObserver: class {
        observe() {}
        takeRecords() { return []; }
        disconnect() { disconnected = true; }
      },
      requestAnimationFrame() { return 1; },
      cancelAnimationFrame() { cancelled = true; },
      document: {
        hidden: false,
        addEventListener() {},
        removeEventListener() { removed = true; }
      },
      location: { origin: 'https://example.test', href: 'https://example.test/city.html' },
      navigator: { userAgent: 'QA' },
      URL,
      console: { log() {}, warn() {} }
    };
    context.globalThis = context;
    vm.runInNewContext(source, context);
    const report = context.__memeCityQA.stop();
    assert.equal(report.resourceTimingAvailable, false);
    assert.equal(report.resourceCount, 0);
    assert.equal(disconnected, true);
    assert.equal(cancelled, true);
    assert.equal(removed, true);
    assert.equal(context.__memeCityQA, undefined);
  });
}
