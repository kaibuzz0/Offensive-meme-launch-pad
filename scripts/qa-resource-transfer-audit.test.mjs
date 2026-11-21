import test from 'node:test';
import assert from 'node:assert/strict';
import { auditTransfers } from './qa-resource-transfer-audit.mjs';

test('counts repeated transferred URLs without confusing cached requests with bytes', () => {
  const report = auditTransfers([
    { name: 'https://example.org/game.js', transferSize: 200 },
    { name: 'https://example.org/game.js', transferSize: 0 },
    { name: 'https://example.org/scene.js', transferSize: 50 }
  ]);
  assert.equal(report.totalTransferBytes, 250);
  assert.deepEqual(report.repeatedUrls.map(x => [x.requests, x.transferredBytes]), [[2, 200]]);
});
test('does not invent transfer sizes when timing data is absent', () => {
  const report = auditTransfers([{ name: 'https://example.org/game.js' }]);
  assert.equal(report.unknownSize, 1);
  assert.equal(report.measuredEntries, 0);
});
test('rejects malformed resource records', () => {
  assert.throws(() => auditTransfers([{ name: '/relative', transferSize: 20 }]), TypeError);
  assert.equal(auditTransfers([{ name: 'https://example.org/x', transferSize: -1 }]).unknownSize, 1);
});
