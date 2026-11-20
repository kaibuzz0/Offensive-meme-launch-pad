// Static, dependency-free release diagnostic; not a substitute for browser offline acceptance.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function auditOfflineSoloServiceWorker(source) {
  const shellMatch = source.match(/\bconst\s+SHELL\s*=\s*\[([\s\S]*?)\]/);
  const shell = shellMatch ? [...shellMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1]) : [];
  const gameDocuments = shell.filter(path => /(?:^|\/)(?:index|city)\.html(?:\?|$)/i.test(path));
  const hasGameAssetPolicy = /(?:game|solo|terrain)[\w-]*(?:asset|cache)|(?:asset|cache)[\w-]*(?:game|solo|terrain)/i.test(source);
  const hasNavigationFallback = /offline\.html/.test(source) && /request\.mode\s*===\s*['"]navigate['"]/.test(source);
  const findings = [];
  if (!gameDocuments.length) findings.push('No playable homepage/game document in explicit precache list');
  if (!hasGameAssetPolicy) findings.push('No identifiable game-asset cache policy; inspect dynamic imports and workers');
  if (hasNavigationFallback && !gameDocuments.length) findings.push('Offline navigation appears to return notice rather than game');
  return { readyForBrowserAcceptance: findings.length === 0, shell, findings,
    limitations: 'Static source heuristic only; passing does not prove offline gameplay or cache safety' };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = auditOfflineSoloServiceWorker(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'));
  console.log(JSON.stringify(result, null, 2));
  if (process.argv.includes('--strict') && !result.readyForBrowserAcceptance) process.exitCode = 1;
}
