// Opt-in browser runtime probe. Does not alter game state or send telemetry.
// In DevTools: const p = await import('./scripts/perf-browser-probe.mjs'); const stop = p.startProbe();
// Play the fortress -> road -> interior route, then: console.log(stop()).
export function summarize(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const percentile = (p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)] : null;
  return { count: sorted.length, p50: percentile(.5), p95: percentile(.95), p99: percentile(.99), max: sorted.at(-1) ?? null };
}
export function startProbe({ maxFrames = 36000, maxLongTasks = 1000 } = {}) {
  const frames = [];
  const longTasks = [];
  const started = performance.now();
  const initialResources = new Set(performance.getEntriesByType('resource').map(e => e.name));
  let previous = null;
  let raf = 0;
  let running = true;
  const tick = now => {
    if (!running) return;
    if (previous !== null && frames.length < maxFrames) frames.push(now - previous);
    previous = now;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  let observer = null;
  if (typeof PerformanceObserver !== 'undefined') {
    try {
      observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) if (longTasks.length < maxLongTasks) longTasks.push(entry.duration);
      });
      observer.observe({ type: 'longtask', buffered: false });
    } catch { observer = null; }
  }
  return function stopProbe() {
    running = false;
    cancelAnimationFrame(raf);
    observer?.disconnect();
    const resources = performance.getEntriesByType('resource').filter(e => !initialResources.has(e.name));
    const transferBytes = resources.reduce((sum, e) => sum + (Number.isFinite(e.transferSize) ? e.transferSize : 0), 0);
    const duplicateUrls = [...resources.reduce((counts, e) => counts.set(e.name, (counts.get(e.name) || 0) + 1), new Map())]
      .filter(([, count]) => count > 1).map(([url, count]) => ({ url, count }));
    const memory = performance.memory ? { usedJSHeapSize: performance.memory.usedJSHeapSize, jsHeapSizeLimit: performance.memory.jsHeapSizeLimit } : null;
    return {
      elapsedMs: Math.round(performance.now() - started),
      frameIntervalsMs: summarize(frames),
      longTasksMs: summarize(longTasks),
      resourceEntries: resources.length,
      transferBytesReported: transferBytes,
      duplicateUrls,
      memory,
      limitations: 'Frame intervals include display scheduling and background throttling. Resource transferSize may be zero for cached/cross-origin resources. JS heap is Chromium-only. No GPU/OS RAM measurement. Run on physical Android separately.'
    };
  };
}
