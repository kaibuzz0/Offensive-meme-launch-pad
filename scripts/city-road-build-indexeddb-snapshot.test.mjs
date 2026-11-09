import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { openSoloBuildStore } from '../city-road-build-indexeddb.js';

// Minimal deferred-read IDB stand-in to exercise the real adapter boundary.
function delayedIndexedDB() {
  const records = new Map();
  const pending = [];
  return {
    records, pending,
    factory: {
      open() {
        const request = {};
        queueMicrotask(() => {
          request.result = {
            objectStoreNames: { contains: () => true },
            transaction() {
              const tx = {
                objectStore() {
                  return {
                    get(key) {
                      const req = {};
                      pending.push(() => {
                        req.result = structuredClone(records.get(key));
                        req.onsuccess?.();
                      });
                      return req;
                    },
                    add(value, key) { return write(value, key); },
                    put(value, key) { return write(value, key); }
                  };
                },
                abort() { queueMicrotask(() => tx.onabort?.()); }
              };
              function write(value, key) {
                const req = {};
                queueMicrotask(() => {
                  records.set(key, structuredClone(value));
                  req.onsuccess?.();
                  queueMicrotask(() => tx.oncomplete?.());
                });
                return req;
              }
              return tx;
            },
            close() {}
          };
          request.onsuccess?.();
        });
        return request;
      }
    }
  };
}
const initial = () => ({
  version: 1, seed: 'snapshot-seed', revision: 0,
  inventory: { supplies: 8 },
  journal: createVoxelEditJournal('snapshot-seed').snapshot()
});
async function releaseRead(mock) {
  for (let n = 0; n < 10 && !mock.pending.length; n++) await Promise.resolve();
  assert.ok(mock.pending.length, 'expected deferred IndexedDB read');
  mock.pending.shift()();
}
test('initialize snapshots inventory and journal before deferred IDB read', async () => {
  const mock = delayedIndexedDB();
  const db = await openSoloBuildStore(mock.factory);
  const record = initial();
  const saving = db.initialize('seed:player', record);
  record.inventory.supplies = 999;
  record.journal.edits.push({ x: 0, y: 1, z: 0, block: 'stone' });
  await releaseRead(mock);
  assert.equal(await saving, true);
  assert.equal(mock.records.get('seed:player').inventory.supplies, 8);
  assert.deepEqual(mock.records.get('seed:player').journal.edits, []);
  db.close();
});
test('compare-and-swap snapshots inventory before deferred IDB read', async () => {
  const mock = delayedIndexedDB();
  const db = await openSoloBuildStore(mock.factory);
  const start = initial();
  const initializing = db.initialize('seed:player', start);
  await releaseRead(mock);
  assert.equal(await initializing, true);
  const next = initial();
  next.revision = 1;
  next.journal.revision = 1;
  next.inventory.supplies = 7;
  const saving = db.compareAndSwap('seed:player', 0, next);
  next.inventory.supplies = 999;
  await releaseRead(mock);
  assert.equal(await saving, true);
  assert.equal(mock.records.get('seed:player').inventory.supplies, 7);
  db.close();
});
