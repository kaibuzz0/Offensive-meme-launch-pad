#!/usr/bin/env node
// Read-only, dependency-free startup inventory. Does not claim runtime transfer or GPU costs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'city.html'];
const report = { kind: 'source-startup-inventory', pages: {}, limitations: [
  'Source file bytes are not compressed network transfer bytes.',
  'Dynamic imports, CSS url() dependencies, worker requests, cache hits and runtime fetches are not measured.',
  'Run browser CDP network and frame profiling for actual Android-class budgets.'
]};
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const references = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
    .map(match => match[1]);
  const seen = new Map();
  const scripts = [];
  for (const reference of references) {
    const relative = reference.split(/[?#]/, 1)[0];
    if (/^(?:[a-z]+:|\/\/|\/)/i.test(relative) || relative.includes('..')) {
      scripts.push({ reference, externalOrUnsafe: true });
      continue;
    }
    const file = path.join(root, relative);
    const exists = fs.existsSync(file) && fs.statSync(file).isFile();
    const bytes = exists ? fs.statSync(file).size : null;
    scripts.push({ reference, file: relative, bytes, exists });
    seen.set(relative, (seen.get(relative) || 0) + 1);
  }
  const duplicateScripts = [...seen].filter(([, count]) => count > 1)
    .map(([file, count]) => ({ file, count }));
  report.pages[page] = {
    htmlBytes: Buffer.byteLength(html),
    scriptCount: references.length,
    uniqueLocalScripts: seen.size,
    declaredScriptBytes: scripts.reduce((sum, script) => sum + (script.bytes || 0), 0),
    missingScripts: scripts.filter(script => script.exists === false).map(script => script.file),
    duplicateScripts,
    scripts
  };
}
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
if (Object.values(report.pages).some(page => page.missingScripts.length || page.duplicateScripts.length)) {
  process.exitCode = 1;
}
