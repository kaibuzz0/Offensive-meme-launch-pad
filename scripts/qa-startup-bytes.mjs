// Dependency-free, reproducible static startup inventory. This is NOT a runtime measurement.
// Usage: node scripts/qa-startup-bytes.mjs
import { readFileSync, statSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'city.html'];
const report = { kind: 'source-inventory-not-network-transfer', pages: {}, shared: [], errors: [] };
const pageFiles = new Map();
for (const page of pages) {
  const html = readFileSync(resolve(root, page), 'utf8');
  const refs = [...html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)\s*=\s*["']([^"']+)["'][^>]*>/gi)]
    .map(m => m[1]).filter(x => !/^(?:https?:|data:|#|\/\/)/i.test(x));
  const files = [];
  const seen = new Set();
  for (const ref of refs) {
    let pathname;
    try { pathname = decodeURIComponent(new URL(ref, 'https://example.invalid/' + page).pathname).replace(/^\//, ''); }
    catch { report.errors.push({ page, ref, problem: 'invalid URL' }); continue; }
    const absolute = resolve(root, pathname);
    if (absolute !== root && !absolute.startsWith(root + sep)) {
      report.errors.push({ page, ref, problem: 'outside root' }); continue;
    }
    if (seen.has(pathname)) {
      report.errors.push({ page, ref, problem: 'duplicate reference' }); continue;
    }
    seen.add(pathname);
    try {
      const size = statSync(absolute).size;
      files.push({ path: pathname, bytes: size });
      pageFiles.set(pathname, (pageFiles.get(pathname) || 0) + 1);
    } catch {
      report.errors.push({ page, ref, problem: 'missing local file' });
    }
  }
  report.pages[page] = {
    referencedFiles: files.length,
    referencedBytesUncompressed: files.reduce((sum, file) => sum + file.bytes, 0),
    files
  };
}
report.shared = [...pageFiles].filter(([, count]) => count > 1).map(([path, count]) => ({ path, pages: count }));
console.log(JSON.stringify(report, null, 2));
if (report.errors.length) process.exitCode = 1;
