import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context = {};
vm.runInNewContext(readFileSync(new URL('../city-save.js', import.meta.url), 'utf8'), context);
const {CitySave} = context;
const storage = (entries = {}) => {
  const values = new Map(Object.entries(entries));
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
  };
};

test('migration preparation is repeat-safe and never mutates the active save', () => {
  const key = 'solo-a', backup = 'solo-a-backup';
  const original = JSON.stringify({
    version: 4, credits: 45, inventory: [{uid: 'old-1', item: 'coat'}],
    edits: [{x: 2, y: 3, z: 4, block: 'stone'}],
  });
  const store = storage({[key]: original});
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = CitySave.prepare(store, key, backup);
    assert.equal(result.blocked, false);
    assert.equal(store.getItem(key), original, 'prepare must not rewrite active data');
    assert.equal(store.getItem(backup), original, 'repeated prepare must preserve recovery bytes');
  }
});

test('separate world slots never share or overwrite recovery snapshots', () => {
  const a = JSON.stringify({version: 2, seed: 'forest', xp: 10});
  const b = JSON.stringify({version: 3, seed: 'desert', xp: 20});
  const store = storage({'slot-a': a, 'slot-b': b});
  assert.equal(CitySave.prepare(store, 'slot-a', 'backup-a').blocked, false);
  assert.equal(CitySave.prepare(store, 'slot-b', 'backup-b').blocked, false);
  assert.equal(store.getItem('backup-a'), a);
  assert.equal(store.getItem('backup-b'), b);
  assert.equal(store.getItem('slot-a'), a);
  assert.equal(store.getItem('slot-b'), b);
});

test('incompatible new world version leaves both active and recovery data intact', () => {
  const active = JSON.stringify({version: 5, saveVersion: 5, worldVersion: 999, xp: 200});
  const recovery = JSON.stringify({version: 3, xp: 100});
  const store = storage({'slot': active, 'backup': recovery});
  const result = CitySave.prepare(store, 'slot', 'backup');
  assert.equal(result.blocked, true);
  assert.equal(store.getItem('slot'), active);
  assert.equal(store.getItem('backup'), recovery);
});

test('storage backup write failure does not replace an old save', () => {
  const active = JSON.stringify({version: 2, xp: 50});
  const store = storage({'slot': active});
  store.setItem = () => { throw new Error('QuotaExceededError'); };
  const result = CitySave.prepare(store, 'slot', 'backup');
  assert.equal(result.blocked, true);
  assert.equal(store.getItem('slot'), active);
  assert.equal(store.getItem('backup'), null);
});
