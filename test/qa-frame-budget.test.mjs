import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const script=new URL('../scripts/qa-frame-budget.mjs',import.meta.url).pathname;
function run(payload,gate=false) {
 const dir=mkdtempSync(join(tmpdir(),'meme-qa-'));
 try {
  const file=join(dir,'capture.json');writeFileSync(file,JSON.stringify(payload));
  return spawnSync(process.execPath,[script,file,...(gate?['--gate']:[])],{encoding:'utf8'});
 } finally {rmSync(dir,{recursive:true,force:true});}
}
const base={source:'emulated-chromium',device:'Chromium 412x915',renderer:'webgl',route:'homepage Play to fortress',frameIntervalsMs:Array(120).fill(16.7)};
test('valid capture reports quantiles and labels emulation honestly',()=>{
 const r=run(base,true);assert.equal(r.status,0,r.stderr);
 const report=JSON.parse(r.stdout);
 assert.equal(report.frames,120);
 assert.equal(report.frameMs.p95,16.7);
 assert.equal(report.provenance.source,'emulated-chromium');
});
test('rejects absent provenance and insufficient samples',()=>{
 assert.equal(run({...base,source:'',frameIntervalsMs:Array(120).fill(16.7)}).status,2);
 assert.equal(run({...base,frameIntervalsMs:[16.7]}).status,2);
});
test('provisional gate rejects stalls without falsifying capture',()=>{
 const frames=Array(120).fill(16.7);frames[20]=180;
 const r=run({...base,frameIntervalsMs:frames},true);
 assert.equal(r.status,1);
 assert.equal(JSON.parse(r.stdout).stallsOver100Ms,1);
});
