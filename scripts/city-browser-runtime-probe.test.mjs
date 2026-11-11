import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./city-browser-runtime-probe.js', import.meta.url), 'utf8');

test('QA probe excludes pre-start timing and distinguishes repeated requests from bytes', () => {
  let now = 1000;
  let callback;
  let observer;
  const resources = [
    { name: 'https://example.test/game.js', startTime: 900, transferSize: 9999, decodedBodySize: 9999 },
    { name: 'https://example.test/game.js', startTime: 1001, transferSize: 100, decodedBodySize: 200 },
    { name: 'https://example.test/game.js', startTime: 1002, transferSize: 0, decodedBodySize: 200 },
    { name: 'https://other.test/x.js', startTime: 1003, transferSize: 500, decodedBodySize: 500 }
  ];
  class Observer {
    constructor(fn) { this.fn = fn; }
    observe() { observer = this; }
    disconnect() {}
  }
  const context = {
    performance: { now: () => now, getEntriesByType: () => resources, memory: { usedJSHeapSize: 1234 } },
    PerformanceObserver: Observer,
    requestAnimationFrame(fn) { callback = fn; return 1; },
    cancelAnimationFrame() {},
    URL, location: { origin: 'https://example.test', href: 'https://example.test/city.html' },
    navigator: { userAgent: 'QA', deviceMemory: 4 },
    console: { log() {}, warn() {} }
  };
  context.globalThis = context;
  vm.runInNewContext(source, context);
  observer.fn({ getEntries: () => [
    { startTime: 999, duration: 900 },
    { startTime: 1001, duration: 60 }
  ] });
  callback(1010);
  callback(1026);
  now = 1100;
  const result = context.__memeCityQA.stop();
  assert.equal(result.longTaskCount, 1);
  assert.equal(result.resourceCount, 3);
  assert.equal(result.sameOriginTransferBytes, 100);
  assert.equal(result.repeatedSameOriginRequests.length, 1);
  assert.equal(result.repeatedSameOriginRequests[0].requests, 2);
  assert.equal(result.frameSamples, 1);
  assert.equal(result.frameMsP50, 16);
  assert.equal(result.jsHeapUsedBytes, 1234);
});

test('QA probe reports unavailable Long Tasks and resource timing', () => {
  const context = {
    performance: { now: () => 100, getEntriesByType: () => [{ name: 'https://example.test/a', startTime: 101, transferSize: 0, decodedBodySize: 0 }] },
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    URL, location: { origin: 'https://example.test', href: 'https://example.test/' },
    navigator: { userAgent: 'QA' },
    console: { log() {}, warn() {} }
  };
  context.globalThis = context;
  vm.runInNewContext(source, context);
  const result = context.__memeCityQA.stop();
  assert.equal(result.longTaskSupported, false);
  assert.equal(result.resourceTimingUnknownCount, 1);
  assert.equal(result.jsHeapUsedBytes, null);
});

test('QA probe bounds frame samples during extended sessions', () => {
  let now = 0;
  let callback;
  const context = {
    performance: { now: () => now, getEntriesByType: () => [] },
    requestAnimationFrame(fn) { callback = fn; return 1; },
    cancelAnimationFrame() {},
    URL, location: { origin: 'https://example.test', href: 'https://example.test/city.html' },
    navigator: { userAgent: 'QA' }, console: { log() {}, warn() {} }
  };
  context.globalThis = context;
  vm.runInNewContext(source, context);
  for (let i = 1; i <= 6200; i++) callback(i * 16);
  now = 100000;
  const result = context.__memeCityQA.stop();
  assert.equal(result.frameTotal, 6199);
  assert.equal(result.frameSamples, 6000);
  assert.equal(result.frameSampleLimit, 6000);
  assert.equal(result.frameMsP95, 16);
});
