import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'city.html'];
const scriptTag = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;

function localScripts(html) {
  return [...html.matchAll(scriptTag)]
    .map(match => match[1])
    .filter(src => !/^(?:https?:)?\/\//i.test(src))
    .map(src => decodeURIComponent(src.split(/[?#]/, 1)[0]));
}

test('homepage and game local script inventory resolves without duplicate downloads', t => {
  for (const page of pages) {
    const html = readFileSync(resolve(root, page), 'utf8');
    const scripts = localScripts(html);
    assert.ok(scripts.length, page + ' has no local scripts');
    const duplicates = scripts.filter((src, i) => scripts.indexOf(src) !== i);
    assert.deepEqual(duplicates, [], page + ' includes duplicate script paths');
    let bytes = 0;
    for (const script of scripts) {
      assert.ok(!script.startsWith('/') && !script.split('/').includes('..'),
        page + ': unsafe local script path ' + script);
      const file = resolve(root, script);
      assert.ok(existsSync(file), page + ': missing ' + script);
      bytes += statSync(file).size;
    }
    t.diagnostic(page + ': ' + scripts.length + ' local scripts, ' + bytes +
      ' source bytes (uncompressed, not measured network transfer)');
  }
});
