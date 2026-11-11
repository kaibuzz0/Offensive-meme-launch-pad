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
  const initialVisibility=globalThis.document?.visibilityState??null;
  let visibilityChanged=false;
  const visibilityListener=()=>{visibilityChanged=true;};
  globalThis.document?.addEventListener?.('visibilitychange',visibilityListener);
  const started=performance.now();
  try {
  for(let i=0;i<=frames;i++){
    const remaining=timeoutMs-(performance.now()-started);
    if(remaining<=0){timedOut=true;break;}
    let handle,timer;
    const now=await Promise.race([
      new Promise(resolve=>{handle=requestAnimationFrame(resolve);}),
      new Promise(resolve=>{timer=setTimeout(()=>resolve(null),remaining);})
    ]);
    clearTimeout(timer);
    if((globalThis.document?.visibilityState??null)!==initialVisibility)visibilityChanged=true;
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
  } finally {
    globalThis.document?.removeEventListener?.('visibilitychange',visibilityListener);
  }
  const wallClockMs=performance.now()-started;
  const sorted=ordinary.slice().sort((a,b)=>a-b);
  const percentile=p=>sorted.length?sorted[Math.min(sorted.length-1,Math.ceil(p*sorted.length)-1)]:null;
  return {
    requestedFrames:frames,measuredFrames:all.length,ordinaryFrames:sorted.length,
    wallClockMs,frameCoverage:all.length/frames,
    discardedLongGaps:interruptions,interrupted:interruptions>0||timedOut||visibilityChanged,timedOut,visibilityChanged,
    medianMs:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),
    maxMs:sorted.at(-1)??null,worstGapMs:all.length?Math.max(...all):null,
    meanMs:sorted.length?sorted.reduce((a,b)=>a+b,0)/sorted.length:null,
    longFrames50Ms:all.filter(x=>x>50).length,
    longFrames100Ms:all.filter(x=>x>100).length,
    longFrames250Ms:all.filter(x=>x>250).length,
    userAgent:globalThis.navigator?.userAgent??null,
    viewport:{width:globalThis.innerWidth??null,height:globalThis.innerHeight??null,dpr:globalThis.devicePixelRatio??null},
    visibility:globalThis.document?.visibilityState??null,
    memoryBytes:globalThis.performance?.memory?.usedJSHeapSize??null,
    measuredAt:new Date().toISOString()
  };
}
export function summarizeFrameBudget(result,{medianMs=33.3,p95Ms=50}={}){
  if(!Number.isFinite(medianMs)||medianMs<=0||!Number.isFinite(p95Ms)||p95Ms<=0||medianMs>p95Ms)
    return {pass:false,reason:'invalid frame budget thresholds'};
  if(!result||typeof result.interrupted!=='boolean'||typeof result.timedOut!=='boolean'||typeof result.visibilityChanged!=='boolean'||!Number.isInteger(result.requestedFrames)||result.measuredFrames!==result.requestedFrames||result.measuredFrames<2||result.interrupted||result.timedOut||result.visibilityChanged||(result.visibility!=null&&result.visibility!=='visible')||(!Number.isInteger(result.discardedLongGaps)||result.discardedLongGaps!==0)||![result.medianMs,result.p95Ms,result.p99Ms,result.worstGapMs].every(v=>Number.isFinite(v)&&v>=0)||result.medianMs>result.p95Ms||result.p95Ms>result.p99Ms||result.p99Ms>result.worstGapMs||!Number.isFinite(result.frameCoverage)||result.frameCoverage!==1||!Number.isInteger(result.ordinaryFrames)||result.ordinaryFrames!==result.measuredFrames-result.discardedLongGaps||!['longFrames50Ms','longFrames100Ms','longFrames250Ms'].every(k=>Number.isInteger(result[k])&&result[k]>=0&&result[k]<=result.measuredFrames)||result.longFrames250Ms>result.longFrames100Ms||result.longFrames100Ms>result.longFrames50Ms)
    return {pass:false,reason:'insufficient or interrupted frame sample'};
  return {pass:result.medianMs<=medianMs&&result.p95Ms<=p95Ms,
    medianPass:result.medianMs<=medianMs,p95Pass:result.p95Ms<=p95Ms,
    note:'Provisional budgets; correlate with startup, interaction, GPU and physical Android traces.'};
}
