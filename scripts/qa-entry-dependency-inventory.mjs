#!/usr/bin/env node
// Dependency-free source-level inventory. Not a substitute for network or Android profiling.
import { readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'city.html'];
const record = { kind: 'source-inventory', measuredAt: new Date().toISOString(), pages: {}, warnings: [], proposedBudgets: {
  firstPlayableSecondsP75: 8, frameMsP95: 33.3, interactionStallMsMax: 200,
  longTaskMsMax: 50, warmReloadSecondsP75: 4, startupTransferBytes: 4 * 1024 * 1024
}};
const local = (url) => {
  if (/^(?:https?:|data:|blob:|\/\/|#)/i.test(url)) return null;
  const pathname = url.split(/[?#]/)[0].replace(/^\//, '');
  if (!pathname || pathname.includes('..')) return null;
  return pathname;
};
for (const page of pages) {
  const html = readFileSync(resolve(root, page), 'utf8');
  const refs = [];
  for (const match of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
    const tag = match[0], kind = match[1].toLowerCase();
    if (kind === 'link' && !/rel=["']stylesheet["']/i.test(tag)) continue;
    const attr = kind === 'script' ? 'src' : 'href';
    const value = tag.match(new RegExp('\\b' + attr + '=["\\x27]([^"\\x27]+)["\\x27]', 'i'))?.[1];
    if (value) refs.push({ kind, url: value, path: local(value) });
  }
  const byPath = new Map();
  let sourceBytes = 0;
  for (const ref of refs) {
    if (!ref.path) continue;
    const filepath = resolve(root, ref.path);
    ref.exists = existsSync(filepath);
    ref.bytes = ref.exists ? statSync(filepath).size : null;
    if (ref.exists) sourceBytes += ref.bytes;
    else record.warnings.push(page + ': missing dependency ' + ref.path);
    byPath.set(ref.path, (byPath.get(ref.path) || 0) + 1);
  }
  const duplicates = [...byPath].filter(([, count]) => count > 1).map(([path, count]) => ({ path, count }));
  if (duplicates.length) record.warnings.push(page + ': duplicate dependency references ' + JSON.stringify(duplicates));
  record.pages[page] = {
    htmlBytes: Buffer.byteLength(html), dependencyCount: refs.length, referencedSourceBytes: sourceBytes,
    duplicatePaths: duplicates, dependencies: refs
  };
}
const home = readFileSync(resolve(root, 'index.html'), 'utf8');
const playLinks = [...home.matchAll(/href=["']([^"']*city\.html[^"']*)["']/g)].map(x => x[1].replace(/&amp;/g, '&'));
record.homepageGameEntryUrls = [...new Set(playLinks)];
if (record.homepageGameEntryUrls.length > 1) record.warnings.push('Homepage exposes multiple game URLs; canonical-entry consolidation incomplete');
record.notes = [
  'Source bytes are not transfer bytes; compression, HTTP caching, dynamic imports, worker requests and runtime assets are unmeasured.',
  'Proposed budgets are provisional QA targets, not achieved measurements or release certification.',
  'Run real phone-sized Chromium and physical Android acceptance before claiming startup, FPS, memory or offline Solo.'
];
console.log(JSON.stringify(record, null, 2));
if (record.warnings.some(x => x.includes('missing dependency'))) process.exitCode = 1;
