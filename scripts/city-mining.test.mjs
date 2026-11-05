import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx={};
for(const file of ['city-core.js','city-biomes.js','city-frontier.js','city-mining.js','city-mine-visuals.js'])
 vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx,{filename:file});
const C=ctx.MemeCityCore,F=ctx.CityFrontier,Mining=ctx.CityMining;
const plain=o=>JSON.parse(JSON.stringify(o));
const store=init=>{const m=new Map(Object.entries(init||{}));return{
 m,getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v)
}};
const player=()=>({...F.regions[0].entry});
const first=()=>{const p=player(),s=store(),m=Mining.createStore(s);return {p,s,m};};

test('world height cap is +256, ground at zero and bedrock floor at -64',()=>{
 assert.deepEqual(plain(C.WORLD.vertical),{minHeight:-64,maxHeight:256,surface:0,stratumHeight:8});
 assert.equal(Mining.maxHeight,256);
 assert.equal(Mining.minHeight,-64);
 assert.equal(Mining.STRATA.length,8);
 assert.equal(Mining.STRATA.filter(x=>x.mineable).length,7);
 assert.deepEqual(plain(Mining.STRATA.map(x=>x.z)),[-8,-16,-24,-32,-40,-48,-56,-64]);
 for(const z of [-64,-56,-8,0,128,256])assert.equal(Mining.validZ(z),true);
 for(const z of [-65,257,Infinity,NaN,2.5])assert.equal(Mining.validZ(z),false);
 assert.equal(C.WORLD.width,24400);
 assert.equal(C.WORLD.height,14400,'vertical altitude is separate from horizontal map Y');
});

test('all 132 frontier biomes expose deterministic mineable strata, not the original city',()=>{
 for(const r of F.regions){
  const p={...r.entry},at=Mining.location(p);
  assert.equal(at.region.id,r.id);
  const b=Mining.blockAt(at.ox,at.oy,0);
  assert.equal(b.regionId,r.id);
  assert.ok(['soil','stone','coal','copper','iron','quartz','gold','crystal'].includes(b.material));
  assert.deepEqual(plain(Mining.blockAt(at.ox,at.oy,3)),plain(Mining.blockAt(at.ox,at.oy,3)));
  const bedrock=Mining.blockAt(at.ox,at.oy,7);
  assert.equal(bedrock.material,'bedrock');assert.equal(bedrock.mineable,false);
 }
 assert.equal(Mining.location({x:5600,y:5940}),null,'fortress stays untouched');
 assert.equal(Mining.location({x:560,y:2760}),null,'older art-only biome stays untouched');
 assert.equal(Mining.location({...player(),room:{id:'shop'}}),null,'indoor players cannot mine outside');
 assert.equal(Mining.blockAt(-10,-10,1),null);
 assert.equal(Mining.blockAt(20,20,8),null);
});

test('shaft must be excavated one layer at a time; lateral tunnels require an open neighboring tile',()=>{
 const {p,s,m}=first();
 assert.equal(m.mine(p,0,0,1).ok,false,'cannot skip down to a closed stratum');
 assert.equal(m.mine(p,1,0,1).ok,false,'cannot teleport sideways underground');
 assert.equal(m.mine(p,0,0,7).ok,false,'unbreakable bedrock');
 assert.equal(m.mine(p,0,0,0).ok,true,'surface is mineable');
 assert.equal(m.mine(p,0,0,0).ok,false,'same rock cannot be farmed twice');
 assert.equal(m.mine(p,0,0,1).ok,true,'dig through the next layer');
 assert.equal(m.mine(p,2,0,1).ok,false,'cannot tunnel two spaces through a solid wall');
 assert.equal(m.mine(p,1,0,1).ok,true,'can tunnel into adjacent tile');
 assert.equal(m.mine(p,2,0,1).ok,true,'new adjacent opening extends the tunnel');
 for(let depth=2;depth<=6;depth++)assert.equal(m.mine(p,0,0,depth).ok,true,'shaft depth '+depth);
 assert.equal(m.inspect(p,0,0,7).accessible,false);
 assert.equal(m.inspect(p,0,0,7).material,'bedrock');
 assert.equal(m.mine(p,0,0,8).ok,false);
 assert.equal(m.count(),9);
 assert.equal(JSON.parse(s.getItem(Mining.KEY)).blocks.length,9);
 assert.equal(Object.values(m.inventory()).reduce((a,b)=>a+b,0),9,'ore inventory is derived, never trusted input');
});

test('mine location and tile range are validated, not provided by an arbitrary request',()=>{
 const {p,m}=first();
 assert.equal(m.mine({x:-1000,y:-1000},0,0,0).ok,false);
 assert.equal(m.mine({...p,room:{id:'interior'}},0,0,0).ok,false);
 for(const [dx,dy,level] of [[3,0,0],[0,3,0],[0,0,-1],[0,0,1.1],[NaN,0,0],[0,2,100]])
  assert.equal(m.mine(p,dx,dy,level).ok,false);
 assert.equal(m.count(),0);
});

test('mining stores only sparse removed-block IDs; player progress remains byte-identical',()=>{
 const original='{"version":6,"credits":123,"inventure":"untouched"}';
 const s=store({'offensive-meme-city-v1-center':original}),m=Mining.createStore(s),p=player();
 assert.equal(m.mine(p,0,0,0).ok,true);
 assert.equal(m.mine(p,0,0,1).ok,true);
 const record=JSON.parse(s.getItem(Mining.KEY));
 assert.equal(record.version,1);
 assert.equal(record.seed,F.SEED);
 assert.equal(record.maxHeight,256);
 assert.equal(record.minHeight,-64);
 assert.equal(record.blocks.length,2);
 assert.equal(record.blocks[0].split(':').length,6);
 assert.equal(s.getItem('offensive-meme-city-v1-center'),original);
 const loaded=Mining.createStore(s);
 assert.equal(loaded.disabled(),false);
 assert.equal(loaded.count(),2);
 assert.equal(loaded.inspect(p,0,0,1).mined,true);
 assert.deepEqual(plain(loaded.inventory()),plain(m.inventory()));
 assert.equal(loaded.mine(p,0,0,1).ok,false);
});

test('malformed, duplicate, out-of-bounds, and forged deep mining records fail closed',()=>{
 const {p,s,m}=first();
 m.mine(p,0,0,0);
 const good=JSON.parse(s.getItem(Mining.KEY));
 const id=good.blocks[0];
 const cases=[
  '{broken',JSON.stringify({...good,version:20}),JSON.stringify({...good,maxHeight:999}),
  JSON.stringify({...good,seed:123}),JSON.stringify({...good,blocks:[id,id]}),
  JSON.stringify({...good,blocks:['frontier-evergreen-1:6:368:18:368:18']}),
  JSON.stringify({...good,blocks:['frontier-evergreen-1:7:368:18:368:18']}),
  JSON.stringify({...good,blocks:['frontier-invalid:0:300:100:300:100']}),
  JSON.stringify({...good,blocks:Array(513).fill(id)})
 ];
 for(const raw of cases){const mem=store({[Mining.KEY]:raw}),x=Mining.createStore(mem);
  assert.equal(x.disabled(),true);
  assert.equal(x.count(),0,'reject the full corrupt history rather than exposing a valid-looking prefix');
  assert.deepEqual(plain(x.inventory()),{},'corrupt journal cannot manufacture sample totals');
  assert.equal(x.surfaceOpenings().length,0,'corrupt journal cannot show forged shafts');
  assert.equal(x.mine(p,0,0,0).ok,false);
  assert.equal(mem.getItem(Mining.KEY),raw,'corrupted original bytes never overwritten');
 }
});

test('stale browser tabs, failed writes, and an exhausted store do not yield duplicate materials',()=>{
 const s=store(),a=Mining.createStore(s),b=Mining.createStore(s),p=player();
 assert.equal(a.mine(p,0,0,0).ok,true);
 const bytes=s.getItem(Mining.KEY);
 assert.equal(b.mine(p,0,0,0).ok,false);
 assert.equal(s.getItem(Mining.KEY),bytes);
 assert.equal(b.count(),0);
 const c=Mining.createStore(s);
 assert.equal(c.mine(p,0,0,1).ok,true);
 const failed=store();failed.setItem=()=>{throw Error('Quota exceeded')};
 const x=Mining.createStore(failed);
 assert.equal(x.mine(p,0,0,0).ok,false);
 assert.equal(x.count(),0);
 assert.equal(Mining.createStore(null).mine(p,0,0,0).ok,false);
});

test('exact same module is wired to canonical client, deploy package and server static file list',()=>{
 const city=fs.readFileSync(new URL('../city.js',import.meta.url),'utf8'),
  html=fs.readFileSync(new URL('../city.html',import.meta.url),'utf8'),
  pages=fs.readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8'),
  server=fs.readFileSync(new URL('../server/city-server.mjs',import.meta.url),'utf8');
 assert.match(html,/city-mining\.js\?v=49-surface-depth/);
 assert.match(html,/data-panel="mining"/);
 assert.match(pages,/city-mining\.js/);
 assert.match(server,/'city-mining\.js'/);
 assert.match(city,/Mine\.createStore/);
 assert.match(city,/miningStore\.mine\(entry,dx,dy,depth\)/);
 assert.match(city,/online\)\{content\.append\(node\('p','beta-note','Mining is currently Solo-only/);
 assert.match(city,/if\(type==='mining'\)miningPanel\(content\)/);
});


test('world surface displays the exact saved shaft footprint with deeper z from later excavation',()=>{
 const {p,s,m}=first(),front=F.regionAt(p.x,p.y);
 assert.deepEqual(plain(m.surfaceOpenings()),[]);
 assert.equal(m.mine(p,0,0,0).ok,true);
 const firstHole=m.surfaceOpenings()[0];
 assert.equal(firstHole.shaft,true);
 assert.equal(firstHole.depth,-8);
 assert.equal(firstHole.regionId,front.id);
 assert.equal(firstHole.w,32);
 assert.equal(m.surfaceOpenings(()=>false).length,0,'off-screen mine never enters draw queue');
 assert.equal(m.mine(p,0,0,1).ok,true);
 assert.equal(m.surfaceOpenings()[0].depth,-16,'new depth must invalidate the cached hole texture geometry');
 assert.equal(m.mine(p,1,0,0).ok,true);
 const openings=m.surfaceOpenings(),shaft=openings.find(o=>o.shaft),surface=openings.find(o=>!o.shaft);
 assert.equal(openings.length,2);
 assert.equal(shaft.depth,-16);
 assert.equal(surface.depth,-8);
 assert.equal(Mining.createStore(s).surfaceOpenings().length,2,'restored journal has same surface geometry');
 assert.equal(Mining.createStore(s).surfaceOpenings().find(o=>o.shaft).depth,-16);
 assert.equal(m.surfaceOpenings((x,y)=>x===surface.x&&y===surface.y).length,1);
});

test('surface shaft cache retains ALL entrances when the first camera sees only a subset',()=>{
 const s=store(),m=Mining.createStore(s),a={...F.regions[0].entry},b={...F.regions[1].entry};
 assert.equal(m.mine(a,0,0,0).ok,true);
 assert.equal(m.mine(b,0,0,0).ok,true);
 const ax=Math.floor(a.x/Mining.TILE)*Mining.TILE,bx=Math.floor(b.x/Mining.TILE)*Mining.TILE;
 assert.notEqual(ax,bx,'two distant biomes must have distinct mine entrance coordinates');
 // Reproduces the actual draw() call: view-cull while the first cache is cold.
 const firstView=m.surfaceOpenings((x)=>x===ax);
 assert.equal(firstView.length,1,'camera A paints only its own shaft');
 const nextView=m.surfaceOpenings((x)=>x===bx);
 assert.equal(nextView.length,1,'camera B can still see its shaft without a reload');
 assert.equal(m.surfaceOpenings().length,2,'world map still lists BOTH entrances');
 const empty=m.surfaceOpenings(()=>false);
 assert.equal(empty.length,0,'view culling remains effective');
 assert.equal(m.surfaceOpenings().length,2,'culling must never erase cached journals');
 assert.equal(m.mine(a,0,0,1).ok,true,'deepening a shaft invalidates surface geometry');
 const after=m.surfaceOpenings((x)=>x===ax);
 assert.equal(after.length,1);assert.equal(after[0].depth,-16);
 assert.equal(m.surfaceOpenings((x)=>x===bx)[0].depth,-8,
  'changing shaft A must not hide or incorrectly deepen shaft B');
 const reloaded=Mining.createStore(s);
 assert.equal(reloaded.surfaceOpenings(()=>false).length,0);
 assert.equal(reloaded.surfaceOpenings().length,2,
  'a fresh session must also retain all shafts after a culled first read');
});

test('underground player cannot walk through walls, skip floors or descend without an open column',()=>{
 const {p,m}=first(),explorer=Mining.createExplorer(m,p);
 assert.ok(explorer);
 assert.deepEqual(plain(explorer.position()),{
  layer:0,dx:0,dy:0,x:(Math.floor(p.x/32)+.5)*32,
  y:(Math.floor(p.y/32)+.5)*32,z:0
 });
 assert.equal(explorer.canMove(1,0),false,'ground-plane movement remains owned by the existing engine');
 assert.equal(explorer.descend(),false,'must first open the shaft');
 assert.equal(explorer.ascend(),false,'surface is maximum for this mine subscene');
 assert.equal(explorer.canDig(2,0),false,'miner cannot dig through two cells of solid rock');
 assert.equal(explorer.canDig(0,0),true);
 assert.equal(m.mine(p,0,0,0).ok,true);
 assert.equal(explorer.descend(),true);
 assert.equal(explorer.position().z,-8);
 assert.equal(explorer.canMove(1,0),false,'sealed topsoil blocks movement');
 assert.equal(explorer.move(0,0),false,'movement is cardinal one cell');
 assert.equal(m.mine(p,1,0,0).ok,true);
 assert.equal(explorer.move(1,0),true,'surface-cut passage makes a walkable tunnel at -8');
 assert.equal(explorer.position().dx,1);
 assert.equal(explorer.canDescend(),false,'no floor-to-floor teleport from an unexcavated column');
 assert.equal(explorer.canDig(-1,0),false,'digging range is relative to the miner');
 assert.equal(explorer.ascend(),false,'must return to the central shaft before climbing out');
 assert.equal(explorer.move(-1,0),true,'walk back into the central shaft');
 assert.equal(explorer.ascend(),true,'surface shaft allows climbing out');
 assert.equal(explorer.position().z,0);
 assert.equal(explorer.move(-1,0),false,'no underground movement after reaching surface');
});

test('mining avatar moves between two excavated underground depths and respects vertical ceiling',()=>{
 const {p,m}=first(),explorer=Mining.createExplorer(m,p);
 assert.equal(m.mine(p,0,0,0).ok,true);
 assert.equal(explorer.descend(),true);
 assert.equal(m.mine(p,0,0,1).ok,true);
 assert.equal(explorer.descend(),true);
 assert.equal(explorer.position().z,-16);
 assert.equal(explorer.canMove(1,0),false);
 assert.equal(m.mine(p,1,0,1).ok,true);
 assert.equal(explorer.move(1,0),true,'open -16 tunnel can be traversed');
 assert.equal(explorer.ascend(),false,'the -8 block above this tunnel remains solid');
 assert.equal(explorer.move(-1,0),true);
 assert.equal(explorer.ascend(),true);
 assert.equal(explorer.position().z,-8);
 assert.equal(explorer.ascend(),true);
 assert.equal(explorer.position().z,0);
 assert.equal(explorer.descend(),true);
 assert.equal(explorer.position().z,-8);
 assert.equal(explorer.move(2,0),false,'cannot cross two grid cells in one step');
 assert.equal(Mining.createExplorer(m,{x:5600,y:5940}),null,'original city is protected');
 assert.equal(Mining.createExplorer(m,{...p,room:{id:'shop'}}),null);
});

test('original Canvas mine visuals draw only validated surface geometry and live isometric cutaway',()=>{
 const {p,m}=first(),V=ctx.CityMineVisuals,trace=[];
 const gradient={addColorStop(){}};
 const g={canvas:{width:640,height:350},save(){},restore(){},
  createLinearGradient:()=>gradient,clearRect(){trace.push('clear')},
  fillRect(){trace.push('rect')},fillText(){trace.push('text')},beginPath(){},
  lineTo(){},moveTo(){},closePath(){},stroke(){},fill(){},ellipse(){},arc(){},translate(){}};
 assert.equal(V.surface(g,[]),0);
 assert.equal(V.slice(g,m,p,{layer:0,dx:0,dy:0,z:0}),true);
 assert.ok(trace.includes('rect')&&trace.includes('text'),'visible Canvas geology and labels draw');
 trace.length=0;
 assert.equal(m.mine(p,0,0,0).ok,true);
 assert.equal(V.surface(g,m.surfaceOpenings()),1);
 assert.ok(trace.includes('text'),'shaft includes a visible Mine label');
 assert.equal(V.slice(g,m,p,{layer:7,dx:0,dy:0,z:-56}),true,'bedrock is rendered');
 assert.equal(V.slice(g,m,p,{layer:8,dx:0,dy:0,z:-64}),false,'out-of-bounds layer cannot render');
});
