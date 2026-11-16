import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source=readFileSync(new URL('../city-terrain-mode.js',import.meta.url),'utf8');
const start=source.indexOf(' function frame(t){');
const end=source.indexOf(" $('#pause-toggle').addEventListener",start);
const frame=source.slice(start,end);

test('canonical movement uses bounded 60 Hz simulation and shared collision snapshot',()=>{
 assert.ok(start>=0&&end>start);
 assert.match(source,/PHYSICS_STEP=1\/60,MAX_PHYSICS_STEPS=4/);
 assert.match(frame,/physics\.tick\(input,PHYSICS_STEP\)/);
 assert.match(frame,/physics\.snapshot\(\)/);
 assert.match(frame,/Math\.min\(budget,available\)/);
 assert.match(frame,/steps<MAX_PHYSICS_STEPS/);
 assert.doesNotMatch(frame,/player\.[xy]\s*\+=\s*move\./);
 assert.doesNotMatch(frame,/player\.[xy]\s*=\s*player\.[xy]\s*\+\s*move\./);
});

test('atlas, pause, visibility and blur cannot accumulate physics debt',()=>{
 assert.match(frame,/Atlas is a read-only view/);
 assert.match(frame,/else\{physicsAccumulator=0;status\.dataset\.physicsSteps='0';\}/);
 assert.match(source,/visibilitychange[^\n]*physicsAccumulator=0/);
 assert.match(source,/blur[^\n]*physicsAccumulator=0/);
 assert.match(source,/running=true;physicsAccumulator=0;last=performance\.now\(\)/);
});

test('missing physics controller fails closed with observable diagnostics',()=>{
 assert.match(frame,/status\.dataset\.physicsUnavailable='true'/);
 assert.match(frame,/status\.dataset\.physicsActiveBodies='0'/);
 assert.match(frame,/status\.dataset\.physicsWorkMs=workMs\.toFixed\(3\)/);
 assert.match(frame,/status\.dataset\.physicsDroppedMs=/);
});
