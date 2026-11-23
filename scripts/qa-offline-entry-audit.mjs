import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => readFileSync(resolve(root, name), 'utf8');
const getAssets = (html) => [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/gi)]
  .map((match) => match[1].split('?')[0].split('#')[0])
  .filter((path) => path && !/^(?:https?:|\/\/|data:)/i.test(path) && /\.(?:js|css)$/.test(path));
const entries = ['index.html', 'city.html'];
const dependencies = Object.fromEntries(entries.map((entry) => [entry, [...new Set(getAssets(read(entry)))] ]));
const sw = read('sw.js');
const precache = [...sw.matchAll(/['"]([^'"]+\.(?:html|js|css))['"]/g)].map((m) => m[1]);
const missing = [...new Set([...entries, ...Object.values(dependencies).flat()])].filter((name) => !precache.includes(name));
const result = {
  entries: Object.fromEntries(entries.map((entry) => [entry, { scriptsAndStyles: dependencies[entry].length }])),
  staticPrecache: precache,
  missingFromStaticPrecache: missing,
  note: 'Static precache audit only. Runtime cache-on-visit, imports, and real offline navigation require separate browser verification.'
};
console.log(JSON.stringify(result, null, 2));
if (process.argv.includes('--require-static-offline') && missing.length) process.exitCode = 1;
