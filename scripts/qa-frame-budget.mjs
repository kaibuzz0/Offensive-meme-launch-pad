/**
 * Bounded, dependency-free browser frame-time probe for #47.
 * Run only on the live game page. Synthetic/desktop results are not Android evidence.
 */
export async function sampleFrameTimes({frames=180,maxGapMs=1000,timeoutMs=30000}={}) {
  if (!Number.isInteger(frames)||frames<2||frames>3600) throw new RangeError('frames must be 2..3600');
  if (!(maxGapMs>0&&maxGapMs<=10000)) throw new RangeError('invalid maxGapMs');
  if (!(Number.isFinite(timeoutMs)&&timeoutMs>=100&&timeoutMs<=120000)) throw new RangeError('invalid timeoutMs');
  const all=[],ordinary=[];
  let last=null, interruptions=0, timedOut=false;
  const started=performance.now();
  for(let i=0;i<=frames;i++){
    const remaining=timeoutMs-(performance.now()-started);
    if(remaining<=0){timedOut=true;break;}
    let handle,timer;
    const now=await Promise.race([
      new Promise(resolve=>{handle=requestAnimationFrame(resolve);}),
      new Promise(resolve=>{timer=setTimeout(()=>resolve(null),remaining);})
    ]);
    clearTimeout(timer);
    if(now===null){
      if(typeof cancelAnimationFrame==='function')cancelAnimationFrame(handle);
      timedOut=true;break;
    }
    if(last!==null){
      const dt=now-last;
      if(Number.isFinite(dt)&&dt>=0){
        all.push(dt);
        if(dt>maxGapMs)interruptions++;
        else ordinary.push(dt);
      }
    }
    last=now;
  }
  const sorted=ordinary.slice().sort((a,b)=>a-b);
  const percentile=p=>sorted.length?sorted[Math.min(sorted.length-1,Math.ceil(p*sorted.length)-1)]:null;
  return {
    requestedFrames:frames,measuredFrames:all.length,ordinaryFrames:sorted.length,
    discardedLongGaps:interruptions,interrupted:interruptions>0||timedOut,timedOut,
    medianMs:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),
    maxMs:sorted.at(-1)??null,worstGapMs:all.length?Math.max(...all):null,
    meanMs:sorted.length?sorted.reduce((a,b)=>a+b,0)/sorted.length:null,
    longFrames50Ms:all.filter(x=>x>50).length,
    userAgent:globalThis.navigator?.userAgent??null,
    viewport:{width:globalThis.innerWidth??null,height:globalThis.innerHeight??null,dpr:globalThis.devicePixelRatio??null},
    visibility:globalThis.document?.visibilityState??null,
    memoryBytes:globalThis.performance?.memory?.usedJSHeapSize??null,
    measuredAt:new Date().toISOString()
  };
}
export function summarizeFrameBudget(result,{medianMs=33.3,p95Ms=50}={}){
  if(!result||result.measuredFrames<2||result.interrupted||result.timedOut||result.discardedLongGaps>0)
    return {pass:false,reason:'insufficient or interrupted frame sample'};
  return {pass:result.medianMs<=medianMs&&result.p95Ms<=p95Ms,
    medianPass:result.medianMs<=medianMs,p95Pass:result.p95Ms<=p95Ms,
    note:'Provisional budgets; correlate with startup, interaction, GPU and physical Android traces.'};
}
