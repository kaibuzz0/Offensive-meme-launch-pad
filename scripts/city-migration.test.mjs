import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx={};
for(const f of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-save.js','city-topology.js','city-migration.js'])
 vm.runInNewContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),ctx);
const C=ctx.MemeCityCore,T=ctx.CityTopology,M=ctx.CityMigration;
const clone=x=>JSON.parse(JSON.stringify(x));
const base=()=>({version:5,saveVersion:5,worldVersion:1,x:C.WORLD.spawn.x,y:C.WORLD.spawn.y,area:'hub',xp:752,credits:311,
 inventory:[{uid:'gear-10',item:'jacket'}],equipped:{outfit:'gear-10'},clans:{clan:'exit',reputation:{exit:11},
 outposts:[{clan:'exit',col:1,row:2,kind:'tower'}],outpostStyles:{exit:'holo'}},
 plot:[{kind:'home',col:3,row:3}],crew:[{id:'crew-1',role:'sentry',post:{x:800,y:1290}}],
 rising:{claimed:4,found:['fort','gallery'],fortLevel:1,medkits:3},places:{visited:['shop'],souvenirs:['shop']},
 route:1,completed:false,kills:7,jobs:5,deaths:2,style:{skin:1,hair:2,pants:3,print:1}});
function store(entries={}){const data=new Map(Object.entries(entries));return {data,getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v)};}
const keys={active:'solo',backup:'solo-world2-backup',preview:'solo-world2-preview'};
test('v1 local-area position and every v2-v5 district migrate deterministically without live world change',()=>{
 const regions=['hub',...C.DISTRICTS.map(d=>d.id),...C.NEIGHBORHOODS.map(n=>n.id)];
 for(const id of regions){const r=T.source(C,id),p=base();p.x=r.x+r.w*.4;p.y=r.y+r.h*.5;p.area=id;
  const a=M.plan(C,T,p);assert.equal(a.status,'preview',id);assert.equal(a.save.worldVersion,2);
  assert.equal(a.save.area,id);assert.equal(a.save.x,T.point(C,{x:p.x,y:p.y}).x);
  const legacy={...p,version:1,x:r.w*.4,y:r.h*.5};delete legacy.worldVersion;delete legacy.saveVersion;
  const v1=M.plan(C,T,legacy);assert.equal(v1.status,'preview',id);assert.equal(v1.save.x,a.save.x);}
 assert.equal(C.WORLD.width,6720);assert.equal(ctx.CitySave.WORLD_VERSION,1);assert.equal(T.draft.enabled,false);
});
test('migration preserves earned progression, all plot/outpost tile indices and inventory with distinct clones',()=>{
 const old=base(),string=JSON.stringify(old),result=M.plan(C,T,old);assert.equal(result.status,'preview');
 for(const key of ['xp','credits','inventory','equipped','clans','plot','rising','places','route','completed','kills','jobs','deaths','style'])
  assert.deepEqual(clone(result.save[key]),clone(old[key]),key);
 assert.equal(result.save.version,6);assert.equal(result.save.saveVersion,6);assert.equal(result.save.worldVersion,2);
 assert.equal(JSON.stringify(old),string);
 assert.notEqual(result.save.inventory,old.inventory);
 assert.equal(result.crewPosts.length,1);
 assert.deepEqual(clone(result.anchor.plot),clone(T.draft.plot));
 for(const n of C.NEIGHBORHOODS)assert.ok(result.anchor.outposts.some(o=>o.id===n.id));
 assert.ok(result.routeTarget&&Number.isFinite(result.routeTarget.x));
});
test('greenbelt recovery does not erase XP, credits or construction, and bad crew posts recover',()=>{
 const original=base();original.x=3200;original.y=2300;original.crew[0].post={x:-50,y:-50};
 const result=M.plan(C,T,original);assert.equal(result.status,'preview');
 assert.equal(result.save.area,'hub');assert.equal(result.save.x,5040);assert.equal(result.save.y,4240);
 assert.equal(result.save.credits,311);assert.equal(result.save.plot[0].kind,'home');
 assert.equal(result.notices.length,2);assert.equal(result.save.crew[0].post.y,T.draft.areas.fortress.y+T.draft.areas.fortress.h-120);
});
test('optional world coordinates translate and invalid checkpoints clear with notice',()=>{
 const original=base();original.waypoint={x:3000,y:800,name:'Night Market'};
 original.checkpoint={x:-200,y:50};original.respawn={x:1000,y:1300};
 const plan=M.plan(C,T,original);assert.equal(plan.save.waypoint.name,'Night Market');
 assert.equal(plan.save.waypoint.x,T.point(C,original.waypoint).x);
 assert.equal(plan.save.checkpoint,null);assert.ok(plan.notices.some(n=>n.includes('checkpoint')));
 assert.ok(plan.save.respawn.x>0);
});
test('active unknown session states and future saves fail closed',()=>{
 for(const extra of [{contract:{type:'courier'}},{blockJob:{type:'hold'}},{defense:{countdown:20}},{room:{id:'market'}},{rising:{arena:{wave:1}}}]){
  const r=M.plan(C,T,{...base(),...extra});assert.equal(r.status,'blocked');
 }
 assert.equal(M.plan(C,T,{...base(),worldVersion:2}).status,'invalid');
 assert.equal(M.plan(C,T,{...base(),worldVersion:undefined}).status,'invalid');
 assert.equal(M.plan(C,T,{...base(),version:7}).status,'invalid');
});
test('world2 staging leaves active raw save untouched and retains exact rollback source',()=>{
 const raw=JSON.stringify(base()),s=store({solo:raw}),first=M.stage(s,keys,C,T);
 assert.equal(first.status,'staged');assert.equal(s.getItem('solo'),raw);assert.equal(s.getItem(keys.backup),raw);
 const staged=JSON.parse(s.getItem(keys.preview));assert.equal(staged.kind,'world2-preview-only');assert.equal(staged.save.worldVersion,2);
 assert.equal(staged.save.x,M.plan(C,T,base()).save.x);
 assert.equal(M.stage(s,keys,C,T).status,'staged');assert.equal(s.getItem(keys.backup),raw);
});
test('changed save revision, bad storage and existing backup cannot be silently overridden',()=>{
 const raw=JSON.stringify(base()),other=JSON.stringify({...base(),credits:999});
 const s=store({solo:raw,[keys.backup]:other});
 assert.equal(M.stage(s,keys,C,T).status,'conflict');assert.equal(s.getItem(keys.backup),other);
 const q=store({solo:raw});q.setItem=()=>{throw Error('QuotaExceeded');};
 assert.equal(M.stage(q,keys,C,T).status,'blocked');assert.equal(q.getItem('solo'),raw);
 const racing=store({solo:raw}),oldRead=racing.getItem.bind(racing);let reads=0;
 racing.getItem=k=>{if(k===keys.active&&++reads===2)racing.data.set(keys.active,other);return oldRead(k);};
 assert.equal(M.stage(racing,keys,C,T).status,'conflict');assert.equal(racing.getItem(keys.preview),null);
});

test('staged preview can only be considered when original and recovery match exactly',()=>{
 const raw=JSON.stringify(base()),s=store({solo:raw});
 assert.equal(M.inspectStage(s,keys).status,'missing');
 assert.equal(M.stage(s,keys,C,T).status,'staged');
 const inspected=M.inspectStage(s,keys);assert.equal(inspected.status,'ready-for-review');assert.equal(inspected.save.worldVersion,2);
 s.setItem(keys.active,JSON.stringify({...base(),credits:12345}));
 assert.equal(M.inspectStage(s,keys).status,'conflict');
 s.setItem(keys.active,raw);s.setItem(keys.preview,'{no');
 assert.equal(M.inspectStage(s,keys).status,'invalid');
});
