import test from 'node:test';
import assert from 'node:assert/strict';
import '../city-migration.js';

test('migration inspection refuses aliased active, backup, and preview keys before storage access', () => {
  const storage = { getItem() { throw new Error('storage must not be read'); } };
  for (const keys of [
    { active: 'save', backup: 'save', preview: 'preview' },
    { active: 'save', backup: 'backup', preview: 'save' },
    { active: 'save', backup: 'backup', preview: 'backup' },
    { active: '', backup: 'backup', preview: 'preview' },
  ]) {
    const result = globalThis.CityMigration.inspectStage(storage, keys);
    assert.equal(result.status, 'invalid');
    assert.match(result.reason, /Distinct save, backup and preview keys/);
  }
});
