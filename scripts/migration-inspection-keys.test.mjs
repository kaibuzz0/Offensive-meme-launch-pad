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
