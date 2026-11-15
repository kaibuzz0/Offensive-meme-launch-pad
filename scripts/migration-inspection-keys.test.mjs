import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../city-migration.js', import.meta.url), 'utf8');
const context = {};
runInNewContext(source, context);
const migration = context.CityMigration;

test('migration inspection rejects aliased storage keys without reading storage', () => {
  let reads = 0;
  const storage = { getItem() { reads++; return null; } };
  for (const keys of [
    { active: 'save', backup: 'save', preview: 'preview' },
    { active: 'save', backup: 'backup', preview: 'backup' },
    { active: 'save', backup: 'backup', preview: 'save' },
    { active: '', backup: 'backup', preview: 'preview' },
  ]) {
    assert.equal(migration.inspectStage(storage, keys).status, 'invalid');
  }
  assert.equal(reads, 0);
});

test('migration inspection still reports missing for distinct valid keys', () => {
  const storage = { getItem() { return null; } };
  assert.equal(migration.inspectStage(storage, {
    active: 'save', backup: 'backup', preview: 'preview'
  }).status, 'missing');
});

test('inspection accepts only a matching staged preview and protected recovery copy', () => {
  const keys = { active: 'save', backup: 'backup', preview: 'preview' };
  const original = JSON.stringify({ version: 5, worldVersion: 1, saveVersion: 5, x: 10, y: 20 });
  const preview = JSON.stringify({
    kind: 'world2-preview-only',
    sourceRaw: original,
    save: { version: 6, saveVersion: 6, worldVersion: 2, x: 30, y: 40 },
    notices: ['location projected']
  });
  const values = new Map([['save', original], ['backup', original], ['preview', preview]]);
  const storage = { getItem(key) { return values.get(key) ?? null; } };
  const ready = migration.inspectStage(storage, keys);
  assert.equal(ready.status, 'ready-for-review');
  assert.equal(ready.save.x, 30);
  assert.equal(values.get('save'), original, 'inspection must never activate the preview');

  values.set('save', JSON.stringify({ version: 5, x: 999 }));
  assert.equal(migration.inspectStage(storage, keys).status, 'conflict');
  values.set('save', original);
  values.set('backup', JSON.stringify({ version: 5, x: 888 }));
  assert.equal(migration.inspectStage(storage, keys).status, 'conflict');
});

test('inspection rejects malformed or incompatible preview without changing saved data', () => {
  const keys = { active: 'save', backup: 'backup', preview: 'preview' };
  const original = '{"version":5}';
  const values = new Map([['save', original], ['backup', original]]);
  const storage = { getItem(key) { return values.get(key) ?? null; } };
  for (const staged of [
    '{invalid',
    JSON.stringify({ kind: 'world2-preview-only', sourceRaw: original, save: { version: 5, saveVersion: 5, worldVersion: 1 } }),
    JSON.stringify({ kind: 'unexpected', sourceRaw: original, save: { version: 6, saveVersion: 6, worldVersion: 2 } })
  ]) {
    values.set('preview', staged);
    assert.equal(migration.inspectStage(storage, keys).status, 'invalid');
    assert.equal(values.get('save'), original);
    assert.equal(values.get('backup'), original);
  }
});
