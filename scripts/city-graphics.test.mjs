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
 assert.match(html,/city-graphics\.js\?v=53-world-scene/);
 assert.match(html,/city\.js\?v=53-world-scene/);
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

test('3D movement controls remain exclusive to the optional graphics preview',()=>{
 const js=fs.readFileSync(new URL('../city.js',import.meta.url),'utf8');
 const mod=fs.readFileSync(new URL('../city-graphics.js',import.meta.url),'utf8');
 assert.match(js,/Move and rotate the preview-only 3D avatar/);
 assert.match(js,/CityGraphics\.createWorldScene\(I\.BUILDINGS,\{x:me\.x,y:me\.y\}\)/);
 assert.match(js,/World V1 buildings:/);
 for(const name of ['Turn left','Walk forward','Walk backward','Turn right','Reset preview'])assert.ok(js.includes(name),name);
 assert.match(js,/graphicsPreview\.turn\(amount\)/);
 assert.match(js,/graphicsPreview\.step\(amount\)/);
 assert.match(mod,/const stage=createStage\(sample\)/,'preview stage receives the authored scene for local collision');
 assert.match(mod,/actorBox\(/,'shared procedural avatar body and skull rig must rotate in perspective');
 assert.doesNotMatch(mod,/localStorage|sessionStorage|roomClient\.action|engine\.action/,'preview walking never modifies real state');
});

test('graphics module remains isolated from original save and authoritative game state',()=>{
 const s=fs.readFileSync(new URL('../city-graphics.js',import.meta.url),'utf8');
 assert.doesNotMatch(s,/offensive-meme-city-v1-center/);
 assert.doesNotMatch(s,/(walletKey|signMessage|holderTier|credits=|roomClient\.action)/);
 const html=fs.readFileSync(new URL('../city.html',import.meta.url),'utf8');
 assert.ok(html.indexOf('city-graphics.js?v=53-world-scene')<html.indexOf('city.js?v=53-world-scene'));
 const pages=fs.readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
 const server=fs.readFileSync(new URL('../server/city-server.mjs',import.meta.url),'utf8');
 assert.match(pages,/city-graphics\.js/);assert.match(server,/'city-graphics\.js'/);
});
