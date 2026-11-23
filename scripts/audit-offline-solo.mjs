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
  // Track all public game links, including temporary legacy/compatibility routes.
  // They are migration inventory, not evidence that those modes are separate releases.
  const homepageGameRoutes = [...new Set([...homepage.matchAll(/href=["'](city\.html(?:\?[^"']*)?)["']/gi)]
    .map(match => match[1].replace(/&amp;/g, '&')))];
  const localPath = value => {
    const url = value.trim();
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url)) return null;
    const pathname = url.split(/[?#]/, 1)[0].replace(/^\.\//, '').replace(/^\//, '');
    return pathname || null;
  };
  const linked = html => [
    ...[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(m => m[1]),
    ...[...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
      .filter(m => /rel=["'](?:stylesheet|modulepreload|preload)["']/i.test(m[0])).map(m => m[1])
  ];
  const required = new Set(['index.html', 'city.html']);
  for (const html of [homepage, game]) for (const value of linked(html)) {
    const asset = localPath(value);
    if (asset && !asset.startsWith('../')) required.add(asset);
  }
  // Traverse statically identifiable local JS/CSS dependencies, including workers and
  // CSS url() resources. Dynamic expressions remain an explicit browser-test gap.
  const scanned = new Set();
  const queue = [...required].filter(asset => /\.(?:js|mjs|css)$/i.test(asset));
  const resolveLocal = (from, value) => {
    const asset = localPath(value);
    if (!asset) return null;
    // Root-relative references resolve from the PWA scope root, not the importing
    // module's directory. Otherwise /assets/foo.js inside js/main.js is
    // incorrectly reported as js/assets/foo.js.
    const resolved = value.trim().startsWith('/')
      ? path.posix.normalize(asset)
      : path.posix.normalize(path.posix.join(path.posix.dirname(from), asset));
    return resolved.startsWith('../') || resolved === '..' ? null : resolved;
  };
  while (queue.length) {
    const asset = queue.shift();
    if (scanned.has(asset)) continue;
    scanned.add(asset);
    const absolute = path.join(root, asset);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
    const source = fs.readFileSync(absolute, 'utf8');
    const refs = [];
    if (/\.css$/i.test(asset)) {
      for (const m of source.matchAll(/url\(\s*['"]?([^)'"]+)['"]?\s*\)/gi)) refs.push(m[1]);
      for (const m of source.matchAll(/@import\s+(?:url\()?\s*['"]([^'"]+)['"]/gi)) refs.push(m[1]);
    } else {
      for (const m of source.matchAll(/(?:import\s*(?:[^'"]*?\sfrom\s*)?|export\s+[^'"]*?\sfrom\s*|import\s*\(|new\s+(?:Shared)?Worker\s*\(|importScripts\s*\()\s*['"]([^'"]+)['"]/g)) refs.push(m[1]);
      for (const m of source.matchAll(/new\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url/g)) refs.push(m[1]);
    }
    for (const ref of refs) {
      const dependency = resolveLocal(asset, ref);
      if (!dependency) continue;
      required.add(dependency);
      if (/\.(?:js|mjs|css)$/i.test(dependency)) queue.push(dependency);
    }
  }
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
    homepageGameRoutes,
    multiplePublicGameRoutes: homepageGameRoutes.length > 1,
    precacheCount: cached.length,
    requiredAssetCount: requiredAssets.length,
    scannedSourceCount: scanned.size,
    missingFiles,
    missingCache,
    navigationUsesOfflineNotice,
    navigationFallbackUnverified,
    offlineSoloProven: false,
    note: 'Static HTML plus literal JS imports/worker URLs and CSS dependencies; computed imports, runtime fetches, cache scope and offline gameplay still require Chromium validation.'
  };
  console.log(JSON.stringify(report, null, 2));
  if (process.argv.includes('--require-offline') && (missingFiles.length || missingCache.length || navigationUsesOfflineNotice || navigationFallbackUnverified)) process.exitCode = 1;
}
