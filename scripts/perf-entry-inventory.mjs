#!/usr/bin/env node
// Source-level entrypoint inventory; not a browser network or Android performance measurement.
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, extname, relative, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const entries = process.argv.slice(2).length ? process.argv.slice(2) : ['index.html', 'city.html', 'offline.html'];
const results = [];
const seen = new Map();
const localRef = (raw, from) => {
  if (!raw || /^(?:[a-z][a-z\d+.-]*:|\/\/|#|data:)/i.test(raw)) return null;
  const pathname = raw.split(/[?#]/, 1)[0];
  if (!pathname || /\$\{|\{\{|<%/.test(pathname)) return null;
  const file = resolve(pathname.startsWith('/') ? root : dirname(from), pathname.replace(/^\//, ''));
  if (file !== root && !file.startsWith(root + sep)) return null;
  return file;
};
for (const entry of entries) {
  const file = resolve(root, entry);
  if (file !== root && !file.startsWith(root + sep)) throw new Error('Entry outside repository');
  const html = await readFile(file, 'utf8');
  const refs = [];
  const pattern = /<(script|link|img|source)\b[^>]*?\b(src|href)\s*=\s*["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(pattern)) {
    const target = localRef(match[3], file);
    if (!target) continue;
    const key = relative(root, target);
    const item = { path: key, kind: match[1] };
    try {
      const info = await stat(target);
      item.bytes = info.isFile() ? info.size : null;
      if (!info.isFile()) item.warning = 'not a file';
    } catch (error) {
      item.bytes = null;
      item.warning = error.code === 'ENOENT' ? 'missing' : String(error.code || error);
    }
    refs.push(item);
    const previous = seen.get(key) || [];
    previous.push(entry);
    seen.set(key, previous);
  }
  results.push({ entry, htmlBytes: Buffer.byteLength(html), references: refs, referencedBytes: refs.reduce((sum, ref) => sum + (ref.bytes || 0), 0) });
}
const duplicates = [...seen].filter(([, owners]) => owners.length > 1).map(([path, entries]) => ({ path, entries }));
const output = { methodology: 'Static HTML src/href references and filesystem bytes only; excludes dynamic imports, runtime requests, compression, caching, GPU memory, and actual network transfers.', entries: results, repeatedReferences: duplicates };
process.stdout.write(JSON.stringify(output, null, 2) + '\n');
