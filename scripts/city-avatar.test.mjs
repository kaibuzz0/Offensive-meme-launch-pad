import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../city-core.js',import.meta.url),'utf8'),context);
vm.runInNewContext(fs.readFileSync(new URL('../city-visuals.js',import.meta.url),'utf8'),context);
const {weaponPose}=context.window.CityVisuals;
test('rifle grips retain fixed arm lengths across 360 degrees and recoil',()=>{
 for(let degree=0;degree<=360;degree++)for(const flash of [false,true]){
  const a=degree*Math.PI/180,p=weaponPose(a,flash);
  for(let i=0;i<2;i++){
   assert.ok(Math.abs(Math.hypot(...p.joints.elbows[i].map((v,k)=>v-p.joints.shoulders[i][k]))-27)<1e-8);
   assert.ok(Math.abs(Math.hypot(...p.joints.elbows[i].map((v,k)=>v-p.joints.hands[i][k]))-29)<1e-8);
  }
  assert.ok(Math.abs(Math.hypot(p.muzzle.x-p.pivot.x,p.muzzle.y-p.pivot.y)-50)<1e-8);
  const next=weaponPose(a+.001,flash);
  for(let i=0;i<2;i++)assert.ok(Math.hypot(p.elbows[i].x-next.elbows[i].x,p.elbows[i].y-next.elbows[i].y)<.25,'no elbow flip during turning');
 }
});
test('solid avatar surfaces are depth sorted and the rifle crosses behind the body',()=>{
 const {rigSurfaces}=context.window.CityVisuals;
 for(let degree=0;degree<360;degree+=5){
  const faces=rigSurfaces({style:{},flash:degree%10===0},degree*Math.PI/180);
  for(let i=1;i<faces.length;i++)assert.ok(faces[i].depth>=faces[i-1].depth);
  for(const f of faces)for(const p of f.points)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.depth));
 }
 const average=(faces,color)=>{const matches=faces.filter(f=>f.color===color);return matches.reduce((s,f)=>s+f.depth,0)/matches.length;};
 const front=rigSurfaces({style:{}},Math.PI/2),back=rigSurfaces({style:{}},-Math.PI/2);
 assert.ok(average(front,'#829aa4')>average(front,'#303e4d'),'rifle in front when facing camera');
 assert.ok(average(back,'#829aa4')<average(back,'#303e4d'),'rifle behind when facing away');
});

test('armed clothing has visible meme surfaces at every yaw and keeps pants patterns',()=>{const {rigSurfaces}=context.window.CityVisuals;for(let deg=0;deg<360;deg+=10){const faces=rigSurfaces({style:{print:1},clanRank:3,holderTier:2},deg*Math.PI/180);const prints=faces.filter(f=>f.print==='meme');assert.equal(prints.length,4);assert.ok(prints.some(f=>{const [a,b,,d]=f.points;return Math.abs((b.x-a.x)*(d.y-a.y)-(b.y-a.y)*(d.x-a.x))>150;}));assert.equal(faces.filter(f=>f.print==='pattern').length,2);assert.ok(faces.some(f=>f.color==='#f0d17c'));}});
test('shared muzzle maps ground-plane shots to visual height in every direction',()=>{const C=context.window.MemeCityCore;for(let d=0;d<360;d++){const a=d*Math.PI/180;for(const recoil of [0,.5,1]){const ground=C.weaponAnchor(a,recoil),pose=weaponPose(a,recoil);assert.ok(Math.abs(ground.x-pose.muzzle.x)<1e-9);assert.ok(Math.abs(ground.y-ground.height-pose.muzzle.y)<1e-9);}}});
