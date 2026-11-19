// Regression harness for the legacy pickup while the canonical journal is integrated.
// Execute the actual terrain-mode handler with isolated storage and UI stubs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../city-terrain-mode.js', import.meta.url), 'utf8');
const start = source.indexOf(' function claimSupplies(){');
const end = source.indexOf("\n supplyButton.addEventListener('click',claimSupplies);", start);
assert.ok(start >= 0 && end > start, 'terrain pickup handler must exist');
const handler = source.slice(start, end);

function attempt({ write = true, read = true, reachable = true } = {}) {
  let durable = null;
  let hudUpdates = 0;
  const button = { textContent: '' };
  const context = {
    running: true, paused: false, firstPerson: true, atlas: false,
    suppliesClaimed: false, supplyButton: button,
    atSupplies: () => reachable, supplyKey: () => 'test:seed',
    put: (_key, value) => { if (write) durable = value; return write; },
    get: () => read ? durable : null,
    updateHud: () => { hudUpdates++; },
  };
  runInNewContext(handler + '\nclaimSupplies();', context);
  return { claimed: context.suppliesClaimed, label: button.textContent, durable, hudUpdates };
}

test('successful pickup acknowledges only a readable durable record', () => {
  const result = attempt();
  assert.equal(result.claimed, true);
  assert.equal(result.durable, '1');
  assert.match(result.label, /8 supplies recovered/);
  assert.equal(result.hudUpdates, 1);
});

test('failed storage write leaves pickup retryable', () => {
  const result = attempt({ write: false });
  assert.equal(result.claimed, false);
  assert.match(result.label, /retry/);
});

test('write without readback does not falsely acknowledge pickup', () => {
  const result = attempt({ read: false });
  assert.equal(result.claimed, false);
  assert.equal(result.durable, '1');
  assert.match(result.label, /retry/);
});

test('out-of-reach interaction cannot claim supplies or write storage', () => {
  const result = attempt({ reachable: false });
  assert.equal(result.claimed, false);
  assert.equal(result.durable, null);
  assert.equal(result.hudUpdates, 0);
});
