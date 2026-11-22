#!/usr/bin/env node
// Dependency-free, bounded HTTP resource baseline. This is not browser/Android evidence.
const origin = process.env.MEME_CITY_ORIGIN || 'https://kaibuzz0.github.io/Offensive-meme-launch-pad/';
const paths = ['','city.html','sw.js','offline.html'];
const maxBytes = 12 * 1024 * 1024;
const timeoutMs = 15000;
const results = [];
for (const path of paths) {
  const url = new URL(path, origin);
  if (url.origin !== new URL(origin).origin) throw new Error('Cross-origin audit target');
  const started = performance.now();
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store', redirect: 'follow' });
    const reader = response.body?.getReader();
    let bytes = 0;
    let truncated = false;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxBytes) { truncated = true; await reader.cancel(); break; }
      }
    }
    results.push({
      path: path || '(homepage)', status: response.status,
      finalUrl: response.url, contentType: response.headers.get('content-type'),
      declaredBytes: response.headers.get('content-length'),
      measuredBytes: bytes, truncated,
      cacheControl: response.headers.get('cache-control'),
      durationMs: Math.round(performance.now() - started)
    });
  } catch (error) {
    results.push({ path: path || '(homepage)', error: String(error), durationMs: Math.round(performance.now() - started) });
  }
}
const report = { observedAt: new Date().toISOString(), origin, maxBytes, timeoutMs, evidence: 'Node HTTP only; not browser rendering or Android performance', results };
console.log(JSON.stringify(report, null, 2));
if (results.some(r => r.error || r.status !== 200 || r.truncated)) process.exitCode = 1;
