import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { auditOfflineSoloServiceWorker } from './qa-offline-release-audit.mjs';

test('offline audit detects current notice-only service worker without hiding release blocker', () => {
  const result = auditOfflineSoloServiceWorker(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'));
  assert.ok(Array.isArray(result.findings));
  assert.equal(typeof result.readyForBrowserAcceptance, 'boolean');
  assert.match(result.limitations, /Static source heuristic/);
});

test('offline audit distinguishes a game document and game asset policy from icons alone', () => {
  const notice = auditOfflineSoloServiceWorker("const SHELL=['offline.html','assets/icons/app-192.png'];");
  assert.equal(notice.readyForBrowserAcceptance, false);
  const candidate = auditOfflineSoloServiceWorker("const SHELL=['index.html','city.html','offline.html']; const gameAssetCache = true;");
  assert.equal(candidate.readyForBrowserAcceptance, true);
  assert.equal(candidate.findings.length, 0);
});
