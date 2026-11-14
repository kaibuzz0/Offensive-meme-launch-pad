import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const pages = ['index.html', 'city.html'];
const scriptsFor = (html) => [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
  .map((match) => match[1]);
const localPath = (src) => {
  const url = new URL(src, 'https://example.invalid/Offensive-meme-launch-pad/');
  if (url.origin !== 'https://example.invalid') return null;
  return decodeURIComponent(url.pathname.replace(/^\/Offensive-meme-launch-pad\//, ''));
};

for (const page of pages) {
  test(`${page}: script resources are present and not loaded twice under different cache keys`, () => {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const scripts = scriptsFor(html);
    assert.ok(scripts.length > 0, 'Expected script resources');
    const seen = new Map();
    for (const src of scripts) {
      const local = localPath(src);
      if (local === null) continue;
      assert.ok(!local.startsWith('/') && !local.split('/').includes('..'), `Unsafe asset path: ${src}`);
      assert.ok(fs.existsSync(path.join(root, local)), `Missing ${page} script: ${src}`);
      assert.ok(!seen.has(local), `Duplicate ${page} script ${local} (both ${seen.get(local)} and ${src})`);
      seen.set(local, src);
    }
    console.log('QA_ENTRY_SCRIPT_INVENTORY', JSON.stringify({
      page, scriptTags: scripts.length, uniqueLocalScripts: seen.size,
      localScriptBytes: [...seen.keys()].reduce((total, file) => total + fs.statSync(path.join(root, file)).size, 0),
      note: 'Static uncompressed source bytes; not network transfer, parse time, RAM, or GPU memory'
    }));
  });
}

test('homepage retains a first-person Play entry and wallet-free Solo recovery during migration', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /href=["']city\.html\?terrain=1["']/);
  assert.match(html, /href=["']city\.html\?release=center-city-v1["']/);
});
