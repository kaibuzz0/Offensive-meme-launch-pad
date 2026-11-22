// Run in the browser DevTools console after entering the canonical game.
// Non-invasive: samples requestAnimationFrame cadence without changing gameplay.
// Usage: const result = await measureMemeCityFrames({ seconds: 30 }); console.table(result)
export async function measureMemeCityFrames({ seconds = 30 } = {}) {
  if (!Number.isFinite(seconds) || seconds < 1 || seconds > 300) throw new RangeError('seconds must be 1..300');
  if (typeof requestAnimationFrame !== 'function' || typeof performance === 'undefined') {
    throw new Error('Requires a foreground browser window');
  }
  const deltas = [];
  let last;
  const start = performance.now();
  const deadline = start + seconds * 1000;
  await new Promise(resolve => {
    function frame(now) {
      if (last !== undefined && now - last > 0) deltas.push(now - last);
      last = now;
      if (now < deadline) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
  const sorted = deltas.slice().sort((a,b)=>a-b);
  const percentile = p => sorted.length ? sorted[Math.min(sorted.length-1, Math.ceil(p*sorted.length)-1)] : null;
  const durationMs = performance.now()-start;
  return {
    sampleSeconds: +(durationMs/1000).toFixed(2),
    frames: deltas.length,
    fpsObserved: +(deltas.length/(durationMs/1000)).toFixed(1),
    frameP50Ms: percentile(.5),
    frameP95Ms: percentile(.95),
    frameP99Ms: percentile(.99),
    framesOver33ms: deltas.filter(v=>v>33.3).length,
    framesOver50ms: deltas.filter(v=>v>50).length,
    maxFrameMs: sorted.at(-1) ?? null,
    note: 'rAF cadence, not GPU frame time. Background tabs throttle; record device, renderer, route and commit.'
  };
}
