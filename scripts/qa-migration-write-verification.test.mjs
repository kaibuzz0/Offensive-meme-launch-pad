import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../city-migration.js', import.meta.url), 'utf8'), context);
const { stage, inspectStage } = context.CityMigration;
const keys = { active: 'live', backup: 'backup', preview: 'preview' };
const C = { WORLD: { route: [] }, NEIGHBORHOODS: [] };
const T = {
  draft: { areas: { hub: { x: 0, y: 0, w: 20, h: 20 }, fortress: { x: 0, y: 0, w: 20, h: 20 } }, plot: {} },
  point: (_c, p) => ({ x: p.x, y: p.y, area: 'hub' }),
};
const raw = JSON.stringify({ version: 2, x: 4, y: 5, inventory: { wood: 3 } });

function storage(dropKey) {
  const map = new Map([[keys.active, raw]]);
  return {
    getItem: key => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => { if (key !== dropKey) map.set(key, value); },
    map,
  };
}

test('migration refuses a silently dropped backup write and preserves the active save', () => {
  const s = storage(keys.backup);
  const result = stage(s, keys, C, T);
  assert.equal(result.status, 'blocked');
  assert.equal(s.getItem(keys.active), raw);
  assert.equal(s.getItem(keys.preview), null);
});

test('migration refuses a silently dropped preview write and preserves backup and active save', () => {
  const s = storage(keys.preview);
  const result = stage(s, keys, C, T);
  assert.equal(result.status, 'blocked');
  assert.equal(s.getItem(keys.active), raw);
  assert.equal(s.getItem(keys.backup), raw);
  assert.equal(inspectStage(s, keys).status, 'missing');
});

test('successful migration remains preview-only and repeat-safe', () => {
  const s = storage();
  assert.equal(stage(s, keys, C, T).status, 'staged');
  assert.equal(stage(s, keys, C, T).status, 'staged');
  assert.equal(inspectStage(s, keys).status, 'ready-for-review');
  assert.equal(s.getItem(keys.active), raw);
  assert.equal(s.getItem(keys.backup), raw);
});
