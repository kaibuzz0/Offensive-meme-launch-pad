import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx={};
vm.runInNewContext(fs.readFileSync(new URL('../city-graphics.js',import.meta.url),'utf8'),ctx,{filename:'city-graphics.js'});
const G=ctx.CityGraphics;
const asNative=x=>JSON.parse(JSON.stringify(x));
function memory(seed={}){
 const map=new Map(Object.entries(seed));
 return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
}

test('separate graphics preferences preserve defaults, validated zoom and saved modes',()=>{
 const store=memory({'offensive-meme-city-v1-center':'protected player save'});
 const g=G.createSettings(store);
 assert.deepEqual(asNative(g.snapshot()),{zoom:'normal',quality:'auto'});
 assert.equal(g.zoom(),1);assert.equal(g.pixelRatioCap(),2);
 assert.equal(g.setZoom('detail'),true);assert.equal(g.zoom(),1.35);
 assert.equal(g.setQuality('performance'),true);assert.equal(g.pixelRatioCap(),1);
 assert.deepEqual(asNative(G.createSettings(store).snapshot()),{zoom:'detail',quality:'performance'});
 assert.equal(store.getItem('offensive-meme-city-v1-center'),'protected player save');
 assert.equal(g.cycleZoom(),'wide');assert.equal(g.zoom(),.82);
 assert.equal(g.cycleZoom(),'normal');
 assert.equal(g.cycleZoom(),'detail');
});

test('malformed graphics settings fail safe and invalid values are never applied',()=>{
 for(const raw of ['{broken','{"zoom":"first","quality":"auto"}','{"zoom":"wide","quality":"absurd"}','{"zoom":null,"quality":1}']){
  const s=memory({[G.KEY]:raw});
  const g=G.createSettings(s);
  assert.deepEqual(asNative(g.snapshot()),{zoom:'normal',quality:'auto'});
  assert.equal(s.getItem(G.KEY),raw,'existing invalid records are not overwritten on read');
  assert.equal(g.setZoom('__proto__'),false);
  assert.equal(g.setQuality('ultra'),false);
 }
 const broken={getItem(){throw Error('Storage denied');},setItem(){throw Error('Storage denied');}};
 const g=G.createSettings(broken);
 assert.equal(g.setZoom('wide'),true,'the game still works with storage disabled');
 assert.equal(g.zoom(),.82);
 assert.equal(G.createSettings(null).setQuality('balanced'),true);
});

test('native WebGL preview is only an optional renderer, with robust unsupported fallback',()=>{
 const absent=G.createPreview({getContext:()=>null});
 assert.equal(absent.supported,false);assert.equal(absent.draw('third'),false);absent.destroy();
 const throws=G.createPreview({getContext(){throw Error('WebGL disabled');}});
 assert.equal(throws.supported,false);assert.equal(throws.draw('first'),false);
 const html=fs.readFileSync(new URL('../city.html',import.meta.url),'utf8');
 const js=fs.readFileSync(new URL('../city.js',import.meta.url),'utf8');
 assert.match(html,/city-graphics\.js\?v=57-avatar-batch/);
 assert.match(html,/city\.js\?v=57-avatar-batch/);
 assert.match(html,/data-panel="graphics"/);
 assert.match(js,/graphicsPanel\(content\)/);
 assert.match(js,/graphics\.pixelRatioCap\(\)/);
 assert.match(js,/setCameraMode\(cameraMode\)/);
 assert.match(js,/graphicsPreview\.destroy\(\)/);
 assert.match(js,/Full first-person and third-person gameplay still requires 3D world geometry/);
 assert.doesNotMatch(js,/cameraZoom=cameraZoom===1\?1\.35:1/,'old toggle should not override the device preference');
});

test('perspective math computes finite, nondegenerate matrices for both camera positions',()=>{
 for(const [eye,target] of [
  [[2.2,2.75,-5.4],[0,1.1,.4]],
  [[0,1.68,0],[0,1.6,5]]
 ]){
  const p=G.perspective(640/360),v=G.lookAt(eye,target),pv=G.multiply(p,v);
  assert.equal(p.length,16);assert.equal(v.length,16);assert.equal(pv.length,16);
  assert.ok([...pv].every(Number.isFinite),'finite perspective and view transform');
  assert.equal(p[11],-1,'real perspective division, not 2D canvas scaling');
  assert.notEqual(pv[0],0);
 }
});

test('3D avatar stage has bounded local movement, finite camera yaw and reset',()=>{
 const p=G.createStage();
 assert.deepEqual(asNative(p.snapshot()),{x:0,z:0,yaw:0,steps:0});
 assert.equal(p.step(.8),true);
 assert.equal(p.snapshot().z,.8);
 assert.equal(p.turn(Math.PI/2),true);
 assert.equal(p.step(.8),true);
 assert.ok(Math.abs(p.snapshot().x-.8)<1e-9,'forward movement rotates with the model');
 assert.equal(p.step(.8),false,'corridor wall blocks movement');
 assert.equal(p.snapshot().steps,2,'rejected steps do not advance walk animation');
 for(const v of [NaN,Infinity,-Infinity,1e50]){assert.equal(p.step(v),false);assert.equal(p.turn(v),false);}
 assert.equal(p.step(1.01),false,'single movement step has a safe bound');
 assert.equal(p.turn(Math.PI+0.01),false,'single camera rotation has a safe bound');
 assert.equal(p.snapshot().steps,2);
 p.reset();
 assert.deepEqual(asNative(p.snapshot()),{x:0,z:0,yaw:0,steps:0});
 assert.equal(p.step(-.7),true,'walking backward stays available');
 p.reset();
 assert.equal(p.step(-1),true);
 assert.equal(p.step(-1),true);
 assert.equal(p.step(-1),true);
 assert.equal(p.step(-1),false,'negative edge of corridor is bounded');
});

test('World V1 authored building footprints become bounded, immutable 3D meshes',()=>{
 const root={};
 vm.runInNewContext(fs.readFileSync(new URL('../city-core.js',import.meta.url),'utf8'),root);
 vm.runInNewContext(fs.readFileSync(new URL('../city-interiors.js',import.meta.url),'utf8'),root);
 const worldBuildings=root.CityInteriors.BUILDINGS,launch=worldBuildings.find(b=>b.roomId==='launch');
 assert.ok(launch&&worldBuildings.length>10,'existing city has named authored buildings');
 const original={x:launch.x,y:launch.y,w:launch.w,h:launch.h};
 const scene=G.createWorldScene(worldBuildings,{x:launch.x+launch.w/2,y:launch.y+launch.h+37});
 assert.equal(scene.name,'Launch House');
 assert.ok(scene.buildings.length>=1&&scene.buildings.length<=16,'only bounded near-world geometry is loaded');
 const primary=scene.buildings.find(b=>b.id==='launch');
 assert.ok(primary,'the selected authored building is included');
 assert.equal(primary.x,0);
 assert.ok(Math.abs(primary.w*120-launch.w)<1e-8,'uses original x footprint width');
 assert.ok(Math.abs(primary.d*120-launch.h)<1e-8,'uses original y footprint depth');
 assert.equal(primary.color,launch.accent,'uses existing authored building theme');
 assert.deepEqual(asNative({x:launch.x,y:launch.y,w:launch.w,h:launch.h}),original,'source geometry is unchanged');
 assert.equal(Object.isFrozen(scene),true);assert.equal(Object.isFrozen(primary),true);
 assert.equal(Object.isFrozen(scene.buildings),true);
 const stage=G.createStage(scene);
 let blocked=false;
 for(let n=0;n<12;n++)if(!stage.step(.8)){blocked=true;break;}
 assert.equal(blocked,true,'nearby actual landmark wall blocks preview-only motion');
 assert.ok(stage.snapshot().z<primary.z-primary.d/2,'avatar stops short of the actual building facade');
 assert.equal(G.createWorldScene([], {x:0,y:0}),null);
 assert.equal(G.createWorldScene(worldBuildings,{x:Infinity,y:0}),null);
 const malformed=[null,{x:0,y:0,w:Infinity,h:100},{x:0,y:0,w:-1,h:10}];
 assert.equal(G.createWorldScene(malformed,{x:0,y:0}),null,'malformed footprints are rejected');
 const capped=G.createWorldScene(Array.from({length:250},(_,i)=>({id:'prop-'+i,x:i*3,y:100,w:80,h:120,hue:'#abcdef'})),{x:0,y:200});
 assert.ok(capped.buildings.length<=16,'massive input cannot create unbounded per-frame draw calls');
});

test('terrain mesh samples authoritative 3 historical and 132 frontier biome regions',()=>{
 const root={};
 for(const file of ['city-core.js','city-biomes.js','city-frontier.js','city-interiors.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),root,{filename:file});
 const C=root.MemeCityCore,B=root.CityBiomes,F=root.CityFrontier,I=root.CityInteriors;
 assert.equal(B.regions.length,3);assert.equal(F.regions.length,132);
 const first=F.regions[0],entry=first.entry;
 const scene=G.createWorldScene(I.BUILDINGS,entry,B,F);
 assert.equal(scene.name,first.name,'remote samples display the actual authored region');
 assert.equal(scene.world.x,entry.x);assert.equal(scene.world.y,entry.y,'frontier samples use real player location');
 assert.equal(scene.terrain.name,first.name);
 assert.equal(scene.terrain.cells.length,64);
 assert.ok(scene.terrain.cells.every(c=>/^#[a-f0-9]{6}$/i.test(c.color)&&Number.isFinite(c.relief)&&Math.abs(c.relief)<=.03));
 assert.ok(new Set(scene.terrain.cells.map(c=>c.color)).size>1,'adjacent frontier tile palettes vary by real region');
 assert.ok(scene.terrain.cells.some(c=>c.material===first.material));
 assert.equal(Object.isFrozen(scene.terrain.cells),true);
 assert.equal(Object.isFrozen(scene.terrain.cells[0]),true);
 for(const index of [0,10,11,44,75,99,131]){
  const biome=F.regions[index],patch=G.createWorldScene(I.BUILDINGS,biome.entry,B,F);
  assert.equal(patch.terrain.name,biome.name,'regional sampler follows the same 132-biome registry');
  assert.equal(patch.terrain.cells.length,64);
 }
 const local=B.regions[0],central=G.createWorldScene(I.BUILDINGS,local.entry,B,F);
 assert.equal(central.terrain.name,local.name,'three original biome regions remain available');
 const urban=G.createTerrainPatch(C.WORLD.spawn.x,C.WORLD.spawn.y,B,F);
 assert.equal(urban.cells.length,64);
 assert.equal(urban.name,'Center City pavement');
 assert.equal(G.createTerrainPatch(0,0,null,null),null);
 assert.equal(G.createWorldScene([],entry,B,F),null,'no invented building records');
});

test('jointed avatar pose is bounded, stable and uses opposing limbs',()=>{
 const idle=G.avatarPose(0),walk=G.avatarPose(1),stepTwo=G.avatarPose(2);
 assert.equal(idle.bob,0);assert.equal(idle.leftLeg,0);assert.ok(idle.rightLeg===0,'signed zero is an equally valid resting joint angle');
 assert.equal(walk.leftLeg,-walk.rightLeg,'legs swing in opposing directions');
 assert.equal(walk.leftArm,-walk.leftLeg*.7,'opposite-arm rhythm');
 assert.ok(walk.bob>0&&walk.bob<.03);
 assert.ok(walk.leftKnee>=0&&walk.rightKnee>=0);
 assert.notEqual(walk.leftLeg,stepTwo.leftLeg);
 assert.deepEqual(asNative(G.avatarPose(NaN)),asNative(idle),'invalid phases do not create NaN meshes');
 assert.deepEqual(asNative(G.avatarPose(Infinity)),asNative(idle));
 assert.ok(Object.values(walk).every(Number.isFinite));
 assert.equal(Object.isFrozen(walk),true);
 const render=fs.readFileSync(new URL('../city-graphics.js',import.meta.url),'utf8');
 assert.match(render,/const limbSegment=\(/);
 assert.match(render,/limbSegment\('forearm-'/);
 assert.match(render,/limbSegment\('shin-'/);
 assert.match(render,/model\(world,part\.size,yaw,-part\.pitch\)/);
});

test('third-person camera retracts before solid buildings, with stable scene-independent fallback',()=>{
 const scene={buildings:[{id:'wall',x:0,z:-2,w:3,d:1,height:3}]};
 const target=[0,1.15,0],desired=[0,2.6,-6];
 const avoided=G.cameraAvoid(scene,desired,target);
 assert.equal(avoided.obstructed,true,'camera segment intersects real 3D obstruction');
 assert.ok(avoided.eye[2]>-1.5&&avoided.eye[2]<0,'camera is retracted before wall and stays behind player');
 assert.ok(avoided.eye[1]>target[1]&&avoided.eye[1]<desired[1],'elevation follows retracted line of sight');
 assert.deepEqual(desired,[0,2.6,-6],'no mutation of desired eye coordinates');
 const noObstacle=G.cameraAvoid({buildings:[]},desired,target);
 assert.equal(noObstacle.obstructed,false);assert.deepEqual(asNative(noObstacle.eye),desired);
 const sideways=G.cameraAvoid(scene,[5,2.6,-6],[5,1.15,0]);
 assert.equal(sideways.obstructed,false,'a parallel line outside the footprint stays clear');
 const lowRoof=G.cameraAvoid({buildings:[{x:0,z:-2,w:2,d:1,height:.6}]},desired,target);
 assert.equal(lowRoof.obstructed,false,'low geometry below eye ray does not obstruct camera');
 assert.equal(G.cameraAvoid(scene,[NaN,2,-4],target),null,'invalid camera positions fail safely');
 assert.equal(G.cameraAvoid(scene,desired,[Infinity,0,0]),null);
 assert.equal(Object.isFrozen(avoided),true);
});

test('substep walking rejects narrow structures rather than tunneling through them',()=>{
 const thinWall={buildings:[{x:0,z:.4,w:1,d:.06,height:2}]};
 const stage=G.createStage(thinWall);
 assert.equal(stage.step(.8),false,'a thin structure must block even when the endpoint is clear');
 assert.deepEqual(asNative(stage.snapshot()),{x:0,z:0,yaw:0,steps:0},'rejected steps are atomic');
 assert.equal(stage.turn(Math.PI),true);
 assert.equal(stage.step(.8),true,'walking the opposite direction stays possible');
 const fallback=G.createPreview({getContext:()=>null});
 assert.equal(fallback.step(.8),false,'unsupported GPU never accidentally writes state');
 assert.equal(fallback.turn(.4),false);
});

test('perspective architecture keeps authored facade detail and uses no downloaded models',()=>{
 const mod=fs.readFileSync(new URL('../city-graphics.js',import.meta.url),'utf8');
 assert.match(mod,/facade=b\.z-b\.d\/2-\.035/);
 assert.match(mod,/cameraAvoid\(sample,desiredEye,target\)/);
 assert.match(mod,/const count=Math\.max\(1,Math\.ceil\(Math\.abs\(distance\)\/\.1\)\)/);
 assert.doesNotMatch(mod,/fetch\(|import\(|<img|localStorage|roomClient\.action/);
});

test('3D movement controls remain exclusive to the optional graphics preview',()=>{
 const js=fs.readFileSync(new URL('../city.js',import.meta.url),'utf8');
 const mod=fs.readFileSync(new URL('../city-graphics.js',import.meta.url),'utf8');
 assert.match(js,/Move and rotate the preview-only 3D avatar/);
 assert.match(js,/CityGraphics\.createWorldScene\(I\.BUILDINGS,\{x:me\.x,y:me\.y\},T,F\)/);
 assert.match(js,/Terrain preview:/);
 assert.match(js,/World V1 buildings:/);
 for(const name of ['Turn left','Walk forward','Walk backward','Turn right','Reset preview'])assert.ok(js.includes(name),name);
 assert.match(js,/graphicsPreview\.turn\(amount\)/);
 assert.match(js,/graphicsPreview\.step\(amount\)/);
 assert.match(mod,/const stage=createStage\(sample\)/,'preview stage receives the authored scene for local collision');
 assert.match(mod,/createAvatarMesh\(stage\.snapshot\(\),mode,nextColor\)/,'both camera views must use the same world-relative reusable avatar rig');
 assert.doesNotMatch(mod,/localStorage|sessionStorage|roomClient\.action|engine\.action/,'preview walking never modifies real state');
});

test('static world mesh bakes terrain and authored architecture into one capped RGB buffer',()=>{
 const scene={terrain:{cells:Array.from({length:64},(_,i)=>({x:i%8-4,z:Math.floor(i/8)-4,w:1,d:1,relief:0,color:i%2?'#33564b':'#98705a'}))},
  buildings:[{id:'sample',x:0,z:6,w:2,d:2,height:2,color:'#478890'}]};
 const mesh=G.createStaticMesh(scene);
 assert.ok(mesh.boxes>=70,'ground, sixty-four biome tiles, road and facades are baked');
 assert.ok(mesh.boxes<=240,'hard ceiling on submitted static boxes');
 assert.equal(mesh.vertices,mesh.boxes*36,'each cube is exactly thirty-six triangle vertices');
 assert.equal(mesh.bytes,mesh.vertices*6*4,'position RGB interleaving uses six floats per vertex');
 assert.equal(mesh.data.length,mesh.vertices*6);
 assert.ok(mesh.data.every(Number.isFinite),'no malformed GPU coordinates or tints');
 for(let i=3;i<mesh.data.length;i+=6)
  assert.ok(mesh.data[i]>=0&&mesh.data[i]<=1&&mesh.data[i+1]>=0&&mesh.data[i+1]<=1&&
   mesh.data[i+2]>=0&&mesh.data[i+2]<=1,'vertex colors are valid normalized RGB');
 assert.deepEqual(Array.from(G.createStaticMesh(scene).data),Array.from(mesh.data),'deterministic geometry');
 assert.equal(Object.isFrozen(mesh),true);
 const overLimit=G.createStaticMesh({terrain:{cells:Array.from({length:500},()=>({x:0,z:0,w:3,d:3,relief:0,color:'#888888'}))},
  buildings:Array.from({length:500},(_,i)=>({id:'building-'+i,x:i,z:2,w:5,d:2,height:2,color:'#336699'}))});
 assert.ok(overLimit.boxes<=240,'untrusted scene input cannot allocate unbounded WebGL geometry');
 const fallback=G.createStaticMesh(null);
 assert.ok(fallback.boxes>=10,'background geometry survives without authored biome data');
});

test('batch renderer uses one static draw per redraw and frees its GPU buffer',()=>{
 const source=fs.readFileSync(new URL('../city-graphics.js',import.meta.url),'utf8');
 assert.match(source,/createStaticMesh\(sample\)/);
 assert.match(source,/gl\.drawArrays\(gl\.TRIANGLES,0,staticMesh\.vertices\);staticDrawCalls\+\+/);
 assert.match(source,/gl\.vertexAttribPointer\(colorAttr,3,gl\.FLOAT,false,24,12\)/);
 assert.match(source,/gl\.deleteBuffer\(staticBuffer\)/);
 assert.match(source,/gl\.isContextLost\?\.\(\)/);
 assert.doesNotMatch(source,/fetch\(|import\(|requestAnimationFrame|roomClient\.action/);
 const unsupported=G.createPreview({getContext:()=>null});
 assert.equal(unsupported.stats(),null,'no GPU statistics promised when WebGL is missing');
});

test('first-person and third-person avatars use reusable immutable joint hierarchies',()=>{
 const idle=G.createAvatarRig(0,'third','#bdff56');
 const walk=G.createAvatarRig(2,'third','#bdff56');
 const first=G.createAvatarRig(2,'first','#bdff56');
 assert.ok(idle.length>=24&&idle.length<=56,'rig contains bounded body and joint parts');
 assert.ok(first.length>=3&&first.length<idle.length,'first person uses hands and tool only');
 assert.deepEqual(idle.map(p=>p.name),walk.map(p=>p.name),'part IDs remain stable across poses');
 assert.ok(idle.some(p=>p.name==='skull')&&idle.some(p=>p.name==='eye-1')&&idle.some(p=>p.name==='boot--1'));
 const names=new Set(idle.map(p=>p.name));
 assert.equal(names.size,idle.length,'joint names must be unique for future animation/skin reuse');
 for(const part of idle){
  assert.ok(Object.isFrozen(part)&&Object.isFrozen(part.pos)&&Object.isFrozen(part.size));
  assert.ok([...part.pos,...part.size,...part.color,part.pitch].every(Number.isFinite));
 }
 const oldLeg=idle.find(p=>p.name==='thigh--1'),newLeg=walk.find(p=>p.name==='thigh--1');
 assert.notDeepEqual(asNative(oldLeg.pos),asNative(newLeg.pos),'phase advances joint geometry');
 assert.equal(G.createAvatarRig(0,'unknown').length,0,'unrecognized view produces no mesh');
 const snapshot={x:0,z:0,yaw:0,steps:0},third=G.createAvatarMesh(snapshot,'third','#bdff56');
 const rotated=G.createAvatarMesh({...snapshot,x:3,z:5,yaw:1.2,steps:2},'third','#bdff56');
 assert.ok(third&&third.parts===idle.length);
 assert.equal(third.vertices,third.parts*36);
 assert.equal(third.bytes,third.vertices*24);
 assert.equal(third.data.length,third.vertices*6);
 assert.ok(third.data.every(Number.isFinite));
 assert.ok(rotated.data.every(Number.isFinite));
 assert.notDeepEqual(Array.from(third.data.slice(0,3)),Array.from(rotated.data.slice(0,3)),
  'world-space avatar batch obeys yaw, position and walk phase');
 assert.deepEqual(Array.from(G.createAvatarMesh(snapshot,'third','#bdff56').data),Array.from(third.data),
  'same pose yields byte-identical mesh');
 assert.equal(G.createAvatarMesh({x:Infinity,z:0,yaw:0,steps:0}),null,'non-finite player samples fail closed');
 assert.equal(G.createAvatarMesh(null),null);
});

test('animated rig is uploaded once and drawn once per 3D preview repaint',()=>{
 const source=fs.readFileSync(new URL('../city-graphics.js',import.meta.url),'utf8');
 assert.match(source,/gl\.bufferSubData\(gl\.ARRAY_BUFFER,0,avatarMesh\.data\);avatarUploads\+\+/);
 assert.match(source,/gl\.drawArrays\(gl\.TRIANGLES,0,avatarMesh\.vertices\);dynamicDrawCalls\+\+/);
 assert.match(source,/createAvatarMesh\(stage\.snapshot\(\),mode,nextColor\)/);
 assert.match(source,/gl\.bufferData\(gl\.ARRAY_BUFFER,56\*36\*6\*4,gl\.DYNAMIC_DRAW\)/);
 assert.doesNotMatch(source,/requestAnimationFrame\(|roomClient\.action/);
});

test('graphics module remains isolated from original save and authoritative game state',()=>{
 const s=fs.readFileSync(new URL('../city-graphics.js',import.meta.url),'utf8');
 assert.doesNotMatch(s,/offensive-meme-city-v1-center/);
 assert.doesNotMatch(s,/(walletKey|signMessage|holderTier|credits=|roomClient\.action)/);
 const html=fs.readFileSync(new URL('../city.html',import.meta.url),'utf8');
 assert.ok(html.indexOf('city-graphics.js?v=57-avatar-batch')<html.indexOf('city.js?v=57-avatar-batch'));
 const pages=fs.readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
 const server=fs.readFileSync(new URL('../server/city-server.mjs',import.meta.url),'utf8');
 assert.match(pages,/city-graphics\.js/);assert.match(server,/'city-graphics\.js'/);
});
