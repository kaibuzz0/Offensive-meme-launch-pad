// Source-level offline Solo readiness audit; browser/PWA acceptance is still required.
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
  const entry = homepage.match(/href=["'](city\.html\?[^"']+)["']/)?.[1] ?? null;
  const localPath = value => {
    const url = value.trim();
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url)) return null;
    const pathname = url.split(/[?#]/, 1)[0].replace(/^\.\//, '').replace(/^\//, '');
    return pathname && !pathname.startsWith('../') ? pathname : null;
  };
  const linked = html => [
    ...[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(m => m[1]),
    ...[...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
      .filter(m => /rel=["'](?:stylesheet|modulepreload|preload)["']/i.test(m[0])).map(m => m[1])
  ];
  const required = new Set(['index.html', 'city.html']);
  for (const html of [homepage, game]) for (const value of linked(html)) {
    const asset = localPath(value);
    if (asset) required.add(asset);
  }
  // This deliberately does not claim to resolve runtime imports, worker URLs or CSS url().
  // Navigation fallback must return the requested game/homepage document, not an
  // unrelated offline notice. A precache allowlist alone cannot prove this.
  const navigationUsesOfflineNotice = /request\.mode\s*===?\s*['"]navigate['"]/.test(sw)
    && /fetch\(request\)\.catch\([\s\S]*?offline\.html/.test(sw);
  const navigationFallbackUnverified = !navigationUsesOfflineNotice;
  const requiredAssets = [...required].sort();
  const missingFiles = requiredAssets.filter(asset => !fs.existsSync(path.join(root, asset)));
  const missingCache = requiredAssets.filter(asset => !cached.includes(asset));
  const report = {
    kind: 'source-only-offline-audit',
    homepagePlayCandidate: entry,
    precacheCount: cached.length,
    requiredAssetCount: requiredAssets.length,
    missingFiles,
    missingCache,
    navigationUsesOfflineNotice,
    navigationFallbackUnverified,
    offlineSoloProven: false,
    note: 'Static HTML dependencies and navigation-fallback heuristic only. Dynamic imports, workers, CSS url(), runtime cache, service-worker scope and offline gameplay require Chromium validation.'
  };
  console.log(JSON.stringify(report, null, 2));
  if (process.argv.includes('--require-offline') && (missingFiles.length || missingCache.length || navigationUsesOfflineNotice || navigationFallbackUnverified)) process.exitCode = 1;
}
