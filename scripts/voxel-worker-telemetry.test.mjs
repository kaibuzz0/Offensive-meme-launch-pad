import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../city-voxel-mesh-worker.js',import.meta.url),'utf8');
function worker(meshFactory){
 const messages=[];
 let clock=100;
 const self={
  performance:{now:()=>{clock+=2;return clock;}},
  importScripts(){},
  CityTerrainWorld:{createTerrain:()=>({biomes:Array(132).fill({})})},
  CityVoxelWorld:{createVoxelWorld:()=>({seed:1234})},
  CityVoxelRenderer:{generateMesh:meshFactory},
  postMessage:(message,transfer)=>messages.push({message,transfer})
 };
 // Classic Web Workers expose importScripts as a global, not only self.importScripts.
 // Mirror that binding in Node's VM without changing production worker bootstrap.
 runInNewContext(source,{self,importScripts:self.importScripts,Float32Array,Array,Number,Math,Date,Error});
 self.onmessage({data:{type:'init',seed:'seed',definitions:Array(132).fill({})}});
 assert.equal(messages.shift().message.type,'ready');
 return {send:(data)=>self.onmessage({data}),messages};
}
test('mesh response exposes elapsed time and transferred bytes',()=>{
 const data=new Float32Array(54);
 const w=worker(()=>({vertices:6,tiles:1,plants:0,data}));
 w.send({type:'mesh',id:1,cx:0,cz:0,stride:1});
 const {message,transfer}=w.messages[0];
 assert.equal(message.type,'mesh');
 assert.equal(message.byteLength,216);
 assert.equal(message.durationMs,2);
 assert.equal(message.buffer,data.buffer);
 assert.equal(transfer[0],data.buffer);
});
test('reject oversized buffer before transfer',()=>{
 const w=worker(()=>({vertices:6,tiles:1,plants:0,data:new Float32Array(24*1024*1024/4+9)}));
 w.send({type:'mesh',id:2,cx:0,cz:0,stride:1});
 assert.equal(w.messages[0].message.type,'error');
 assert.equal(w.messages[0].message.id,2);
});
test('reject malformed mesh data and invalid request coordinates',()=>{
 const w=worker(()=>({vertices:6,data:[1,2,3]}));
 w.send({type:'mesh',id:3,cx:0,cz:0,stride:1});
 w.send({type:'mesh',id:4,cx:62501,cz:0,stride:1});
 assert.deepEqual(w.messages.map(x=>x.message.type),['error','error']);
});

// A transferable ArrayBuffer exposes the entire allocation, not just the view.
// Reject partial views so unrelated bytes are never sent to the parent thread.
test('reject partial typed-array views without transferring backing allocation',()=>{
 const backing=new Float32Array(90);
 const w=worker(()=>({vertices:6,tiles:1,plants:0,data:backing.subarray(9,63)}));
 w.send({type:'mesh',id:5,cx:0,cz:0,stride:1});
 assert.equal(w.messages[0].message.type,'error');
 assert.equal(w.messages[0].message.id,5);
 assert.equal(w.messages[0].transfer.length,0);
});
