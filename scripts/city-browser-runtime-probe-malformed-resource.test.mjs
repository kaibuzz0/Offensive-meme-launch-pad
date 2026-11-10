import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./city-browser-runtime-probe.js', import.meta.url), 'utf8');

test('malformed resource timing names do not prevent shutdown or valid accounting', () => {
  const ctx = {
    performance: {
      now: () => 1000,
      getEntriesByType: () => [
        { name: 'http://[', startTime: 1001, transferSize: 999 },
        { name: '/assets/world.js', startTime: 1002, transferSize: 123, decodedBodySize: 456 },
        { name: 'https://outside.test/x.js', startTime: 1003, transferSize: 999 }
      ]
    },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    URL,
    location: { origin: 'https://example.test', href: 'https://example.test/city.html' },
    navigator: { userAgent: 'QA' },
    console: { log() {}, warn() {} }
  };
  ctx.globalThis = ctx;
  vm.runInNewContext(source, ctx);
  const report = ctx.__memeCityQA.stop();
  assert.equal(report.sameOriginTransferBytes, 123);
  assert.equal(ctx.__memeCityQA, undefined);
});
