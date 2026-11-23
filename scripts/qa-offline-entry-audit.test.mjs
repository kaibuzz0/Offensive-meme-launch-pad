import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const script = fileURLToPath(new URL('./qa-offline-entry-audit.mjs', import.meta.url));
test('offline entry audit reports dependency counts and explicitly labels static scope', () => {
  const run = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const report = JSON.parse(run.stdout);
  assert.ok(report.entries['index.html'].scriptsAndStyles > 0);
  assert.ok(report.entries['city.html'].scriptsAndStyles > 0);
  assert.match(report.note, /browser verification/);
});
test('strict static-offline gate rejects incomplete game precache', () => {
  const run = spawnSync(process.execPath, [script, '--require-static-offline'], { encoding: 'utf8' });
  const report = JSON.parse(run.stdout);
  assert.ok(report.missingFromStaticPrecache.includes('city.html'));
  assert.equal(run.status, 1);
});
