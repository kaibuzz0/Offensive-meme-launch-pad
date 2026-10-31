import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx={};
for(const f of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-save.js','city-topology.js'])vm.runInNewContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),ctx);
const C=ctx.MemeCityCore,T=ctx.CityTopology,save=ctx.CitySave,I=ctx.CityInteriors;
test('world2 blueprint has centered fortress and distinct cardinal road axes',()=>{
 const t=T.draft;assert.equal(t.enabled,false);assert.equal(t.world.center.x,t.world.width/2);assert.equal(t.world.center.y,t.world.height/2);
 assert.equal(t.areas.fortress.col,2);assert.equal(t.areas.fortress.row,2);
 assert.equal(Object.keys(t.areas).length,11);
 assert.equal(JSON.stringify(t.roads.map(r=>r.id)),JSON.stringify(['north','east','south','west']));
 for(const r of t.roads)assert.ok(r.from.x===t.world.center.x||r.from.y===t.world.center.y);
 assert.equal(t.plot.cols,C.PLOT.cols);assert.equal(t.plot.rows,C.PLOT.rows);assert.equal(t.plot.tile,C.PLOT.tile);
});
test('every stable current district and token neighborhood has a deterministic projection',()=>{
 const keys=['hub',...C.DISTRICTS.map(d=>d.id),...C.NEIGHBORHOODS.map(n=>n.id)];
 for(const id of keys){const old=T.source(C,id),q={x:old.x+old.w/2,y:old.y+old.h/2};assert.equal(T.sourceId(C,q),id);const p=T.point(C,q);assert.equal(p.area,id);assert.ok(p.x>=T.draft.areas[id].x&&p.x<=T.draft.areas[id].x+T.draft.areas[id].w);assert.ok(p.y>=T.draft.areas[id].y&&p.y<=T.draft.areas[id].y+T.draft.areas[id].h);}
 for(const b of I.BUILDINGS){const d=I.door(b);assert.ok(T.point(C,d),b.roomId+' needs an explicit map transform');}
});
test('private fortress kit and clan outposts keep their tile-local placement slots',()=>{
 const p=T.draft.plot;assert.equal(p.cols*64,1024);assert.equal(p.rows*64,640);
 assert.ok(p.x>T.draft.areas.fortress.x&&p.x+1024<T.draft.areas.fortress.x+T.draft.areas.fortress.w);
 assert.ok(p.y>T.draft.areas.fortress.y&&p.y+640<T.draft.areas.fortress.y+T.draft.areas.fortress.h);
 for(const n of C.NEIGHBORHOODS){const lot=T.outpost(C,n.id);assert.equal(lot.cols,3);assert.equal(lot.tile,64);assert.ok(lot.x+192<T.draft.world.width);}
});
test('preview is non-destructive and blocks unknown greenbelt positions',()=>{
 const data={version:5,saveVersion:5,worldVersion:1,x:C.WORLD.spawn.x,y:C.WORLD.spawn.y,xp:1200,credits:340,inventory:[{uid:'gear-7',item:'jacket'}],plot:[{col:5,row:5,kind:'home'}],clans:{reputation:{exit:7}},crew:[],rising:{claimed:2}};
 const original=JSON.stringify(data),preview=T.previewSave(C,data);
 assert.equal(preview.status,'preview');assert.equal(preview.worldVersion,2);assert.equal(preview.point.area,'hub');assert.equal(preview.unmodified.credits,340);assert.equal(preview.unmodified.inventory[0].uid,'gear-7');
 assert.equal(JSON.stringify(data),original);assert.equal(save.WORLD_VERSION,1,'live topology is not activated');
 assert.equal(T.previewSave(C,{...data,x:3200,y:2300}).status,'blocked');
 assert.equal(T.previewSave(C,{...data,worldVersion:3}).status,'invalid');
});
