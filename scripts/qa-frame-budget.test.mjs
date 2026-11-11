import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleFrameTimes,summarizeFrameBudget} from './qa-frame-budget.mjs';

test('bounded frame probe measures percentiles and reports discarded gaps',async()=>{
 let tick=0;
 const original={raf:globalThis.requestAnimationFrame,navigator:globalThis.navigator,innerWidth:globalThis.innerWidth,innerHeight:globalThis.innerHeight,devicePixelRatio:globalThis.devicePixelRatio};
 try{
  globalThis.requestAnimationFrame=cb=>{tick+=tick===40?1200:20;queueMicrotask(()=>cb(tick));};
  Object.defineProperty(globalThis,'navigator',{value:{userAgent:'synthetic-test'},configurable:true});
  globalThis.innerWidth=412;globalThis.innerHeight=915;globalThis.devicePixelRatio=2;
  const result=await sampleFrameTimes({frames:60});
  assert.equal(result.measuredFrames,60);
  assert.equal(result.discardedLongGaps,1);
  assert.equal(result.medianMs,20);
  assert.equal(result.p95Ms,20);
  assert.equal(result.viewport.width,412);
  assert.equal(result.worstGapMs,1200);
  assert.equal(result.frameCoverage,1);
  assert.equal(result.longFrames100Ms,1);
  assert.equal(result.longFrames250Ms,1);
  assert.ok(result.wallClockMs>=0);
  assert.equal(result.interrupted,true);
  assert.equal(summarizeFrameBudget(result).pass,false);
  assert.equal(summarizeFrameBudget(result,{medianMs:16,p95Ms:16}).pass,false);
 }finally{
  globalThis.requestAnimationFrame=original.raf;
  if(original.navigator===undefined)delete globalThis.navigator;
  else Object.defineProperty(globalThis,'navigator',{value:original.navigator,configurable:true});
  for(const k of ['innerWidth','innerHeight','devicePixelRatio']){
   if(original[k]===undefined)delete globalThis[k];else globalThis[k]=original[k];
  }
 }
});
test('probe times out rather than hanging on a stopped animation loop',async()=>{
 const original=globalThis.requestAnimationFrame;
 try{
  globalThis.requestAnimationFrame=()=>1;
  const result=await sampleFrameTimes({frames:5,timeoutMs:100});
  assert.equal(result.timedOut,true);
  assert.equal(result.frameCoverage,0);
  assert.ok(result.wallClockMs>=90);
  assert.equal(summarizeFrameBudget(result).pass,false);
 }finally{globalThis.requestAnimationFrame=original;}
});
test('probe rejects unbounded work',async()=>{
 await assert.rejects(sampleFrameTimes({frames:3601}),RangeError);
 await assert.rejects(sampleFrameTimes({frames:1}),RangeError);
 await assert.rejects(sampleFrameTimes({frames:5,maxGapMs:0}),RangeError);
});

test('budget gate rejects incomplete samples even if percentile numbers look healthy',()=>{
 const sample={requestedFrames:180,measuredFrames:2,medianMs:16,p95Ms:16,p99Ms:17,worstGapMs:18,interrupted:false,timedOut:false,visibilityChanged:false,discardedLongGaps:0,ordinaryFrames:2,frameCoverage:1,longFrames50Ms:0,longFrames100Ms:0,longFrames250Ms:0};
 assert.equal(summarizeFrameBudget(sample).pass,false);
 assert.equal(summarizeFrameBudget({...sample,measuredFrames:180,ordinaryFrames:180}).pass,true);
});

test('budget gate rejects hidden-tab samples even with good percentiles',()=>{
 const sample={requestedFrames:60,measuredFrames:60,medianMs:16,p95Ms:17,p99Ms:18,worstGapMs:19,interrupted:false,timedOut:false,visibilityChanged:false,discardedLongGaps:0,ordinaryFrames:60,frameCoverage:1,longFrames50Ms:0,longFrames100Ms:0,longFrames250Ms:0};
 assert.equal(summarizeFrameBudget({...sample,visibility:'hidden'}).pass,false);
 assert.equal(summarizeFrameBudget({...sample,visibility:'prerender'}).pass,false);
 assert.equal(summarizeFrameBudget({...sample,visibility:'unloaded'}).pass,false);
 assert.equal(summarizeFrameBudget({...sample,visibilityChanged:true}).pass,false);
 assert.equal(summarizeFrameBudget({...sample,visibility:'visible',visibilityChanged:false}).pass,true);
});
test('visibility transition during sampling invalidates otherwise complete data',async()=>{
 const previousRaf=globalThis.requestAnimationFrame;
 const previousDocument=globalThis.document;
 let ticks=0;
 const doc={visibilityState:'visible'};
 try{
  globalThis.document=doc;
  globalThis.requestAnimationFrame=cb=>{
   ticks++;
   if(ticks===3)doc.visibilityState='hidden';
   queueMicrotask(()=>cb(ticks*16));
   return ticks;
  };
  const sample=await sampleFrameTimes({frames:5});
  assert.equal(sample.measuredFrames,5);
  assert.equal(sample.visibilityChanged,true);
  assert.equal(sample.interrupted,true);
  assert.equal(summarizeFrameBudget(sample).pass,false);
 }finally{
  if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
  if(previousRaf===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=previousRaf;
 }
});

test('brief visibility transitions between frames invalidate sample and unregister listener',async()=>{
 const previousRaf=globalThis.requestAnimationFrame;
 const previousDocument=globalThis.document;
 let ticks=0, listener=null, removals=0;
 const doc={
  visibilityState:'visible',
  addEventListener:(name,fn)=>{assert.equal(name,'visibilitychange');listener=fn;},
  removeEventListener:(name,fn)=>{assert.equal(name,'visibilitychange');assert.equal(fn,listener);removals++;}
 };
 try{
  globalThis.document=doc;
  globalThis.requestAnimationFrame=cb=>{
   ticks++;
   if(ticks===3){
    doc.visibilityState='hidden';listener();
    doc.visibilityState='visible';listener();
   }
   queueMicrotask(()=>cb(ticks*16));
   return ticks;
  };
  const sample=await sampleFrameTimes({frames:5});
  assert.equal(sample.measuredFrames,5);
  assert.equal(sample.visibility,'visible');
  assert.equal(sample.visibilityChanged,true);
  assert.equal(summarizeFrameBudget(sample).pass,false);
  assert.equal(removals,1);
 }finally{
  if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
  if(previousRaf===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=previousRaf;
 }
});

test('budget gate rejects missing, nonfinite, and negative metrics',()=>{
 const sample={requestedFrames:60,measuredFrames:60,medianMs:16,p95Ms:17,p99Ms:18,worstGapMs:20,interrupted:false,timedOut:false,visibilityChanged:false,discardedLongGaps:0,ordinaryFrames:60,frameCoverage:1,longFrames50Ms:0,longFrames100Ms:0,longFrames250Ms:0,visibility:'visible'};
 assert.equal(summarizeFrameBudget(sample).pass,true);
 for(const metric of ['medianMs','p95Ms','p99Ms','worstGapMs']){
  for(const invalid of [null,undefined,NaN,Infinity,-1]){
   assert.equal(summarizeFrameBudget({...sample,[metric]:invalid}).pass,false,`${metric}=${invalid}`);
  }
 }
});


test('budget gate rejects internally inconsistent percentile data and gap counters',()=>{
 const sample={requestedFrames:60,measuredFrames:60,medianMs:16,p95Ms:17,p99Ms:18,worstGapMs:20,interrupted:false,timedOut:false,visibilityChanged:false,discardedLongGaps:0,ordinaryFrames:60,frameCoverage:1,longFrames50Ms:0,longFrames100Ms:0,longFrames250Ms:0,visibility:'visible'};
 assert.equal(summarizeFrameBudget(sample).pass,true);
 for(const mutation of [
  {medianMs:19}, {p95Ms:19}, {p99Ms:21},
  {discardedLongGaps:-1}, {discardedLongGaps:null},
  {discardedLongGaps:0.5}, {discardedLongGaps:undefined}
 ]){
  assert.equal(summarizeFrameBudget({...sample,...mutation}).pass,false,JSON.stringify(mutation));
 }
});

test('budget gate rejects inconsistent frame coverage and stall counters',()=>{
 const sample={requestedFrames:60,measuredFrames:60,ordinaryFrames:60,frameCoverage:1,medianMs:16,p95Ms:17,p99Ms:18,worstGapMs:20,interrupted:false,timedOut:false,visibilityChanged:false,discardedLongGaps:0,longFrames50Ms:0,longFrames100Ms:0,longFrames250Ms:0,visibility:'visible'};
 assert.equal(summarizeFrameBudget(sample).pass,true);
 for(const mutation of [{frameCoverage:0.5},{ordinaryFrames:59},{longFrames50Ms:-1},{longFrames100Ms:1},{longFrames250Ms:1},{longFrames250Ms:61},{longFrames50Ms:0.5},{longFrames50Ms:null}]){
  assert.equal(summarizeFrameBudget({...sample,...mutation}).pass,false,JSON.stringify(mutation));
 }
});


test('budget gate fails closed on missing provenance and invalid configured limits',()=>{
 const sample={requestedFrames:60,measuredFrames:60,ordinaryFrames:60,frameCoverage:1,medianMs:16,p95Ms:17,p99Ms:18,worstGapMs:20,interrupted:false,timedOut:false,visibilityChanged:false,discardedLongGaps:0,longFrames50Ms:0,longFrames100Ms:0,longFrames250Ms:0,visibility:'visible'};
 assert.equal(summarizeFrameBudget(sample).pass,true);
 for(const key of ['interrupted','timedOut','visibilityChanged']){
  const incomplete={...sample};delete incomplete[key];
  assert.equal(summarizeFrameBudget(incomplete).pass,false,key);
 }
 for(const limits of [{medianMs:NaN},{medianMs:0},{p95Ms:Infinity},{p95Ms:-1},{medianMs:60,p95Ms:50}]){
  assert.equal(summarizeFrameBudget(sample,limits).pass,false,JSON.stringify(limits));
 }
});
