// Paste into DevTools on the *actual* homepage Play destination, after starting Solo.
// Zero dependencies; this is a diagnostic sampler, not a claim of Android testing.
// Use the same 30-second route on each renderer; compare reports and record device metadata.
(async () => {
  const durationMs = 30000;
  // Keep a larger resource timing buffer so late-session asset loads are not silently dropped.
  performance.setResourceTimingBufferSize?.(3000);
  const initialVisibility = document.visibilityState;
  let hiddenDuringSample = initialVisibility !== 'visible';
  const onVisibility = () => { if (document.visibilityState !== 'visible') hiddenDuringSample = true; };
  document.addEventListener('visibilitychange', onVisibility);
  const frames = [];
  const longTasks = [];
  const start = performance.now();
  let lastFrame = 0;
  let active = true;
  const observer = typeof PerformanceObserver === 'function'
    ? new PerformanceObserver(list => {
        for (const entry of list.getEntries()) longTasks.push({ start: entry.startTime, duration: entry.duration });
      }) : null;
  try { observer?.observe({ type: 'longtask', buffered: true }); } catch { /* unsupported */ }
  function frame(t) {
    if (!active) return;
    if (lastFrame) frames.push(t - lastFrame);
    lastFrame = t;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  await new Promise(resolve => setTimeout(resolve, durationMs));
  active = false;
  observer?.disconnect();
  document.removeEventListener('visibilitychange', onVisibility);
  const sorted = frames.filter(Number.isFinite).sort((a, b) => a - b);
  const percentile = p => sorted.length ? +sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)].toFixed(2) : null;
  const resources = performance.getEntriesByType('resource');
  const navigation = performance.getEntriesByType('navigation')[0];
  const groups = new Map();
  for (const r of resources) {
    const key = r.name.split('?')[0];
    const g = groups.get(key) || { url: key, requests: 0, transferBytes: 0, encodedBytes: 0 };
    g.requests++;
    g.transferBytes += r.transferSize || 0;
    g.encodedBytes += r.encodedBodySize || 0;
    groups.set(key, g);
  }
  const report = {
    url: location.href,
    userAgent: navigator.userAgent,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    durationMs: Math.round(performance.now() - start),
    visibility: { initial: initialVisibility, hiddenDuringSample },
    navigation: navigation ? { type: navigation.type, durationMs: Math.round(navigation.duration),
      transferBytes: navigation.transferSize || 0, domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
      loadEventMs: Math.round(navigation.loadEventEnd) } : null,
    frameMs: { p50: percentile(.5), p95: percentile(.95), p99: percentile(.99), samples: sorted.length },
    longTasks: { count: longTasks.length, maxMs: longTasks.length ? Math.max(...longTasks.map(t => t.duration)) : 0 },
    resources: { count: resources.length, transferBytes: resources.reduce((n, r) => n + (r.transferSize || 0), 0),
      duplicates: [...groups.values()].filter(g => g.requests > 1).sort((a, b) => b.requests - a.requests) },
    jsHeapBytes: performance.memory?.usedJSHeapSize ?? null,
    notes: 'This script starts AFTER Play, so navigation timing is NOT first-playable timing. Resource timing may omit earlier entries when buffers overflow. transferSize can be zero for cache hits/cross-origin resources; repeated URLs do not prove duplicate downloads. Hidden tabs throttle rAF; discard hidden samples. Not GPU/total-RAM profiling.'
  };
  console.log('MEME_CITY_RUNTIME_SAMPLE', JSON.stringify(report, null, 2));
  return report;
})();
