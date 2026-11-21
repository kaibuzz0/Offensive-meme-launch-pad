#!/usr/bin/env node
// Analyze real requestAnimationFrame interval captures. No synthetic measurements.
// Input: JSON object {source,device,renderer,route,frameIntervalsMs:[...],startupMs?,transferBytes?,longTasksMs?}
// Example: node scripts/qa-frame-budget.mjs measurements/android-run.json
import { readFileSync } from 'node:fs';
const path=process.argv[2];
if (!path) { console.error('Usage: node scripts/qa-frame-budget.mjs <measurement.json>'); process.exit(2); }
let data;
try { data=JSON.parse(readFileSync(path,'utf8')); }
catch(error) { console.error('Cannot read measurement:',error.message); process.exit(2); }
const frames=data.frameIntervalsMs;
const finiteNonnegative=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
if (!Array.isArray(frames)||frames.length<120||!frames.every(n=>finiteNonnegative(n)&&n>0)) {
 console.error('Expected >=120 positive finite frame intervals in frameIntervalsMs; no result inferred.');
 process.exit(2);
}
for (const field of ['source','device','renderer','route']) {
 if (typeof data[field]!=='string'||!data[field].trim()) {
  console.error('Missing measurement provenance:',field);process.exit(2);
 }
}
if (data.source!=='physical-android'&&data.source!=='emulated-chromium'&&data.source!=='desktop') {
 console.error('source must distinguish physical-android, emulated-chromium, desktop');process.exit(2);
}
for(const field of ['startupMs','transferBytes']) {
 if(data[field]!==undefined&&!finiteNonnegative(data[field])) {console.error('Invalid',field);process.exit(2);}
}
if(data.longTasksMs!==undefined&&(!Array.isArray(data.longTasksMs)||!data.longTasksMs.every(finiteNonnegative))) {
 console.error('Invalid longTasksMs');process.exit(2);
}
const sorted=[...frames].sort((a,b)=>a-b);
const percentile=p=>sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)];
const sum=frames.reduce((a,b)=>a+b,0);
const result={
 provenance:{source:data.source,device:data.device,renderer:data.renderer,route:data.route,commit:data.commit??null},
 frames:frames.length,durationSeconds:sum/1000,
 fpsMean:1000*frames.length/sum,
 frameMs:{p50:percentile(.5),p95:percentile(.95),p99:percentile(.99),max:sorted.at(-1)},
 stallsOver100Ms:frames.filter(n=>n>100).length,
 startupMs:data.startupMs??null,transferBytes:data.transferBytes??null,
 longTaskCount:data.longTasksMs?.length??null,
 longTaskMaxMs:data.longTasksMs?.length?Math.max(...data.longTasksMs):null
};
console.log(JSON.stringify(result,null,2));
// Diagnostic only: thresholds are provisional, not measured release budgets.
if(process.argv.includes('--gate')) {
 const fail=result.frameMs.p95>50||result.stallsOver100Ms>0||(result.startupMs!==null&&result.startupMs>10000);
 if(fail) {console.error('Provisional mobile frame/startup budget exceeded.');process.exitCode=1;}
}
