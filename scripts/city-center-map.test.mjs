import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx={};
for(const file of ['city-core.js','city-center-save.js','city-interiors.js','city-nav.js'])
 vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx);
const C=ctx.MemeCityCore,Save=ctx.CityCenterSave,I=ctx.CityInteriors;
const plain=x=>JSON.parse(JSON.stringify(x));
const makeStore=init=>{const m=new Map(Object.entries(init||{}));return {m,getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v)};};
const keys=['offensive-meme-city-v1-center','offensive-meme-city-v1','offensive-meme-city-v1-center-source-backup'];
test('World V1 central player base is the middle district, with all six clan HQs in separate quarters',()=>{
 const fort=C.DISTRICTS.find(d=>d.id==='fortress'),world=C.WORLD;
 assert.equal(world.width,11200);assert.equal(world.height,11200);
 assert.equal(fort.ox,4480);assert.equal(fort.oy,4480);
 assert.ok(Math.abs(C.PLOT.x+512-world.width/2)<50);
 assert.ok(Math.abs(C.PLOT.y+320-world.height/2)<400);
 assert.equal(C.areaAt(world.spawn.x,world.spawn.y),'fortress');
 assert.equal(C.blocked(world.spawn.x,world.spawn.y),false);
 assert.equal(new Set(C.NEIGHBORHOODS.map(n=>n.ox+','+n.oy)).size,6);
 for(const n of C.NEIGHBORHOODS){
  assert.equal(C.areaAt(n.x,n.y),n.id);
  const hq=C.WORLD.buildings.find(b=>b.id===n.id+'-0');
  assert.ok(hq&&hq.label===n.clan+' HQ',n.id+' own headquarters');
  assert.equal(C.areaAt(hq.x+20,hq.y+20),n.id);
  assert.equal(C.blocked(n.x,n.y),false);
  const lot=C.outpostLot(n.id);
  assert.ok(lot&&C.areaAt(lot.x,lot.y)===n.id,'private clan outpost belongs to territory');
 }
});
test('major shops/services occupy multiple regions and keep open physical doors',()=>{
 const ids=['launch','arcade','club','shop','market','garage'];
 const regions=new Set(ids.map(id=>{const b=C.WORLD.buildings.find(b=>b.id===id);return C.areaAt(b.x+b.w/2,b.y+b.h/2);}));
 assert.ok(regions.size>=4,'shop and entertainment sites scattered across 4+ quarters');
 for(const id of ids){
  const building=I.BUILDINGS.find(b=>b.roomId===id),door=I.door(building);
  assert.ok(building&&door,id+' building entrance exists');
  assert.equal(C.blocked(door.x,door.y),false,'outside door must be walkable '+id);
  const station=C.WORLD.stations.find(s=>s.id===id);
  if(station)assert.equal(C.blocked(station.x,station.y),false,'business station open '+id);
 }
});
test('center-city migration preserves every original byte and all persistent progression',()=>{
 const original={version:5,saveVersion:5,worldVersion:1,
   x:1120,y:1160,area:'fortress',name:'Founding player',credits:877,xp:1500,
   inventory:[{uid:'gear-8',item:'boots'}],equipped:{feet:'gear-8'},
   route:2,plot:[{col:4,row:6,kind:'wall'}],crew:[{role:'sentry',post:{x:1190,y:1125}}],
   clans:{clan:'offensive',reputation:{offensive:8},outposts:[{clan:'offensive',kind:'tower',col:0,row:1}]},
   rising:{claimed:5,fortLevel:2}};
 const raw=JSON.stringify(original),storage=makeStore({[keys[1]]:raw});
 const result=Save.prepare(storage,...keys,C);
 assert.equal(result.blocked,false);
 assert.equal(result.data.version,6);assert.equal(result.data.layoutVersion,2);
 assert.equal(result.data.worldVersion,1);
 assert.equal(result.data.x,1120+4480);assert.equal(result.data.y,1160+4480);
 assert.equal(result.data.credits,877);assert.equal(result.data.xp,1500);
 assert.deepEqual(plain(result.data.inventory),original.inventory);
 assert.deepEqual(plain(result.data.plot),original.plot);
 assert.deepEqual(plain(result.data.clans),original.clans);
 assert.deepEqual(plain(result.data.rising),original.rising);
 assert.equal(result.data.crew[0].post.x,5670);
 assert.equal(storage.getItem(keys[1]),raw);
 assert.equal(storage.getItem(keys[2]),raw);
 const repeat=Save.prepare(storage,...keys,C);
 assert.equal(repeat.blocked,false);assert.equal(repeat.data.version,6);
 assert.equal(storage.getItem(keys[1]),raw);
});
test('migration fails closed on malformed, conflicting and inaccessible original data',()=>{
 for(const raw of ['{broken',JSON.stringify({version:7}),JSON.stringify({version:5,saveVersion:5,worldVersion:2})]){
  const storage=makeStore({[keys[1]]:raw});const r=Save.prepare(storage,...keys,C);
  assert.equal(r.blocked,true,raw);assert.equal(storage.getItem(keys[0]),null);assert.equal(storage.getItem(keys[1]),raw);
 }
 const orig=JSON.stringify({version:5,saveVersion:5,worldVersion:1,x:3360,y:900});
 const conflict=makeStore({[keys[1]]:orig,[keys[2]]:'previous source version'});
 assert.equal(Save.prepare(conflict,...keys,C).blocked,true);
 const full=makeStore({[keys[1]]:orig});full.setItem=()=>{throw Error('Quota exceeded');};
 assert.equal(Save.prepare(full,...keys,C).blocked,true);
 assert.equal(full.getItem(keys[0]),null);
 const corrupted=makeStore({[keys[0]]:'{not-json'});
 assert.equal(Save.prepare(corrupted,...keys,C).blocked,true);
});

test('Founder Square scenery, ambient enemies and pickups actually move with the hub',()=>{
 const plazaTrees=C.SCENERY.filter(o=>o.kind==='tree'&&o.x>=C.HUB.x&&o.x<C.HUB.x+C.HUB.width&&o.y>=C.HUB.y&&o.y<C.HUB.y+C.HUB.height);
 assert.ok(plazaTrees.length>=8,'the new Founder Square keeps its planted scenery');
 const sim={};for(const file of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),sim);
 const G=sim.MemeCityCore,e=new G.Engine(),p=e.join('solo','Guest','offensive');
 assert.equal(p.area,'fortress','new players start at their central fortress');
 for(const b of e.arcade.bots.filter(b=>(b.id.startsWith('gang-')||b.id.startsWith('cop-'))&&Number.isInteger(Number(b.id.split('-')[1]))))
  assert.equal(G.areaAt(b.x,b.y),'hub','ambient '+b.id+' stays in Founder Square');
 for(const o of e.arcade.pickups)assert.equal(G.areaAt(o.x,o.y),'hub','pickup '+o.id+' is in Founder Square');
});
test('fortress defense raiders use the centered plot rather than the retired map origin',()=>{
 const sim={};for(const file of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),sim);
 const G=sim.MemeCityCore,e=new G.Engine(),p=e.join('solo','Guest','offensive');p.credits=1000;
 e.action('solo',{type:'defenseDrill'});
 const raiders=e.arcade.bots.filter(b=>b.raid&&b.owner==='solo');
 assert.equal(raiders.length,4);
 for(const b of raiders){assert.equal(G.areaAt(b.x,b.y),'fortress');assert.equal(G.blocked(b.x,b.y,p),false);}
});
test('arena survival waves spawn within the relocated arena',()=>{
 const sim={};for(const file of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),sim);
 const G=sim.MemeCityCore,e=new G.Engine(),p=e.join('solo','Guest','offensive');
 const marshal=sim.CityRising.GUIDES.find(g=>g.id==='marshal');
 p.x=marshal.x;p.y=marshal.y;p.area=G.areaAt(p.x,p.y);
 assert.equal(p.area,'arena');
 e.action('solo',{type:'startSurvival'});
 for(let i=0;i<31;i++)e.tick(.1);
 const wave=e.arcade.bots.filter(b=>b.arena&&b.owner==='solo');
 assert.ok(wave.length>=3,'first survival wave appears');
 for(const b of wave)assert.equal(G.areaAt(b.x,b.y),'arena',b.id+' uses current arena coordinates');
});
test('the scattered equipment shop still sells gear from its indoor counter',()=>{
 const sim={};for(const file of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),sim);
 const G=sim.MemeCityCore,e=new G.Engine(),p=e.join('solo','Guest','offensive'),I=sim.CityInteriors;
 const shop=I.BUILDINGS.find(b=>b.roomId==='shop'),door=I.door(shop);
 assert.equal(G.areaAt(door.x,door.y),'arena');
 p.x=door.x;p.y=door.y;p.area=G.areaAt(p.x,p.y);p.credits=1000;
 e.action('solo',{type:'enterBuilding',building:'shop'});
 p.room.x=I.ROOM.activity.x;p.room.y=I.ROOM.activity.y;
 e.action('solo',{type:'buy',item:'jacket'});
 assert.equal(p.inventory.length,1);
 assert.equal(p.inventory[0].item,'jacket');
 assert.equal(p.area,'interior','buying does not teleport the player out of the store');
});

test('center-city routes reach each public shop and all six clan headquarters without teleporting',()=>{
 const nav=ctx.CityNav.createRouter(C,{cell:100,budget:15000}),from={...C.WORLD.spawn};
 const names=['launch','arcade','club','shop','market','garage',
  ...C.NEIGHBORHOODS.map(n=>n.id+'-0')];
 for(const name of names){
  const b=I.BUILDINGS.find(b=>b.roomId===name),door=I.door(b);
  assert.equal(C.blocked(door.x,door.y),false,name+' entrance must be physically open');
  const route=nav.plan(from,door);
  assert.equal(route.status,'ok',name+' must be reachable along connected walking streets');
  assert.ok(route.points.length>=2,name+' should provide a walking route');
  for(let i=1;i<route.points.length;i++)
   assert.ok(nav.clear(route.points[i-1],route.points[i]),name+' walking route crosses an obstacle');
 }
});
