import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx={};ctx.window=ctx;
for(const file of ['city-core.js','city-arcade.js','city-districts.js','city-interiors.js'])
 vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx);
const C=ctx.MemeCityCore,D=ctx.CityDistricts,I=ctx.CityInteriors;
const get=id=>C.WORLD.buildings.find(b=>b.id===id);

test('all active 3D-style business architecture derives from current immutable V1 building footprints',()=>{
 assert.equal(C.WORLD.originalWidth,11200);assert.equal(C.WORLD.width,24400);
 assert.equal(I.BUILDINGS.length,47);
 const positions=JSON.stringify(C.WORLD.buildings.map(({id,x,y,w,h})=>({id,x,y,w,h})));
 for(const b of C.WORLD.buildings){
  const profile=D.buildingProfile(b);
  assert.ok(profile.kind,'distinct modern building archetype');
  assert.ok(/^#[0-9a-f]{6}$/i.test(profile.wall));
  assert.ok(/^#[0-9a-f]{6}$/i.test(profile.glassLit));
  assert.equal(profile.accent,b.hue);
 }
 assert.equal(JSON.stringify(C.WORLD.buildings.map(({id,x,y,w,h})=>({id,x,y,w,h}))),positions);
 for(const b of I.BUILDINGS){
  const door=I.door(b);
  assert.equal(door.x,b.x+b.w/2,'front facade door remains horizontally centered');
  assert.equal(door.y,b.y+b.h+37,'entrance interaction point is unchanged');
  assert.equal(C.blocked(door.x,door.y),false,'the real walkable building entry is never blocked');
 }
});

test('landmarks, clans, services and social venues receive distinctive architecture (not generic recolors)',()=>{
 const check=[
  [get('launch'),'headquarters'],
  [get('arcade'),'arcade'],
  [get('club'),'nightlife'],
  [get('shop'),'industrial'],
  [get('market'),'market'],
  [get('garage'),'industrial'],
  [get('congress-0'),'headquarters'],
  [get('redacted-annex-1'),'medical'],
  [C.districtBlocks('creator')[0],'creative'],
  [C.districtBlocks('arena')[0],'arena'],
  [C.districtBlocks('social')[1],'cafe']
 ];
 for(const [b,kind] of check){assert.ok(b,'requested venue exists');assert.equal(D.buildingProfile(b).kind,kind,b.label);}
 const families=new Set(C.WORLD.buildings.concat(C.DISTRICTS.flatMap(d=>C.districtBlocks(d.id))).map(b=>D.buildingProfile(b).kind));
 assert.ok(families.size>=9,'architecture should vary across at least nine building families, not just tint');
 assert.equal(D.buildingProfile({label:'Rooftop',w:200,h:160}).kind,'generic','unknown structures have a safe default');
});

test('interiors are enriched without moving activities, saved rooms, or collidable furniture',()=>{
 const Csrc=fs.readFileSync(new URL('../city-core.js',import.meta.url),'utf8'),
  Isrc=fs.readFileSync(new URL('../city-interiors.js',import.meta.url),'utf8'),
  exteriors=fs.readFileSync(new URL('../city-districts.js',import.meta.url),'utf8'),
  interiors=fs.readFileSync(new URL('../city-room-visuals.js',import.meta.url),'utf8'),
  game=fs.readFileSync(new URL('../city.js',import.meta.url),'utf8');
 assert.ok(exteriors.includes('const ARCHITECTURE=Object.freeze('));
 assert.ok(exteriors.includes('function buildingFX('));
 assert.ok(exteriors.includes('const landmarkSprites=new Map();'));
 assert.ok(exteriors.includes('if(landmarkSprites.size>8)'),'district landmarks are rasterized and memory bounded');
 assert.ok(game.includes('if(buildingCache.size>30)'),'mobile building cache must be bounded');
 assert.ok(interiors.includes('const nightlife=')&&interiors.includes('const pool=g.createRadialGradient'),'room themes have independently rendered modern lighting');
 assert.ok(game.includes('D.buildingFX(ctx,b,time,reduced)'),'animated facade details are rendered near the player');
 assert.ok(Csrc.includes('function blocked(')&&Isrc.includes('function roomBlocked('),'navigation uses existing unchanged gameplay geometry');
 assert.equal(I.ROOM.activity.x,600);
 assert.equal(I.ROOM.exit.y,750);
});
