/* Meme City QA: dependency-free, opt-in browser runtime sampler.
 * Paste into DevTools or load as a classic script on a test build.
 * No network calls, persistent storage, or gameplay mutations.
 * Call window.memeCityQaSample.stop() to obtain bounded measurements.
 */
(function () {
  'use strict';
  if (window.memeCityQaSample) return;
  const MAX_FRAMES = 3600;
  const MAX_LONG_TASKS = 500;
  const frames = [];
  const longTasks = [];
  let previous = null;
  let raf = 0;
  let running = true;
  let observer = null;
  function frame(now) {
    if (!running) return;
    if (previous !== null) {
      if (frames.length === MAX_FRAMES) frames.shift();
      frames.push(now - previous);
    }
    previous = now;
    raf = requestAnimationFrame(frame);
  }
  function percentile(sorted, fraction) {
    if (!sorted.length) return null;
    return Number(sorted[Math.ceil(sorted.length * fraction) - 1].toFixed(2));
  }
  try {
    if (typeof PerformanceObserver === 'function' &&
        PerformanceObserver.supportedEntryTypes &&
        PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      observer = new PerformanceObserver(function (list) {
        for (const entry of list.getEntries()) {
          if (longTasks.length === MAX_LONG_TASKS) longTasks.shift();
          longTasks.push(entry.duration);
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    }
  } catch (_) { observer = null; }
  raf = requestAnimationFrame(frame);
  window.memeCityQaSample = {
    stop: function () {
      running = false;
      cancelAnimationFrame(raf);
      if (observer) observer.disconnect();
      const sorted = frames.slice().sort((a, b) => a - b);
      const resources = performance.getEntriesByType('resource');
      const urls = new Set(resources.map(r => r.name));
      const memory = performance.memory;
      const result = {
        source: 'browser-observation-not-physical-android-proof',
        frameCount: frames.length,
        frameMsP50: percentile(sorted, .5),
        frameMsP95: percentile(sorted, .95),
        frameMsP99: percentile(sorted, .99),
        longTaskCount: longTasks.length,
        longTaskMsMax: longTasks.length ? Math.max(...longTasks) : null,
        resourceRequestCount: resources.length,
        uniqueResourceUrlCount: urls.size,
        repeatedResourceRequestCount: resources.length - urls.size,
        jsHeapUsedBytes: memory ? memory.usedJSHeapSize : null,
        caveat: 'rAF includes browser scheduling and background throttling; resource timings may be incomplete; GPU memory is not measured'
      };
      delete window.memeCityQaSample;
      return result;
    }
  };
})();
