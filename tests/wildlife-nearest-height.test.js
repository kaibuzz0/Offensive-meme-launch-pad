'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const wildlife=require('../city-sandbox-wildlife.js');

function fixture(){
 const world={seed:37,CHUNK_SIZE:16,SEA_LEVEL:0,
  surfaceAt(){return {height:10,group:'forest',biomeName:'forest',slope:0,water:false,river:false};}};
 const manager=wildlife.createChunkWildlifeManager(world,{maxChunks:4,maxPerChunk:6});
 let selected=null;
 for(let x=0;x<30&&!selected;x++)for(let z=0;z<30&&!selected;z++){
  const animals=manager.enter(x,z);
  if(animals.length)selected=animals[0];
  else manager.leave(x,z);
 }
 assert.ok(selected,'deterministic fixture must find a populated chunk');
 return {manager,selected};
}
test('nearest returns a loaded creature without generating more terrain',()=>{
 const {manager,selected}=fixture();
 assert.equal(manager.nearest(selected.x,selected.z,0),selected);
 assert.equal(manager.nearest(selected.x,selected.z,0,selected.y,0),selected);
 assert.equal(manager.nearest(selected.x,selected.z,0,selected.y+10,1),null);
 assert.equal(manager.nearest(selected.x+300,selected.z,1),null);
 manager.clear();
 assert.equal(manager.nearest(selected.x,selected.z,256),null);
});
test('nearest validates vertical query arguments',()=>{
 const {manager,selected}=fixture();
 assert.throws(()=>manager.nearest(selected.x,selected.z,2,selected.y),RangeError);
 assert.throws(()=>manager.nearest(selected.x,selected.z,2,undefined,2),RangeError);
 assert.throws(()=>manager.nearest(selected.x,selected.z,257),RangeError);
});
