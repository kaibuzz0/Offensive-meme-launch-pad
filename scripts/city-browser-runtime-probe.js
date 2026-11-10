/* Meme City browser performance probe — paste into DevTools on the actual Play page.
 * Does not change game state or transmit data. Run: await __memeCityQA.stop()
 * Physical Android evidence requires remote debugging on an actual device.
 */
(() => {
  if (globalThis.__memeCityQA) { console.warn('QA probe already active'); return; }
  const started = performance.now(), frames = [], longTasks = [];
  const MAX_FRAME_SAMPLES = 6000, MAX_LONG_TASK_SAMPLES = 2000;
  let frameTotal = 0, longTaskTotal = 0;
  let active = true, last = 0, raf = 0;
  let hiddenTransitions = 0;
  const onVisibility = () => { last = 0; if (document.hidden) hiddenTransitions++; };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
  const percentile = (values, p) => {
    if (!values.length) return null;
    const sorted = [...values].sort((a,b) => a-b);
    return +sorted[Math.ceil(p * sorted.length) - 1].toFixed(2);
  };
  const tick = t => {
    if (!active) return;
    if (typeof document !== 'undefined' && document.hidden) { last = 0; raf = requestAnimationFrame(tick); return; }
    if (last && t - last < 2000) {
      frameTotal++;
      if (frames.length === MAX_FRAME_SAMPLES) frames.shift();
      frames.push(t - last);
    }
    last = t;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  let observer = null;
  try {
    observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (active && entry.startTime >= started) {
          longTaskTotal++;
          if (longTasks.length === MAX_LONG_TASK_SAMPLES) longTasks.shift();
          longTasks.push(entry.duration);
        }
      }
    });
    observer.observe({ type: 'longtask', buffered: true });
  } catch (_) { /* Unsupported browser: explicitly reported below. */ }
  globalThis.__memeCityQA = {
    stop() {
      if (!active) return null;
      // Drain queued entries before disconnecting; late callbacks remain ignored.
      const pending = observer?.takeRecords?.() || [];
      for (const entry of pending) {
        if (entry.startTime >= started) {
          longTaskTotal++;
          if (longTasks.length === MAX_LONG_TASK_SAMPLES) longTasks.shift();
          longTasks.push(entry.duration);
        }
      }
      active = false;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
      const resources = performance.getEntriesByType('resource').filter(entry => entry.startTime >= started);
      const grouped = new Map();
      let transferSizeUnknown = 0;
      for (const entry of resources) {
        // ResourceTiming names normally are absolute URLs, but malformed/opaque
        // entries must not prevent the report or diagnostic cleanup.
        let url;
        try { url = new URL(entry.name, location.href); } catch (_) { continue; }
        if (url.origin !== location.origin) continue;
        const key = url.pathname + url.search;
        const item = grouped.get(key) || { requests: 0, transferBytes: 0, decodedBytes: 0 };
        item.requests++;
        if (entry.transferSize === 0 && entry.decodedBodySize === 0) transferSizeUnknown++;
        item.transferBytes += entry.transferSize || 0;
        item.decodedBytes += entry.decodedBodySize || 0;
        grouped.set(key, item);
      }
      const report = {
        url: location.href,
        userAgent: navigator.userAgent,
        viewportCssPx: { width: globalThis.innerWidth ?? null, height: globalThis.innerHeight ?? null },
        devicePixelRatio: globalThis.devicePixelRatio ?? null,
        hiddenTransitions,
        deviceMemoryGiBHint: navigator.deviceMemory ?? null,
        elapsedMs: Math.round(performance.now() - started),
        probeStartedAfterNavigationMs: Math.round(started),
        startupMeasuredByProbe: false,
        frameSamples: frames.length,
        frameTotal,
        frameSampleLimit: MAX_FRAME_SAMPLES,
        frameMsP50: percentile(frames, .50),
        frameMsP95: percentile(frames, .95),
        frameMsP99: percentile(frames, .99),
        longTaskSupported: !!observer,
        longTaskCount: longTaskTotal,
        longTaskSamples: longTasks.length,
        longTaskSampleLimit: MAX_LONG_TASK_SAMPLES,
        longTaskMsP95: percentile(longTasks, .95),
        resourceCount: resources.length,
        sameOriginTransferBytes: [...grouped.values()].reduce((s,x)=>s+x.transferBytes,0),
        resourceTimingUnknownCount: transferSizeUnknown,
        repeatedSameOriginRequests: [...grouped].filter(([,x])=>x.requests>1).map(([url,x])=>({url,...x})),
        jsHeapUsedBytes: performance.memory?.usedJSHeapSize ?? null,
        notes: 'This DevTools-injected probe starts AFTER page navigation and cannot measure cold startup, initial Play navigation or pre-injection requests; use navigation-start browser automation for startup acceptance. Window-scoped measurements only; percentiles use bounded most-recent samples (6000 frames, 2000 long tasks), while totals cover the full window; repeated requests are not proven duplicate network downloads. Resource timing may omit bytes (cache, cross-origin, browser limits). Hidden-tab intervals are excluded and visibility changes reset frame continuity; RAF intervals are not GPU frame times; heap is Chromium-only. No GPU memory estimate. Identify physical device separately.'
      };
      console.log('Meme City QA performance snapshot', report);
      delete globalThis.__memeCityQA;
      return report;
    }
  };
  console.log('Meme City QA probe running. Travel the fortress-road/interior route, then await __memeCityQA.stop()');
})();
