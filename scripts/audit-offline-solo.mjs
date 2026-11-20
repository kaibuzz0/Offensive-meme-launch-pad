// Source-level offline Solo readiness audit. This does not replace browser/PWA testing.
// Usage: node scripts/audit-offline-solo.mjs [--require-offline]
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const sw = read('sw.js');
const homepage = read('index.html');
const game = read('city.html');
const shellMatch = sw.match(/const\s+SHELL\s*=\s*\[([\s\S]*?)\]/);
if (!shellMatch) {
  console.error('OFFLINE_AUDIT_INCOMPLETE: unable to identify service-worker shell allowlist');
  process.exitCode = 2;
} else {
  const cached = [...shellMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1]);
  const required = ['index.html', 'city.html'];
  const entry = homepage.match(/href=["'](city\.html\?[^"']+)["']/)?.[1] ?? null;
  const scripts = [...game.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)]
    .map(match => match[1].split('?')[0])
    .filter(src => !/^https?:\/\//.test(src));
  const requiredAssets = [...new Set([...required, ...scripts])];
  const missing = requiredAssets.filter(asset => !cached.includes(asset));
  const report = {
    kind: 'source-only-offline-audit',
    homepagePlayCandidate: entry,
    precacheCount: cached.length,
    requiredAssetCount: requiredAssets.length,
    missing,
    offlineSoloProven: false,
    note: 'Static allowlist audit only; runtime caching, dynamic imports, worker requests, service-worker scope and offline gameplay require Chromium validation.'
  };
  console.log(JSON.stringify(report, null, 2));
  if (process.argv.includes('--require-offline') && missing.length) process.exitCode = 1;
}
