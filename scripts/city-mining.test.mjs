import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx={};
for(const file of ['city-core.js','city-biomes.js','city-frontier.js','city-mining.js'])
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
 assert.deepEqual(Mining.STRATA.map(x=>x.z),[-8,-16,-24,-32,-40,-48,-56,-64]);
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
 assert.match(html,/city-mining\.js\?v=48-mining/);
 assert.match(html,/data-panel="mining"/);
 assert.match(pages,/city-mining\.js/);
 assert.match(server,/'city-mining\.js'/);
 assert.match(city,/Mine\.createStore/);
 assert.match(city,/miningStore\.mine\(entry,dx,dy,depth\)/);
 assert.match(city,/online\)\{content\.append\(node\('p','beta-note','Mining is currently Solo-only/);
 assert.match(city,/if\(type==='mining'\)miningPanel\(content\)/);
});
