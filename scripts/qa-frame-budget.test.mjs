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
  assert.equal(result.measuredFrames,59);
  assert.equal(result.discardedLongGaps,1);
  assert.equal(result.medianMs,20);
  assert.equal(result.p95Ms,20);
  assert.equal(result.viewport.width,412);
  assert.equal(result.worstGapMs,1200);
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
  assert.equal(summarizeFrameBudget(result).pass,false);
 }finally{globalThis.requestAnimationFrame=original;}
});
test('probe rejects unbounded work',async()=>{
 await assert.rejects(sampleFrameTimes({frames:3601}),RangeError);
 await assert.rejects(sampleFrameTimes({frames:1}),RangeError);
 await assert.rejects(sampleFrameTimes({frames:5,maxGapMs:0}),RangeError);
});
