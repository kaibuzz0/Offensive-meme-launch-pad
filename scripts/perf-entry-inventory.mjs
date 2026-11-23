#!/usr/bin/env node
// Source-level startup inventory; no browser-performance claims.
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'city.html'];
const results = [];
for (const page of pages) {
  const html = await readFile(resolve(root, page), 'utf8');
  const refs = [];
  for (const match of html.matchAll(/<(script|link)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    const url = match[2];
    if (/^(?:https?:|\/\/|data:|#)/i.test(url)) continue;
    const local = decodeURIComponent(url.split(/[?#]/, 1)[0]);
    if (!local || local.startsWith('/') || local.split('/').includes('..')) continue;
    refs.push(local);
  }
  const counts = new Map();
  for (const path of refs) counts.set(path, (counts.get(path) || 0) + 1);
  const assets = [];
  for (const [path, references] of counts) {
    let bytes = null;
    try {
      const info = await stat(resolve(root, path));
      if (info.isFile()) bytes = info.size;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    assets.push({ path, references, bytes });
  }
  results.push({
    page,
    htmlBytes: Buffer.byteLength(html),
    referencedAssetBytes: assets.reduce((sum, asset) => sum + (asset.bytes || 0), 0),
    missing: assets.filter(asset => asset.bytes === null).map(asset => asset.path),
    duplicateReferences: assets.filter(asset => asset.references > 1).map(asset => asset.path),
    assets
  });
}
console.log(JSON.stringify({ kind: 'source-entry-inventory', note: 'Uncompressed static source sizes, not network transfers or runtime memory.', pages: results }, null, 2));
if (results.some(page => page.missing.length)) process.exitCode = 1;
