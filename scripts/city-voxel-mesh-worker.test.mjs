import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const families=['evergreen','desert','tundra','wetland','volcanic','alpine','tropical',
 'grassland','salt','crystal','fungal','ruins'];
const definitions=Array.from({length:132},(_,i)=>({
 id:'region-'+i,name:'Terrain '+i,group:families[Math.floor(i/11)],
 material:'soil',hue:i*19%360,sat:40+(i%4)*3,light:42
}));
function harness(){
 const messages=[],scope=vm.createContext({});
 scope.postMessage=(msg,transfers=[])=>messages.push({msg,transfers});
 scope.importScripts=(...files)=>{for(const file of files)vm.runInContext(source(file),scope,{filename:file});};
 vm.runInContext(source('city-voxel-mesh-worker.js'),scope,{filename:'city-voxel-mesh-worker.js'});
 const send=msg=>scope.onmessage({data:msg});
 return {messages,scope,send};
}
const asPlain=x=>JSON.parse(JSON.stringify(x));

test('worker initializes the exact 132 biome seed without alternate layouts',()=>{
 const h=harness();
 h.send({type:'init',seed:'round7-worker-parity-01',definitions});
 assert.equal(h.messages.length,1);
 assert.equal(h.messages[0].msg.type,'ready');
 assert.equal(h.messages[0].msg.biomeCount,132);
 const expected=h.scope.CityTerrainWorld.createTerrain('round7-worker-parity-01',definitions);
 assert.equal(h.messages[0].msg.seedHash,expected.seedHash);
});

test('transferred worker mesh is bitwise identical to main-thread meshing at negative coordinates',()=>{
 const h=harness(),seed='round7-worker-parity-02';
 h.send({type:'init',seed,definitions});
 h.send({type:'mesh',id:1,cx:-2,cz:3,stride:1});
 const result=h.messages.at(-1);
 assert.equal(result.msg.type,'mesh');
 assert.equal(result.msg.id,1);
 assert.equal(result.msg.cx,-2);
 assert.equal(result.msg.cz,3);
 assert.equal(result.msg.stride,1);
 assert.equal(result.transfers.length,1);
 assert.equal(result.msg.buffer,result.transfers[0]);
 const atlas=h.scope.CityTerrainWorld.createTerrain(seed,definitions);
 const world=h.scope.CityVoxelWorld.createVoxelWorld(atlas);
 const direct=h.scope.CityVoxelRenderer.generateMesh(world,-2,3,1);
 assert.equal(result.msg.vertices,direct.vertices);
 assert.equal(result.msg.buffer.byteLength,direct.data.byteLength);
 assert.deepEqual(Array.from(new Float32Array(result.msg.buffer)),Array.from(direct.data),
  'same seed and biome order must generate exactly the same 3D triangles');
});

test('worker distant LOD preserves deterministic geometry and transfers buffers',()=>{
 const h=harness();
 h.send({type:'init',seed:'round7-worker-parity-03',definitions});
 h.send({type:'mesh',id:4,cx:-5,cz:-4,stride:4});
 const r=h.messages.at(-1).msg;
 assert.equal(r.type,'mesh');
 assert.equal(r.tiles,16);
 assert.ok(r.vertices>0&&r.vertices<30000);
 assert.equal(r.buffer.byteLength,r.vertices*36);
 assert.equal(r.seedHash,h.messages[0].msg.seedHash);
});

test('invalid and out-of-bounds worker requests fail closed without a partial mesh',()=>{
 const h=harness();
 h.send({type:'mesh',id:1,cx:0,cz:0,stride:1});
 assert.equal(h.messages.at(-1).msg.type,'error');
 h.send({type:'init',seed:'invalid',definitions:definitions.slice(0,120)});
 assert.equal(h.messages.at(-1).msg.type,'error');
 h.send({type:'init',seed:'round7-worker-parity-04',definitions});
 h.send({type:'mesh',id:5,cx:70000,cz:0,stride:1});
 assert.equal(h.messages.at(-1).msg.type,'error');
 h.send({type:'mesh',id:6,cx:0,cz:0,stride:2});
 assert.equal(h.messages.at(-1).msg.type,'error');
 h.send({type:'mesh',id:7,cx:0,cz:0,stride:4});
 assert.equal(h.messages.at(-1).msg.type,'mesh');
 assert.ok(asPlain(h.messages.at(-1).msg).vertices>0);
});
