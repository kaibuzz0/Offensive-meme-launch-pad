import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = {};
vm.runInNewContext(fs.readFileSync(new URL('../city-migration.js', import.meta.url), 'utf8'), context);
const migration = context.CityMigration;
const C = { WORLD: {route: []}, NEIGHBORHOODS: [] };
const T = {
  draft: {areas: {hub: {x: 0, y: 0, w: 100, h: 100}, fortress: {x: 100, y: 100, w: 100, h: 100}}, plot: {x: 10, y: 10}},
  point: (_c, p) => ({x: p.x, y: p.y, area: 'hub'}),
  source: () => ({x: 0, y: 0, w: 100, h: 100}),
  outpost: () => ({x: 0, y: 0}),
};
const keys = {active: 'save', backup: 'save-backup', preview: 'save-preview'};
const source = JSON.stringify({version: 5, saveVersion: 5, worldVersion: 1, x: 8, y: 9, inventory: {wood: 4}});
function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: k => values.has(k) ? values.get(k) : null,
    setItem: (k, v) => values.set(k, v),
    snapshot: () => Object.fromEntries(values),
  };
}

test('staging never activates a legacy save and repeated staging is stable', () => {
  const store = storage({save: source});
  assert.equal(migration.stage(store, keys, C, T).status, 'staged');
  const first = store.snapshot();
  assert.equal(first.save, source);
  assert.equal(first['save-backup'], source);
  assert.equal(migration.inspectStage(store, keys).status, 'ready-for-review');
  assert.equal(migration.stage(store, keys, C, T).status, 'staged');
  assert.deepEqual(store.snapshot(), first);
});

test('a newer active revision cannot overwrite the recovery backup', () => {
  const store = storage({save: source});
  assert.equal(migration.stage(store, keys, C, T).status, 'staged');
  store.setItem('save', JSON.stringify({...JSON.parse(source), x: 50}));
  assert.equal(migration.stage(store, keys, C, T).status, 'conflict');
  assert.equal(migration.inspectStage(store, keys).status, 'conflict');
  assert.equal(store.getItem('save-backup'), source);
});

test('malformed saves and unavailable storage leave active data untouched', () => {
  const malformed = storage({save: '{bad'});
  assert.equal(migration.stage(malformed, keys, C, T).status, 'invalid');
  assert.deepEqual(malformed.snapshot(), {save: '{bad'});
  const blocked = storage({save: source});
  blocked.setItem = () => {throw new Error('quota');};
  assert.equal(migration.stage(blocked, keys, C, T).status, 'blocked');
  assert.equal(blocked.getItem('save'), source);
});

test('unknown session activities are blocked rather than migrated', () => {
  const raw = JSON.stringify({...JSON.parse(source), blockJob: {id: 'active'}});
  const store = storage({save: raw});
  assert.equal(migration.stage(store, keys, C, T).status, 'blocked');
  assert.deepEqual(store.snapshot(), {save: raw});
});
