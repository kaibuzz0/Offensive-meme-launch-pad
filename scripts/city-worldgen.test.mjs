import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../city-worldgen.js',import.meta.url),'utf8');
const context={};
vm.runInNewContext(source,context,{filename:'city-worldgen.js'});
const World=context.CityWorldgen;
const own=v=>JSON.parse(JSON.stringify(v));

test('fresh seed selects a new world without importing legacy city, biome grid or saves',()=>{
 assert.equal(typeof World.createWorld,'function');
 assert.equal(World.CHUNK_SIZE,16);
 assert.equal(World.MIN_HEIGHT,-64);
 assert.equal(World.MAX_HEIGHT,256);
 const a=World.createWorld('fresh-seed-001'),b=World.createWorld('fresh-seed-002');
 assert.notEqual(a.seedHash,b.seedHash);
 assert.equal(Object.isFrozen(a),true);
 assert.equal(Object.isFrozen(a.BIOMES),true);
 assert.notDeepEqual(own(a.chunkAt(0,0).tiles),own(b.chunkAt(0,0).tiles));
 assert.doesNotMatch(source,/Math\.random|localStorage|sessionStorage|fetch\(|createElement|MemeCityCore|CityFrontier|\.\s*save\(/,
  'world generation must be pure and independent of old fixed 132-region layouts');
 for(const invalid of [undefined,null,{},[],Infinity,2.2])
  assert.throws(()=>World.createWorld(invalid));
 assert.throws(()=>World.createWorld('a'.repeat(129)));
});

test('chunks are deterministic and order-independent, including negative coordinates',()=>{
 const w=World.createWorld('map-consistency');
 const chunks=[w.chunkAt(0,0),w.chunkAt(1,0),w.chunkAt(-1,-2)];
 assert.ok(chunks.every(c=>c.tiles.length===256));
 assert.ok(chunks.every(c=>Object.isFrozen(c)&&Object.isFrozen(c.tiles)&&Object.isFrozen(c.tiles[0])));
 assert.equal(chunks[0].tiles[0].x,0);assert.equal(chunks[0].tiles[0].y,0);
 assert.equal(chunks[1].tiles[0].x,16);assert.equal(chunks[1].tiles[0].y,0);
 assert.equal(chunks[2].tiles[0].x,-16);assert.equal(chunks[2].tiles[0].y,-32);
 assert.deepEqual(own(w.chunkAt(1,0)),own(World.createWorld('map-consistency').chunkAt(1,0)));
 assert.deepEqual(own(w.chunkAt(-1,-2)),own(World.createWorld('map-consistency').chunkAt(-1,-2)));
 assert.deepEqual(own(w.chunkAt(0,0)),own(chunks[0]),'out-of-order generation never changes the world');
 assert.equal(w.chunkAt(Infinity,0),null);
 assert.equal(w.chunkAt(0,0.5),null);
});

test('biomes form coherent clustered regions across chunk edges rather than a fixed array',()=>{
 const w=World.createWorld('natural-cluster-map');
 const types=new Set();let nearby=0,same=0;let variedHeights=0;
 for(let y=-720;y<=720;y+=12)for(let x=-720;x<=720;x+=12){
  const a=w.biomeAt(x,y),next=w.biomeAt(x+1,y),far=w.biomeAt(x+72,y);
  types.add(a.id);nearby++;
  if(a.id===next.id)same++;
  if(a.height!==far.height)variedHeights++;
  assert.ok(a.height>=0&&a.height<=256&&a.height%8===0);
  assert.ok(a.surface&&/^#[0-9a-f]{6}$/i.test(a.tint));
 }
 assert.ok(types.size>=4,'different environments appear without predetermined region locations');
 assert.ok(same/nearby>.88,'adjacent tiles mostly remain within coherent biomes');
 assert.ok(variedHeights>nearby*.2,'terrain elevation varies across real distances');
 const a=w.chunkAt(0,0),b=w.chunkAt(1,0);
 for(let row=0;row<16;row++){
  const left=a.tiles[row*16+15],right=b.tiles[row*16];
  assert.equal(left.x+1,right.x);
  assert.equal(left.y,right.y);
  assert.equal(left.biome,w.biomeAt(left.x,left.y).id);
  assert.equal(right.biome,w.biomeAt(right.x,right.y).id);
 }
});

test('world seed procedurally distributes cities, towns, villages and buildings in arbitrary cells',()=>{
 const a=World.createWorld('settlement-seed'),b=World.createWorld('another-settlement-seed');
 const locationsA=[],locationsB=[];
 for(let y=-12;y<=12;y++)for(let x=-12;x<=12;x++){
  const s=a.settlementCell(x,y),other=b.settlementCell(x,y);
  if(s)locationsA.push(s);
  if(other)locationsB.push(other);
 }
 assert.ok(locationsA.length>35,'world has a meaningful distribution of settlements');
 assert.ok(locationsA.some(s=>s.type==='village'));
 assert.ok(locationsA.some(s=>s.type==='town'));
 assert.ok(locationsA.some(s=>s.type==='city'));
 assert.ok(locationsA.every(s=>s.name&&s.id.includes('settlement:')&&Object.isFrozen(s)));
 assert.notDeepEqual(own(locationsA.map(s=>[s.x,s.y,s.type])),own(locationsB.map(s=>[s.x,s.y,s.type])),
  'new seed changes positions, hierarchy and names');
 const site=locationsA.find(s=>s.type==='city');
 const chunk=a.chunkAt(Math.floor(site.x/16),Math.floor(site.y/16));
 assert.ok(chunk.sites.some(s=>s.id===site.id),'randomized city is discoverable without hardcoded districts');
 assert.ok(chunk.structures.length>=1,'randomized city actually generates building footprints');
 assert.ok(chunk.structures.some(p=>p.kind==='home'||p.kind==='market'||p.kind==='workshop'));
 const near=a.settlementsNear(site.x,site.y);
 assert.ok(near.some(s=>s.id===site.id));
 assert.equal(a.settlementsNear(NaN,0).length,0);
 for(const structure of chunk.structures){
  assert.ok(structure.w>=2&&structure.h>=2);
  assert.ok(structure.x<chunk.cx*16+16&&structure.x+structure.w>chunk.cx*16);
  assert.ok(structure.y<chunk.cy*16+16&&structure.y+structure.h>chunk.cy*16);
 }
 const sibling=a.chunkAt(Math.floor(site.x/16)+1,Math.floor(site.y/16));
 const shared=new Set(chunk.structures.map(p=>p.id));
 for(const structure of sibling.structures.filter(p=>shared.has(p.id))){
  assert.deepEqual(own(structure),own(chunk.structures.find(p=>p.id===structure.id)),
   'same building persists with identical footprint across chunk seams');
 }
});

test('vertical geology runs from random local surface height down to immutable bedrock',()=>{
 const w=World.createWorld('mining-strata');
 const column=w.biomeAt(21,-38);
 assert.ok(column.height>=0);
 const bedrock=w.blockAt(21,-38,-64),below=w.blockAt(21,-38,-72);
 assert.equal(bedrock.material,'bedrock');assert.equal(bedrock.solid,true);assert.equal(bedrock.mineable,false);
 assert.equal(below,null);
 assert.equal(w.blockAt(21,-38,264),null);
 assert.equal(w.blockAt(21,-38,-63),null);
 assert.equal(w.blockAt(21,-38,column.height+8).material,'air');
 assert.equal(w.blockAt(21,-38,column.height).solid,true);
 const a=w.sliceAt(0,0,-64),b=w.sliceAt(0,0,-32),high=w.sliceAt(0,0,256);
 assert.equal(a.tiles.length,256);
 assert.ok(a.tiles.every(x=>x.material==='bedrock'&&!x.mineable));
 assert.ok(high.tiles.every(x=>x.material==='air'));
 assert.equal(b.tiles.length,256);
 assert.deepEqual(own(w.sliceAt(0,0,-32)),own(World.createWorld('mining-strata').sliceAt(0,0,-32)));
 assert.equal(w.sliceAt(0,0,-65),null);
 assert.equal(w.sliceAt(0,0,1),null);
 const zLevels=[];
 for(let z=-64;z<=256;z+=8){
  const block=w.blockAt(21,-38,z);
  assert.ok(block&&Number.isInteger(block.z));
  zLevels.push(block);
 }
 assert.equal(zLevels.length,41,'all 41 vertical levels exist at 8-unit increments');
});

test('caves, mineral seams and surface layouts are seeded and need no additional save schema',()=>{
 const w=World.createWorld('ore-cave-exploration');
 const found=new Set();let caves=0;
 for(let y=-32;y<=32;y+=2)for(let x=-32;x<=32;x+=2)
  for(const z of [-56,-40,-24]){
   const tile=w.blockAt(x,y,z);
   if(tile.cave)caves++;
   else if(tile.solid&&tile.material!=='bedrock')found.add(tile.material);
  }
 assert.ok(caves>0,'coherent 3D noise carves some underground spaces');
 assert.ok(found.size>=3,'layered geology yields varied materials and ores');
 assert.equal(w.blockAt(21,-38,-40).material,World.createWorld('ore-cave-exploration').blockAt(21,-38,-40).material);
 const source=readFileSync(new URL('../city-worldgen.js',import.meta.url),'utf8');
 assert.ok(source.includes('valueNoise3(caveSeed'));
 assert.ok(source.includes('SETTLEMENT_CELL=96'));
});
