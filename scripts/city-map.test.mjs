import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={};
for(const file of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-map.js'])vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),context);
const C=context.MemeCityCore,I=context.CityInteriors,R=context.CityRising,M=context.CityMap;
const all=M.catalog(C,I,R);
test('stable map catalog includes every real entrance and every district without duplicate IDs',()=>{
 assert.equal(new Set(all.map(p=>p.id)).size,all.length);
 assert.equal(all.filter(p=>p.kind==='door').length,I.BUILDINGS.length);
 assert.equal(all.filter(p=>p.kind==='district').length,C.DISTRICTS.length+C.NEIGHBORHOODS.length+1);
 for(const b of I.BUILDINGS){const p=all.find(p=>p.id==='door:'+b.roomId),d=I.door(b);assert.ok(p,b.roomId);assert.equal(p.x,d.x);assert.equal(p.y,d.y);assert.equal(p.activity,b.activity);}
 for(const p of all){assert.ok(p.x>=0&&p.y>=0&&p.x<=C.WORLD.width&&p.y<=C.WORLD.height);assert.ok(p.name);}
 assert.deepEqual(JSON.parse(JSON.stringify(M.catalog(C,I,R))),JSON.parse(JSON.stringify(all)));
});
test('scaled phone/desktop map taps resolve to the same world coordinate',()=>{
 const rect={left:20,top:50,width:336,height:336};
 const pt=M.fromCanvas(188,218,rect,C.WORLD);assert.equal(pt.x,C.WORLD.width/2);assert.equal(pt.y,C.WORLD.height/2);
 assert.equal(M.fromCanvas(19,218,rect,C.WORLD),null);
 assert.equal(M.fromCanvas(188,387,rect,C.WORLD),null);
 assert.equal(M.fromCanvas(NaN,218,rect,C.WORLD),null);
 assert.equal(M.fromCanvas(188,218,{...rect,width:0},C.WORLD),null);
});
test('touch hit-testing selects nearby real service doors, never arbitrary empty streets',()=>{
 const service=all.find(p=>p.id==='door:market');assert.ok(service);
 assert.equal(M.closest(all,{x:service.x,y:service.y},175).id,service.id);
 assert.equal(M.closest(all,{x:-10000,y:-10000},175),null);
 assert.equal(M.closest(all,{x:NaN,y:0}),null);
});
