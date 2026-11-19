import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../city-sandbox-wildlife.js',import.meta.url),'utf8');
const {default:wildlife}=await import('data:text/javascript;base64,'+
 Buffer.from(source+'\nexport default globalThis.CitySandboxWildlife;').toString('base64'));

test('ground wildlife stays in local habitat across a chunk biome seam',()=>{
 const seed=741,cx=2,cz=-3;
 const world={seed,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:(x,z)=>({
  height:80,group:x<cx*16+12?'forest':'desert',
  biomeName:x<cx*16+12?'Forest':'Desert',
  water:false,river:false,slope:0
 })};
 const candidates=wildlife.spawnChunk(seed,cx,cz,'forest');
 const expected=candidates.filter(a=>{
  const local=world.surfaceAt(Math.floor(a.x),Math.floor(a.z));
  return a.species==='songbird'||wildlife.habitatFor(local)===a.habitat;
 });
 const placed=wildlife.spawnChunkOnTerrain(world,cx,cz);
 assert.deepEqual(placed.map(a=>a.id),expected.map(a=>a.id));
 assert.ok(placed.every(a=>a.species==='songbird'||Math.floor(a.x)<cx*16+12));
 assert.deepEqual(wildlife.spawnChunkOnTerrain(world,cx,cz),placed);
 assert.ok(Object.isFrozen(placed));
});

test('uniform habitat keeps existing deterministic spawn identities',()=>{
 const world={seed:741,CHUNK_SIZE:16,SEA_LEVEL:112,surfaceAt:()=>({
  height:80,group:'forest',biomeName:'Forest',water:false,river:false,slope:0
 })};
 const candidates=wildlife.spawnChunk(741,2,-3,'forest');
 const placed=wildlife.spawnChunkOnTerrain(world,2,-3);
 assert.deepEqual(placed.map(a=>a.id),candidates.map(a=>a.id));
});
