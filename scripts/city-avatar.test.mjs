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
test('OFFENDED holder cosmetic is a depth-sorted full skull at every yaw',()=>{
 const {rigSurfaces}=context.window.CityVisuals;
 for(let deg=0;deg<360;deg+=15){
  const theta=deg*Math.PI/180,skull=rigSurfaces({role:'player',offenderSkin:true,armed:deg%30===0},theta);
  assert.ok(skull.some(f=>f.color==='#14202a'),'skull has dark eye sockets');
  assert.ok(skull.some(f=>f.color==='#c6f916'),'skull has glowing eyes');
  assert.ok(skull.some(f=>f.color==='#f5f6e6'),'skull has individual bone teeth');
  assert.ok(skull.some(f=>f.color==='#e5edda'),'skull has a jaw');
  assert.ok(!skull.some(f=>f.color==='#8d583e'),'skull is not human face paint');
  for(let i=0;i<skull.length;i++){
   if(i)assert.ok(skull[i].depth>=skull[i-1].depth);
   for(const point of skull[i].points)assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y)&&Number.isFinite(point.depth));
  }
 }
});
test('shared muzzle maps ground-plane shots to visual height in every direction',()=>{const C=context.window.MemeCityCore;for(let d=0;d<360;d++){const a=d*Math.PI/180;for(const recoil of [0,.5,1]){const ground=C.weaponAnchor(a,recoil),pose=weaponPose(a,recoil);assert.ok(Math.abs(ground.x-pose.muzzle.x)<1e-9);assert.ok(Math.abs(ground.y-ground.height-pose.muzzle.y)<1e-9);}}});

test('NPC animations preserve moving aim and release stale pursuit targets',()=>{
 const {npcPose,npcScale,motion}=context.window.CityVisuals;
 assert.equal(npcScale(),.9);
 assert.equal(npcScale(true),1.15);
 const shooting=npcPose({state:'attack',x:40,y:55,aim:{x:90,y:30}});
 assert.deepEqual({...shooting.aim},{x:50,y:-25});
 assert.equal(shooting.moving,true,'firing does not forcibly disable the walking pose');
 assert.equal(npcPose({state:'skirmish',x:10,y:20,aim:{x:40,y:60}}).moving,true);
 assert.equal(npcPose({state:'chase',x:10,y:20,aim:{x:200,y:200}}).aim,undefined,'chasing faces travel, not the last shot');
 for(const state of ['ready','dormant','withdraw'])assert.equal(npcPose({state,x:0,y:0}).moving,false);
 const first=motion('test-moving-armed',0,0,1000,true);
 const moved=motion('test-moving-armed',12,0,1100,shooting.moving);
 assert.ok(moved.amount>first.amount,'actual travel animates legs during armed attacks');
});

test('NPCs and players share continuous depth-sorted weapon geometry with different uniforms',()=>{
 const {rigSurfaces}=context.window.CityVisuals;
 for(const role of ['player','cop','gang','guard'])for(let d=0;d<360;d+=15){
  const angle=d*Math.PI/180,full=rigSurfaces({role,style:{},stridePose:5,travel:{x:.6,y:.8},recoil:.5},angle);
  const small=rigSurfaces({role,style:{},simplified:true,stridePose:5,travel:{x:.6,y:.8},recoil:.5},angle);
  assert.ok(small.length<full.length,'small NPC rig uses fewer polygons');
  assert.ok(small.every((face,i)=>face.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.depth))&&(i===0||face.depth>=small[i-1].depth)));
  assert.equal(small.filter(f=>f.print==='meme').length,role==='player'?4:0);
  assert.equal(small.filter(f=>f.print==='insignia').length,role==='player'?0:4);
  assert.ok(small.some(f=>f.color==='#829aa4'),'all roles keep the same rifle');
 }
});


test('every character uses one depth-sorted solid body whether holding a rifle or not',()=>{
 const {rigSurfaces}=context.window.CityVisuals;
 const roles=['player','cop','gang','guard','civilian'];
 const gunColor='#829aa4';
 for(const role of roles)for(let d=0;d<360;d+=15){
  const angle=d*Math.PI/180;
  const base={role,style:{skin:2,hair:1,pants:3,print:1},stridePose:6,travel:{x:Math.cos(angle+.7),y:Math.sin(angle+.7)},simplified:role!=='player'};
  const armed=rigSurfaces({...base,armed:true},angle),relaxed=rigSurfaces({...base,armed:false},angle);
  assert.ok(armed.length>0&&relaxed.length>0,role+' should use solid polygons');
  assert.ok(armed.some(f=>f.color===gunColor),'armed '+role+' keeps canonical gun');
  assert.ok(!relaxed.some(f=>f.color===gunColor),'unarmed '+role+' must not show a phantom rifle');
  const body=color=>relaxed.filter(f=>f.color===color).length;
  assert.equal(body('#303e4d'),armed.filter(f=>f.color==='#303e4d').length,'same body for armed/unarmed player');
  assert.equal(relaxed.filter(f=>f.color==='#8d583e').length,armed.filter(f=>f.color==='#8d583e').length,'same skin model geometry');
  assert.equal(relaxed.filter(f=>f.print==='meme').length,armed.filter(f=>f.print==='meme').length,'same meme prints');
  assert.equal(relaxed.filter(f=>f.print==='insignia').length,armed.filter(f=>f.print==='insignia').length,'same role insignias');
  for(const faces of [armed,relaxed]){
   for(let i=0;i<faces.length;i++){
    if(i)assert.ok(faces[i].depth>=faces[i-1].depth,'shared rig must be painter depth sorted');
    for(const point of faces[i].points)assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y)&&Number.isFinite(point.depth),'unarmed and armed yaw must remain finite');
   }
  }
 }
});
test('V1 player, civilians and NPCs use the shooting-era solid renderer for every animation state',()=>{
 const {person}=context.window.CityVisuals;
 function canvas(){
  let faces=0,save=0,restore=0;
  const gradient={addColorStop(){}};
  const c=new Proxy({},{
   get(target,key){
    if(key==='createRadialGradient'||key==='createLinearGradient')return ()=>gradient;
    if(key==='fill')return ()=>{faces++;};
    if(key==='save')return ()=>{save++;};
    if(key==='restore')return ()=>{restore++;};
    return ()=>{};
   },
   set(){return true;}
  });
  return {c,counts:()=>({faces,save,restore})};
 }
 for(const role of ['player','cop','gang','guard','civilian']){
  for(const armed of [true,false]){
   for(let a=0;a<Math.PI*2;a+=Math.PI/4){
    const spy=canvas();
    assert.doesNotThrow(()=>person(spy.c,{
     id:role+'-'+armed+'-'+a,x:100,y:200,role,
     scale:role==='player'?1:.9,armed,aim:{x:Math.cos(a),y:Math.sin(a)},
     style:{skin:2,hair:1,pants:2},moving:true,phase:.5,
     gesture:!armed&&a===0
    },1100),'same solid rendering path at any direction for '+role);
    const {faces,save,restore}=spy.counts();
    assert.ok(faces>60,'solid polygon model was rendered, not a flat cached sprite');
    assert.equal(save,restore,'canvas state balanced');
   }
  }
 }
});

test('OFFENDER reskins the same 360-degree player rig without changing armed and walking mechanics',()=>{
 const {rigSurfaces}=context.window.CityVisuals;
 for(let deg=0;deg<360;deg+=15)for(const armed of [true,false]){
  const a=deg*Math.PI/180,base={role:'player',style:{skin:2,hair:1,pants:0,print:1},armed,stridePose:4};
  const original=rigSurfaces(base,a),offender=rigSurfaces({...base,offenderSkin:true},a);
  assert.ok(offender.some(f=>f.color==='#c6f916'),'lime skull/shoes must render');
  assert.ok(offender.some(f=>f.color==='#9226e8'),'purple bomber jacket trim must render');
  assert.equal(offender.filter(f=>f.print==='offender-crown').length,2,'crown patch on both sides');
  assert.equal(offender.filter(f=>f.print==='meme').length,original.filter(f=>f.print==='meme').length,'original jacket meme prints retained');
  assert.equal(offender.some(f=>f.color==='#829aa4'),armed,'same rifle is visible only when armed');
  assert.equal(original.some(f=>f.color==='#c6f916'),false,'guest skin must not unlock without verification');
  for(let i=0;i<offender.length;i++){
   if(i)assert.ok(offender[i].depth>=offender[i-1].depth,'offender rig remains depth sorted');
   for(const p of offender[i].points)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.depth));
  }
 }
 const npc=rigSurfaces({role:'gang',offenderSkin:true,armed:false,style:{}},0);
 assert.equal(npc.some(f=>f.color==='#c6f916'),false,'NPCs do not gain the wallet skin');
});

test('all six token-artwork clan skins reuse the player rig, keep every yaw and preserve armed/unarmed gun',()=>{
 const V=context.window.CityVisuals,skins={
  redacted:'#452453',congress:'#1b1b24',exit:'#6b7069',
  'you-missed':'#223356',maduro:'#a52b33',rug:'#241d2b'
 };
 for(const [id,coat]of Object.entries(skins))for(const armed of [false,true])for(let deg=0;deg<360;deg+=30){
  const angle=deg*Math.PI/180,o={role:'player',style:{skin:0,pants:0},clanSkin:id,armed,stridePose:4,travel:{x:.75,y:.25}};
  const faces=V.rigSurfaces(o,angle);
  assert.ok(faces.some(f=>f.color===coat),'skin '+id+' jacket color shows at '+deg);
  assert.equal(faces.filter(f=>f.print==='clan-'+id).length,2,'front/back clan mark '+id);
  assert.equal(faces.filter(f=>f.print==='meme').length,4,'existing coin art still displays');
  assert.equal(faces.some(f=>f.color==='#829aa4'),armed,'gun remains tied to original armed state');
  for(let i=0;i<faces.length;i++){
   if(i)assert.ok(faces[i].depth>=faces[i-1].depth,'skin keeps depth sorting');
   for(const p of faces[i].points)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.depth));
  }
 }
 const npc=V.rigSurfaces({role:'civilian',clanSkin:'rug',armed:false,style:{}},0);
 assert.ok(!npc.some(f=>f.color===skins.rug),'unrelated NPCs retain their design');
 const verified=V.rigSurfaces({role:'player',clanSkin:'maduro',offenderSkin:true},0);
 assert.ok(!verified.some(f=>f.color===skins.maduro),'verified OFFENDER automatically overrides selected clan fit');
 assert.ok(verified.some(f=>f.color==='#c6f916'),'OFFENDER lime skull preserved');
});
