import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const scope={};
for(const path of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-biomes.js','city-frontier.js','city-map.js','city-nav.js'])
 vm.runInNewContext(fs.readFileSync(new URL('../'+path,import.meta.url),'utf8'),scope,{filename:path});
const C=scope.MemeCityCore,F=scope.CityFrontier,B=scope.CityBiomes,M=scope.CityMap;
const plain=x=>JSON.parse(JSON.stringify(x));
const storage=init=>{const m=new Map(Object.entries(init||{}));return {
 m,getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v)
};};

test('132 different walkable environments expand original Center City without moving any legacy site',()=>{
 assert.deepEqual([C.WORLD.width,C.WORLD.height],[24400,14400]);
 assert.deepEqual([C.WORLD.originalWidth,C.WORLD.originalHeight],[11200,11200]);
 assert.deepEqual([C.WORLD.spawn.x,C.WORLD.spawn.y],[5600,5940]);
 assert.deepEqual([C.PLOT.x,C.PLOT.y,C.PLOT.cols,C.PLOT.rows],[5080,4930,16,10]);
 assert.equal(F.families.length,12);
 assert.equal(F.regions.length,132);
 assert.equal(F.sites.length,132);
 assert.equal(B.regions.length,3);
 assert.equal(new Set(F.regions.map(x=>x.id)).size,132);
 assert.equal(new Set(F.regions.map(x=>x.name)).size,132);
 assert.equal(new Set(F.regions.map(x=>x.group)).size,12);
 assert.equal(new Set(F.regions.map(x=>x.hue+':'+x.light+':'+x.sat)).size,132,'each biome has a different native palette');
 assert.equal(C.areaAt(5600,5940),'fortress');
 for(const r of F.regions){
  assert.ok(r.x>=11200&&r.y>=0&&r.x+r.w<=C.WORLD.width&&r.y+r.h<=C.WORLD.height,r.id);
  assert.equal(F.regionAt(r.entry.x,r.entry.y)?.id,r.id);
  assert.equal(C.areaAt(r.entry.x,r.entry.y),'greenbelt');
  assert.equal(C.blocked(r.entry.x,r.entry.y),false,r.id+' must be traversable');
  assert.equal(F.terrainAt(r.entry.x,r.entry.y).buildable,false);
  assert.equal(F.terrainAt(r.entry.x,r.entry.y).walkable,true);
  assert.equal(F.nearbySite(r.entry)?.regionId,r.id);
  assert.equal(F.nearbySite({...r.entry,room:{id:'indoor'}}),null);
  assert.equal(F.regionAt(r.x+1,r.y+1),null,'drawn irregular boundary also controls terrain query');
 }
 for(const id of ['forest','wasteland','highlands']){
  const r=B.regions.find(x=>x.id===id);
  assert.equal(F.regionAt(r.entry.x,r.entry.y),null,'legacy region untouched');
 }
 assert.equal(F.regionAt(11200,3000),null);
 assert.equal(F.terrainAt(-20,20),null);
 assert.equal(F.terrainAt(Infinity,20),null);
});

test('original map retains real door IDs and adds exactly 132 distinct frontier route targets',()=>{
 const old=M.catalog(C,scope.CityInteriors,scope.CityRising,B);
 const next=M.catalog(C,scope.CityInteriors,scope.CityRising,B,F);
 assert.equal(old.filter(p=>p.kind==='door').length,47);
 assert.equal(next.filter(p=>p.kind==='door').length,47);
 assert.equal(next.length-old.length,132);
 assert.equal(new Set(next.map(p=>p.id)).size,next.length);
 for(const r of F.regions){
  const p=next.find(p=>p.id==='biome:'+r.id);
  assert.ok(p,r.name);
  assert.deepEqual([p.x,p.y],[r.entry.x,r.entry.y]);
 }
});

test('walking routes from the original fortress to representative distant biomes use unchanged collision',()=>{
 const nav=scope.CityNav.createRouter(C,{cell:100,budget:18000});
 for(const r of [F.regions[0],F.regions[5],F.regions[65],F.regions[120],F.regions[131]]){
  const p=nav.plan(C.WORLD.spawn,r.entry);
  assert.equal(p.status,'ok',r.name+' must be reachable by the old continuous-world navigator');
  assert.ok(p.points.length>=2);
  for(let i=1;i<p.points.length;i++)assert.ok(nav.clear(p.points[i-1],p.points[i]),r.id);
 }
});

test('world-generation queries are deterministic independent of terrain render and journal state',()=>{
 const sample=F.regions[45],at=sample.entry;
 const before=plain(F.terrainAt(at.x,at.y));
 const ss=F.createJournal(storage());
 ss.discover(sample.id);
 assert.deepEqual(plain(F.terrainAt(at.x,at.y)),before);
 assert.equal(F.regionAt(at.x,at.y)?.name,sample.name);
 assert.deepEqual(plain(F.perimeter(sample)),plain(F.perimeter(sample)));
 for(const p of F.propsFor(sample))assert.ok(p.x>=sample.x&&p.x<sample.x+sample.w&&p.y>=sample.y&&p.y<sample.y+sample.h);
 assert.ok(F.propsFor(sample).length<=24);
});

test('versioned delta-only solo journal survives a reload without touching the original save',()=>{
 const s=storage({'offensive-meme-city-v1-center':'protected original bytes'});
 const j=F.createJournal(s),first=F.regions[0].id,last=F.regions.at(-1).id;
 assert.equal(j.count(),0);
 assert.equal(j.discover(first),true);
 assert.equal(j.discover(last),true);
 assert.equal(j.discover(first),false,'idempotent observation');
 assert.equal(j.count(),2);
 const next=F.createJournal(s);
 assert.deepEqual(plain(next.list()),[first,last]);
 assert.equal(next.has(first),true);
 assert.equal(s.getItem('offensive-meme-city-v1-center'),'protected original bytes');
 const raw=JSON.parse(s.getItem(F.SAVE_KEY));
 assert.equal(raw.version,1);
 assert.equal(raw.seed,F.SEED);
 assert.equal(raw.visited.length,2);
});

test('bad journal schemas never rewrite a saved record or grant invalid discoveries',()=>{
 for(const original of ['{broken',JSON.stringify({version:2,seed:F.SEED,visited:[]}),
  JSON.stringify({version:1,seed:F.SEED,visited:['frontier-not-a-biome']}),
  JSON.stringify({version:1,seed:F.SEED,visited:[F.regions[0].id,F.regions[0].id]})]){
  const s=storage({[F.SAVE_KEY]:original}),j=F.createJournal(s);
  assert.equal(j.disabled(),true);
  assert.equal(j.discover(F.regions[0].id),false);
  assert.equal(s.getItem(F.SAVE_KEY),original);
 }
 const full=storage();full.setItem=()=>{throw Error('Quota exceeded');};
 assert.equal(F.createJournal(full).discover(F.regions[0].id),false);
 assert.equal(F.createJournal(storage()).discover('other-invalid'),false);
});

test('only visible frontier chunks paint, and 12 textures plus 16 scenery caches are the maximum',()=>{
 function painter(){return {save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},
  clip(){},fill(){},stroke(){},fillRect(){},drawImage(){},ellipse(){},fillText(){},arc(){},translate(){},scale(){}};}
 let canvases=0;
 scope.document={createElement:()=>{canvases++;return{getContext:()=>painter()}}};
 assert.equal(F.drawGround(painter(),()=>false),0);
 assert.equal(F.scenery(painter(),()=>false).length,0);
 assert.equal(F.siteLayers(painter(),()=>false).length,0);
 for(const r of F.regions.slice(0,25)){
  assert.equal(F.drawGround(painter(),(x,y)=>x===r.x&&y===r.y),1);
  assert.equal(F.siteLayers(painter(),(x,y,w,h)=>x<r.x+r.w&&x+w>r.x&&y<r.y+r.h&&y+h>r.y).length,1);
  const props=F.scenery(painter(),(x,y,w,h)=>x<r.x+r.w&&x+w>r.x&&y<r.y+r.h&&y+h>r.y);
  assert.ok(props.length<=24,r.id);
 }
 assert.equal(F.cacheStats().textures,12);
 assert.ok(F.cacheStats().props<=16);
 assert.equal(canvases,25,'textures are produced on demand, never for offscreen tiles');
 const s=F.sites[0];
 assert.equal(F.nearbySite({x:s.x+125,y:s.y}),s);
 assert.equal(F.nearbySite({x:s.x+126,y:s.y}),null);
});

test('all 132 biome polygons and 12 group names can be drawn on existing map Canvas',()=>{
 const ctx={...{beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},fillText(){}}};
 F.drawMap(ctx,840/C.WORLD.width,840/C.WORLD.height);
 const src=fs.readFileSync(new URL('../city.js',import.meta.url),'utf8');
 assert.match(src,/F\.drawGround\(ctx/);
 assert.match(src,/F\.drawMap\(g,sx,sy\)/);
 assert.match(src,/F\.nearbySite\(me\)/);
 assert.match(src,/F\.siteLayers\(ctx,visible\)/);
 assert.match(src,/frontierJournal\.discover\(site\.regionId\)/);
 assert.match(src,/Choose one of 132 frontier biomes/);
 assert.equal(F.regions.length,132);
});

test('a stale tab cannot replace newer generated-world discovery deltas',()=>{
 const s=storage(),a=F.createJournal(s),b=F.createJournal(s);
 const first=F.regions[1].id,second=F.regions[2].id;
 assert.equal(a.discover(first),true);
 const committed=s.getItem(F.SAVE_KEY);
 assert.equal(b.discover(second),false,'stale snapshot must not overwrite newer visits');
 assert.equal(s.getItem(F.SAVE_KEY),committed);
 const fresh=F.createJournal(s);
 assert.equal(fresh.has(first),true);
 assert.equal(fresh.discover(second),true);
 assert.deepEqual(plain(F.createJournal(s).list()),[first,second]);
});
