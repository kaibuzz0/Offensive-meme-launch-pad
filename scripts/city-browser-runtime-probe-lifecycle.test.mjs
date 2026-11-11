import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./city-browser-runtime-probe.js', import.meta.url), 'utf8');

test('QA probe caps long-task samples, preserves total, and can restart cleanly', () => {
  let now = 1000;
  let callback;
  let observer;
  let disconnects = 0;
  let cancellations = 0;
  class Observer {
    constructor(fn) { this.fn = fn; }
    observe() { observer = this; }
    disconnect() { disconnects++; }
  }
  const context = {
    performance: { now: () => now, getEntriesByType: () => [] },
    PerformanceObserver: Observer,
    requestAnimationFrame(fn) { callback = fn; return 7; },
    cancelAnimationFrame() { cancellations++; },
    URL,
    location: { origin: 'https://example.test', href: 'https://example.test/city.html' },
    navigator: { userAgent: 'QA' },
    console: { log() {}, warn() {} }
  };
  context.globalThis = context;
  vm.runInNewContext(source, context);
  const first = context.__memeCityQA;
  vm.runInNewContext(source, context);
  assert.equal(context.__memeCityQA, first, 'duplicate injection must not start another probe');
  const entries = Array.from({ length: 2100 }, (_, i) => ({
    startTime: 1001 + i * 0.01,
    duration: i < 100 ? 900 : 60
  }));
  observer.fn({ getEntries: () => entries });
  now = 2000;
  const report = first.stop();
  assert.equal(report.longTaskCount, 2100);
  assert.equal(report.longTaskSamples, 2000);
  assert.equal(report.longTaskSampleLimit, 2000);
  assert.equal(report.longTaskMsP95, 60, 'old samples must not contaminate recent percentiles');
  assert.equal(disconnects, 1);
  assert.equal(cancellations, 1);
  assert.equal(context.__memeCityQA, undefined);
  vm.runInNewContext(source, context);
  assert.ok(context.__memeCityQA, 'probe can start again after stop');
  context.__memeCityQA.stop();
  assert.equal(disconnects, 2);
  assert.equal(cancellations, 2);
});
