import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const scope={window:{}};
for(const f of ['city-core.js','city-visuals.js'])
 vm.runInNewContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),scope);
const V=scope.window.CityVisuals;
const src=n=>fs.readFileSync(new URL('../'+n,import.meta.url),'utf8');

test('zombie and monk are skins on the exact same depth-sorted 360-degree player rig',()=>{
 for(const role of ['player','zombie','monk','cop','gang','guard','civilian']){
  for(const armed of [true,false])for(let deg=0;deg<360;deg+=15){
   const faces=V.rigSurfaces({role,style:{skin:0,hair:1,pants:1},
    offenderSkin:true,clanSkin:'redacted',armed,stridePose:4,
    travel:{x:.65,y:.76},aim:{x:Math.cos(deg*Math.PI/180),y:Math.sin(deg*Math.PI/180)}},
    deg*Math.PI/180);
   assert.ok(faces.length>60,role+' uses solid body meshes instead of a billboard');
   assert.equal(faces.some(f=>f.color==='#829aa4'),armed,role+' uses the one shared weapon/arm rig');
   for(let i=0;i<faces.length;i++){
    if(i)assert.ok(faces[i-1].depth<=faces[i].depth,role+' maintains 360-depth sorting at '+deg);
    for(const p of faces[i].points)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.depth));
   }
   if(role==='zombie'){
    assert.ok(faces.some(f=>f.color==='#4c5548'),'zombie has its ragged torso skin');
    assert.ok(faces.some(f=>f.color==='#ddf58d'),'zombie has pale green eyes');
    assert.ok(!faces.some(f=>f.color==='#c6f916'),'zombie cannot wear a wallet holder skin');
   }
   if(role==='monk'){
    assert.ok(faces.some(f=>f.color==='#725746'),'monk has his robe');
    assert.ok(faces.some(f=>f.color==='#f2d18c'),'monk has a 3D halo');
    assert.ok(!faces.some(f=>f.color==='#c6f916'),'monk cannot wear a wallet holder skin');
   }
  }
 }
});
test('solo dead-zone zombie actor and monk no longer use separate Canvas character illustrations',()=>{
 const city=src('city.js'),monk=src('city-monk.js'),arcade=src('city-arcade.js');
 const npcFiles=[city,monk,src('city-rise-visuals.js'),src('city-room-visuals.js'),src('city-districts.js')];
 assert.ok(city.includes("if(b.kind==='zombie'){"),'zombies are rendered as live world actors');
 assert.ok(city.includes("role:'zombie'"),'zombie skin belongs to NPC model');
 assert.equal(city.includes('function drawZombie('),false,'legacy zombie-only figure removed');
 assert.ok(monk.includes("role:'monk'"),'monk skin uses shared model');
 assert.ok(monk.includes('root.CityVisuals.person(c,'),'monk renders same body as players');
 assert.equal(monk.includes('const robe=c.createLinearGradient'),false,'legacy standalone monk body removed');
 assert.ok(monk.includes('tornadoes')&&monk.includes('quote.he')&&monk.includes('quote.en'),
  'monk powers, Bible verses and healing visuals remain');
 for(const file of npcFiles)assert.ok(/(?:CityVisuals|\bV)\.person\(/.test(file),
  'humanoid NPCs call one shared person renderer: '+file.slice(0,60));
 assert.ok(arcade.includes("C.areaAt(p.x,p.y)==='greenbelt'"),'zombies still spawn only outside the city and bases');
 assert.ok(arcade.includes('a.zombieNext??=8'),'solo dead-zone explorers meet walkers promptly');
});
