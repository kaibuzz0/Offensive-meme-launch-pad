import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const auditSource = fs.readFileSync(fileURLToPath(new URL('../scripts/audit-offline-solo.mjs', import.meta.url)), 'utf8');

function fixture(t, { cached = [], fallback = 'offline.html', missing = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'meme-offline-audit-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (name, body) => {
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, body);
  };
  write('scripts/audit-offline-solo.mjs', auditSource);
  write('index.html', '<a href="city.html?terrain=1">Play</a><script src="js/main.js"></script>');
  write('city.html', '<link rel="stylesheet" href="css/main.css">');
  write('js/main.js', "import './nested.js'; import '/assets/shared.js';");
  write('js/nested.js', 'export const ready = true;');
  if (!missing) write('assets/shared.js', 'export const shared = true;');
  write('css/main.css', 'body { background: url("../assets/sky.png"); }');
  write('assets/sky.png', 'fixture');
  write('sw.js', `const SHELL=${JSON.stringify(cached)};
self.addEventListener('fetch', event => {
  const request=event.request;
  if(request.mode==='navigate') event.respondWith(fetch(request).catch(()=>caches.match(new URL('${fallback}',self.registration.scope).href)));
});`);
  return root;
}

function run(root, strict = false) {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/audit-offline-solo.mjs'), ...(strict ? ['--require-offline'] : [])], { encoding: 'utf8' });
  assert.equal(result.error, undefined);
  return { status: result.status, report: JSON.parse(result.stdout), stderr: result.stderr };
}

test('audit resolves nested, root-relative JS and CSS assets without false paths', t => {
  const root = fixture(t);
  const { status, report } = run(root);
  assert.equal(status, 0);
  assert.equal(report.homepagePlayCandidate, 'city.html?terrain=1');
  assert.deepEqual(report.missingFiles, []);
  for (const asset of ['js/nested.js', 'assets/shared.js', 'assets/sky.png']) assert.ok(report.missingCache.includes(asset), asset);
  assert.ok(!report.missingCache.includes('js/assets/shared.js'));
});

test('strict audit fails when service worker returns offline notice', t => {
  const root = fixture(t, { cached: ['index.html','city.html','js/main.js','js/nested.js','assets/shared.js','css/main.css','assets/sky.png'] });
  const { status, report } = run(root, true);
  assert.equal(status, 1);
  assert.equal(report.navigationUsesOfflineNotice, true);
  assert.deepEqual(report.missingCache, []);
});

test('strict audit fails on missing asset even when cached by name', t => {
  const root = fixture(t, { missing: true, cached: ['index.html','city.html','js/main.js','js/nested.js','assets/shared.js','css/main.css','assets/sky.png'] });
  const { status, report } = run(root, true);
  assert.equal(status, 1);
  assert.deepEqual(report.missingFiles, ['assets/shared.js']);
});

test('audit rejects unknown navigation semantics rather than claiming offline success', t => {
  const root = fixture(t, { fallback: 'city.html', cached: ['index.html','city.html','js/main.js','js/nested.js','assets/shared.js','css/main.css','assets/sky.png'] });
  const { status, report } = run(root, true);
  assert.equal(status, 1);
  assert.equal(report.navigationFallbackUnverified, true);
  assert.equal(report.offlineSoloProven, false);
});

test('audit follows nested CSS imports and excludes external or escaping assets', t => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, 'css', 'nested'), { recursive: true });
  fs.appendFileSync(path.join(root, 'css/main.css'),
    '\n@import "./nested/theme.css";\n');
  fs.writeFileSync(path.join(root, 'css/nested/theme.css'),
    'div { background: url("../../assets/sky.png"); }\n' +
    'span { background: url("https://example.com/external.png"); }\n' +
    'i { background: url("../../../../outside.png"); }\n');
  const { status, report } = run(root);
  assert.equal(status, 0);
  assert.deepEqual(report.missingFiles, []);
  assert.ok(report.missingCache.includes('css/nested/theme.css'));
  assert.ok(report.missingCache.includes('assets/sky.png'));
  assert.ok(!report.missingCache.some(asset => asset.includes('outside.png') || asset.includes('example.com')));
});
