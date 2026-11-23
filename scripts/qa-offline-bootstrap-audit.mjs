// Static offline bootstrap audit. Does not claim browser/offline gameplay acceptance.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const sw = readFileSync(resolve(root, 'sw.js'), 'utf8');
const play = [...html.matchAll(/<a\\b[^>]*class="[^"]*game-direct-play[^"]*"[^>]*href="([^"]+)"/gi)];
const target = play.length === 1 ? play[0][1].replace(/&amp;/g, '&').split('?')[0] : null;
const shell = sw.match(/const SHELL\\s*=\\s*\\[([\\s\\S]*?)\\]/);
const cached = shell ? [...shell[1].matchAll(/['"]([^'"]+)['"]/g)].map(x => x[1]) : [];
const required = ['index.html', target].filter(Boolean);
const missing = required.filter(path => !cached.includes(path));
const result = {
  audit: 'static-offline-bootstrap',
  playCount: play.length,
  playTarget: target,
  cachedShell: cached,
  missingBootstrap: missing,
  caveat: 'Static inspection only. Runtime imports, offline reload, wallet-free play and persisted state require browser tests.'
};
process.stdout.write(JSON.stringify(result, null, 2) + '\\n');
if (process.argv.includes('--strict') && (play.length !== 1 || missing.length)) process.exitCode = 1;
