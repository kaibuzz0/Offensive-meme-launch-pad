import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../city-migration.js', import.meta.url), 'utf8');
const context = {};
runInNewContext(source, context);
const { stage, inspectStage } = context.CityMigration;
const keys = { active: 'active', backup: 'backup', preview: 'preview' };
const original = JSON.stringify({ version: 4, x: 4, y: 5, inventory: { wood: 3 } });
const C = { WORLD: { route: [] }, NEIGHBORHOODS: [] };
const T = {
  draft: { areas: { hub: { x: 0, y: 0, w: 20, h: 20 }, fortress: { x: 0, y: 0, w: 20, h: 20 } }, plot: {} },
  point: (_c, p) => ({ x: p.x, y: p.y, area: 'hub' }),
  outpost: () => ({ x: 0, y: 0 }),
};
function storage(seed = original) {
  const map = new Map([[keys.active, seed]]);
  return {
    map,
    getItem: k => map.has(k) ? map.get(k) : null,
    setItem: (k, v) => map.set(k, String(v)),
  };
}

test('staging is repeat-safe and never activates the preview', () => {
  const s = storage();
  assert.equal(stage(s, keys, C, T).status, 'staged');
  const first = s.getItem(keys.preview);
  assert.equal(stage(s, keys, C, T).status, 'staged');
  assert.equal(s.getItem(keys.preview), first);
  assert.equal(s.getItem(keys.active), original);
  assert.equal(s.getItem(keys.backup), original);
  const review = inspectStage(s, keys);
  assert.equal(review.status, 'ready-for-review');
  assert.equal(review.save.inventory.wood, 3);
});

test('modified active save blocks preview review without overwriting progress', () => {
  const s = storage();
  assert.equal(stage(s, keys, C, T).status, 'staged');
  const newer = JSON.stringify({ version: 4, x: 7, y: 8 });
  s.setItem(keys.active, newer);
  assert.equal(inspectStage(s, keys).status, 'conflict');
  assert.equal(stage(s, keys, C, T).status, 'conflict');
  assert.equal(s.getItem(keys.active), newer);
  assert.equal(s.getItem(keys.backup), original);
});

test('corrupted backup and preview are rejected before activation', () => {
  const s = storage();
  assert.equal(stage(s, keys, C, T).status, 'staged');
  s.setItem(keys.backup, '{}');
  assert.equal(inspectStage(s, keys).status, 'conflict');
  s.setItem(keys.backup, original);
  s.setItem(keys.preview, '{"kind":"world2-preview-only","save":{}}');
  assert.equal(inspectStage(s, keys).status, 'invalid');
  assert.equal(s.getItem(keys.active), original);
});

test('failed preview write preserves active save and recovery backup', () => {
  const s = storage();
  const setItem = s.setItem;
  s.setItem = (k, v) => { if (k === keys.preview) throw Error('quota'); setItem(k, v); };
  assert.equal(stage(s, keys, C, T).status, 'blocked');
  assert.equal(s.getItem(keys.active), original);
  assert.equal(s.getItem(keys.backup), original);
});

test('active session data is not silently mapped into a new world', () => {
  const s = storage(JSON.stringify({ version: 4, x: 4, y: 5, defense: { active: true } }));
  assert.equal(stage(s, keys, C, T).status, 'blocked');
  assert.equal(s.getItem(keys.backup), null);
  assert.equal(s.getItem(keys.active) !== null, true);
});
