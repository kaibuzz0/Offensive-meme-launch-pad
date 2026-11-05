import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const root={};
vm.runInNewContext(readFileSync(new URL('../city-worldgen.js',import.meta.url),'utf8'),root);
vm.runInNewContext(readFileSync(new URL('../city-terrain-world.js',import.meta.url),'utf8'),root);
const catalog=Array.from({length:132},(_,i)=>({
 id:'frontier-biome-'+String(i+1).padStart(3,'0'),
 name:'Distinct biome '+(i+1),group:'family-'+Math.floor(i/11),
 material:'terrain-'+i,hue:i*19%360,sat:35,light:40
}));
const plain=v=>JSON.parse(JSON.stringify(v));

test('terrain-only generation disables cities, buildings, streets and old fortress spawn',()=>{
 const base=root.CityWorldgen.createWorld('empty-map',{terrainOnly:true});
 assert.equal(base.terrainOnly,true);
 const spawn=base.spawnAt();
 assert.ok(Number.isInteger(spawn.x)&&Number.isInteger(spawn.y));
 assert.equal(spawn.settlementId,undefined);
 for(const [x,y] of [[0,0],[1,0],[-2,3],[17,-20]]){
  const c=base.chunkAt(x,y);
  assert.equal(c.sites.length,0);
  assert.equal(c.structures.length,0);
  assert.ok(c.tiles.every(t=>!t.road&&t.settlementId===null));
 }
 const legacy=root.CityWorldgen.createWorld('empty-map');
 assert.equal(legacy.terrainOnly,false);
 assert.equal(typeof legacy.settlementCell,'function');
});

test('all 132 distinct biome types exist at seeded starter-world anchors',()=>{
 const a=root.CityTerrainWorld.createTerrain('first-player',catalog);
 const b=root.CityTerrainWorld.createTerrain('second-player',catalog);
 assert.equal(a.biomes.length,132);
 assert.equal(a.anchors.length,132);
 assert.equal(new Set(a.anchors.map(x=>x.id)).size,132);
 assert.ok(a.anchors.every(x=>a.biomeAt(Math.round(x.x),Math.round(x.y)).id===x.id),
  'every original biome anchor remains inside its own irregular biome cluster');
 assert.notDeepEqual(plain(a.anchors),plain(b.anchors),'other seeds place biomes differently');
 assert.deepEqual(plain(a.anchors),plain(root.CityTerrainWorld.createTerrain('first-player',catalog).anchors));
 assert.ok(a.anchors.every(x=>Math.abs(x.x)<1000&&Math.abs(x.y)<1000),
  'all biome anchors are contained within the initial atlas area');
});

test('terrain-only chunks have no streets or settlements and are reproducible across chunk seams',()=>{
 const w=root.CityTerrainWorld.createTerrain('chunk-stability',catalog);
 for(const [cx,cy] of [[0,0],[1,0],[0,-1],[-1,-1]]){
  const chunk=w.chunkAt(cx,cy);
  assert.equal(chunk.tiles.length,256);
  assert.equal(chunk.sites.length,0);
  assert.equal(chunk.structures.length,0);
  assert.ok(chunk.tiles.every(t=>!t.road&&t.settlementId===null));
  assert.deepEqual(plain(chunk),plain(root.CityTerrainWorld.createTerrain('chunk-stability',catalog).chunkAt(cx,cy)));
 }
 const west=w.chunkAt(0,0),east=w.chunkAt(1,0);
 for(let y=0;y<16;y++){
  assert.equal(west.tiles[y*16+15].x+1,east.tiles[y*16].x);
  assert.equal(west.tiles[y*16+15].y,east.tiles[y*16].y);
 }
 assert.equal(w.chunkAt(NaN,1),null);
 assert.equal(w.chunkAt(0,Infinity),null);
});

test('terrain chunk cache remains bounded and underground world agrees with generator',()=>{
 const w=root.CityTerrainWorld.createTerrain('bounded-cache',catalog);
 for(let i=0;i<80;i++)w.chunkAt(i-40,0);
 assert.ok(w.cacheSize()<=root.CityTerrainWorld.LIMIT);
 assert.equal(w.MIN_HEIGHT,-64);
 assert.equal(w.MAX_HEIGHT,256);
 assert.equal(w.blockAt(0,0,-64).material,'bedrock');
 assert.equal(w.blockAt(0,0,-64).mineable,false);
 assert.throws(()=>root.CityTerrainWorld.createTerrain('bad',catalog.slice(1)),/132/);
});
