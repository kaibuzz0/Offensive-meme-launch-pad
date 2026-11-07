import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context={};
vm.runInNewContext(readFileSync(new URL('../city-voxel-renderer.js',import.meta.url),'utf8'),context);
const mesh=context.CityVoxelRenderer.generateMesh;
const world=(height=8)=>({
  chunkAt:()=>({tiles:[],plants:[{x:8,y:12,z:8,type:'pine',height,color:.4}]}),
  surfaceAt:()=>null
});
test('canopy shadow casts opposite the shader sun and stays one quad',()=>{
  const data=mesh(world(),0,0).data;
  assert.equal(data.length%9,0);
  // First six vertices are the ground shadow, before foliage geometry.
  const xs=[],zs=[];
  for(let i=0;i<6;i++){xs.push(data[i*9]);zs.push(data[i*9+2]);}
  assert.ok(Math.min(...xs)<7.65,'sun-facing shadow shifts west');
  assert.ok(Math.min(...zs)<7.65,'sun-facing shadow shifts north');
  assert.equal(new Set(xs).size,2);
  assert.equal(new Set(zs).size,2);
});
test('tree shadow coordinates are deterministic',()=>{
  assert.deepEqual(Array.from(mesh(world(),0,0).data),Array.from(mesh(world(),0,0).data));
});

test('taller trees cast longer shadows without increasing vertex count',()=>{
  const short=mesh(world(2),0,0).data;
  const tall=mesh(world(16),0,0).data;
  assert.equal(short.length,tall.length,'shadow length must not allocate more geometry');
  assert.ok(tall[0]<short[0],'taller tree shadow extends farther west');
  assert.ok(tall[2]<short[2],'taller tree shadow extends farther north');
});
