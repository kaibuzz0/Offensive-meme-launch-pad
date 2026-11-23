#!/usr/bin/env node
// Dependency-free HTTP-only resource baseline. Not evidence of browser/Android gameplay.
const origin = new URL(process.env.MEME_CITY_ORIGIN || 'https://kaibuzz0.github.io/Offensive-meme-launch-pad/');
if (!['https:', 'http:'].includes(origin.protocol)) throw new Error('HTTP(S) origin required');
const paths = ['', 'city.html', 'sw.js', 'offline.html'];
const maxBytes = 12 * 1024 * 1024;
const timeoutMs = 15000;
const maxRedirects = 5;
const results = [];

async function fetchBounded(start, signal) {
  let url = start;
  let redirects = 0;
  while (true) {
    if (url.origin !== origin.origin) throw new Error('Cross-origin redirect refused');
    const response = await fetch(url, { signal, cache: 'no-store', redirect: 'manual' });
    if (![301, 302, 303, 307, 308].includes(response.status)) return { response, redirects };
    if (++redirects > maxRedirects) throw new Error('Redirect limit exceeded');
    const location = response.headers.get('location');
    if (!location) throw new Error('Redirect without Location');
    url = new URL(location, url);
  }
}

for (const path of paths) {
  const url = new URL(path, origin);
  if (url.origin !== origin.origin) throw new Error('Cross-origin audit target');
  const started = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { response, redirects } = await fetchBounded(url, controller.signal);
    let bytes = 0;
    let truncated = false;
    const reader = response.body?.getReader();
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const remaining = maxBytes - bytes;
          bytes += Math.min(remaining, value.byteLength);
          if (value.byteLength > remaining || (bytes === maxBytes && Number(response.headers.get('content-length')) > maxBytes)) {
            truncated = true;
            await reader.cancel();
            break;
          }
        }
      } finally {
        reader.releaseLock();
      }
    }
    results.push({
      path: path || '(homepage)', status: response.status,
      finalUrl: response.url, redirects,
      contentType: response.headers.get('content-type'),
      declaredBytes: response.headers.get('content-length'),
      measuredBytes: bytes, truncated,
      cacheControl: response.headers.get('cache-control'),
      durationMs: Math.round(performance.now() - started)
    });
  } catch (error) {
    results.push({ path: path || '(homepage)', error: String(error), durationMs: Math.round(performance.now() - started) });
  } finally {
    clearTimeout(timeout);
  }
}
const report = { observedAt: new Date().toISOString(), origin: origin.href, maxBytes, timeoutMs, evidence: 'Node HTTP only; not browser rendering or Android performance', results };
console.log(JSON.stringify(report, null, 2));
if (results.some(r => r.error || r.status !== 200 || r.truncated)) process.exitCode = 1;
