/* Meme City browser performance probe — paste into DevTools on the actual Play page.
 * Does not change game state or transmit data. Run: await __memeCityQA.stop()
 * Physical Android evidence requires remote debugging on an actual device.
 */
(() => {
  if (globalThis.__memeCityQA) { console.warn('QA probe already active'); return; }
  const started = performance.now(), frames = [], longTasks = [];
  let active = true, last = 0, raf = 0;
  const percentile = (values, p) => {
    if (!values.length) return null;
    const sorted = [...values].sort((a,b) => a-b);
    return +sorted[Math.ceil(p * sorted.length) - 1].toFixed(2);
  };
  const tick = t => {
    if (!active) return;
    if (last && t - last < 2000) frames.push(t - last);
    last = t;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  let observer = null;
  try {
    observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) longTasks.push(entry.duration);
    });
    observer.observe({ type: 'longtask', buffered: true });
  } catch (_) { /* Unsupported browser: explicitly reported below. */ }
  globalThis.__memeCityQA = {
    stop() {
      active = false;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      const resources = performance.getEntriesByType('resource');
      const grouped = new Map();
      for (const entry of resources) {
        const url = new URL(entry.name);
        if (url.origin !== location.origin) continue;
        const key = url.pathname + url.search;
        const item = grouped.get(key) || { requests: 0, transferBytes: 0, decodedBytes: 0 };
        item.requests++;
        item.transferBytes += entry.transferSize || 0;
        item.decodedBytes += entry.decodedBodySize || 0;
        grouped.set(key, item);
      }
      const report = {
        url: location.href,
        userAgent: navigator.userAgent,
        deviceMemoryGiBHint: navigator.deviceMemory ?? null,
        elapsedMs: Math.round(performance.now() - started),
        frameSamples: frames.length,
        frameMsP50: percentile(frames, .50),
        frameMsP95: percentile(frames, .95),
        frameMsP99: percentile(frames, .99),
        longTaskSupported: !!observer,
        longTaskCount: longTasks.length,
        longTaskMsP95: percentile(longTasks, .95),
        resourceCount: resources.length,
        sameOriginTransferBytes: [...grouped.values()].reduce((s,x)=>s+x.transferBytes,0),
        duplicateSameOriginRequests: [...grouped].filter(([,x])=>x.requests>1).map(([url,x])=>({url,...x})),
        jsHeapUsedBytes: performance.memory?.usedJSHeapSize ?? null,
        notes: 'RAF frame intervals are not GPU frame times. Cache hits can report zero transfer. Heap is Chromium-only. No GPU memory estimate. Identify physical device separately.'
      };
      console.log('Meme City QA performance snapshot', report);
      delete globalThis.__memeCityQA;
      return report;
    }
  };
  console.log('Meme City QA probe running. Travel the fortress-road/interior route, then await __memeCityQA.stop()');
})();
