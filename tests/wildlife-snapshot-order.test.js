'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createChunkWildlifeManager}=require('../city-sandbox-wildlife.js');

const world={
 seed:123,CHUNK_SIZE:16,SEA_LEVEL:0,
 surfaceAt(){return {height:8,slope:0,group:'forest'};}
};

test('wildlife render snapshots use stable ID ordering independent of chunk activation',()=>{
 const chunks=[[0,0],[1,0],[-1,0],[0,1]];
 const first=createChunkWildlifeManager(world,{maxChunks:4});
 const second=createChunkWildlifeManager(world,{maxChunks:4});
 const a=first.sync(chunks);
 const b=second.sync([...chunks].reverse());
 assert.ok(a.length>0,'seeded fixture should produce wildlife');
 assert.deepEqual(a,b);
 assert.deepEqual(a.map(creature=>creature.id),[...a.map(creature=>creature.id)].sort());
 assert.ok(Object.isFrozen(a));
 assert.strictEqual(first.sync(chunks),a,'unchanged visible set reuses snapshot');
 assert.deepEqual(first.nearby(0,0,256),second.nearby(0,0,256));
});
