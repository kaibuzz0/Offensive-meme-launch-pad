/**
 * Bounded, dependency-free browser frame-time probe for #47.
 * Import into the existing browser smoke harness via page.evaluate, then
 * await sampleFrameTimes({frames: 180}) on the live first-person page.
 * Measurements are browser observations, NOT physical Android evidence.
 */
export async function sampleFrameTimes({frames=180, maxGapMs=1000}={}) {
  if (!Number.isInteger(frames) || frames<2 || frames>3600) throw new RangeError('frames must be 2..3600');
  if (!(maxGapMs>0 && maxGapMs<=10000)) throw new RangeError('invalid maxGapMs');
  const samples=[];
  let last=null, gaps=0;
  for(let i=0;i<=frames;i++){
    const now=await new Promise(resolve=>requestAnimationFrame(resolve));
    if(last!==null){
      const dt=now-last;
      if(dt>maxGapMs) gaps++;
      else if(Number.isFinite(dt) && dt>=0) samples.push(dt);
    }
    last=now;
  }
  const sorted=samples.slice().sort((a,b)=>a-b);
  const percentile=p=>sorted.length?sorted[Math.min(sorted.length-1,Math.ceil(p*sorted.length)-1)]:null;
  const total=sorted.reduce((a,b)=>a+b,0);
  return {
    requestedFrames:frames, measuredFrames:sorted.length, discardedLongGaps:gaps,
    medianMs:percentile(.5), p95Ms:percentile(.95), p99Ms:percentile(.99),
    maxMs:sorted.at(-1)??null, meanMs:sorted.length?total/sorted.length:null,
    longFrames50Ms:sorted.filter(x=>x>50).length,
    userAgent:navigator.userAgent, viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},
    visibility:document.visibilityState,
    memoryBytes:performance.memory?.usedJSHeapSize??null,
    measuredAt:new Date().toISOString()
  };
}

/** Use on an already-loaded game scene; does not create a second renderer. */
export function summarizeFrameBudget(result,{medianMs=33.3,p95Ms=50}={}){
  if(!result || result.measuredFrames<2) return {pass:false,reason:'insufficient frames'};
  return {pass:result.medianMs<=medianMs && result.p95Ms<=p95Ms,
    medianPass:result.medianMs<=medianMs,p95Pass:result.p95Ms<=p95Ms,
    note:'Provisional budgets; correlate with startup, interaction, GPU and physical Android traces.'};
}
