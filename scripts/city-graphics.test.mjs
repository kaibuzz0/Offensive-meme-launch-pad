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
 assert.match(html,/city-graphics\.js\?v=52-graphics-integrated/);
 assert.match(html,/city\.js\?v=52-graphics-integrated/);
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

test('graphics module remains isolated from original save and authoritative game state',()=>{
 const s=fs.readFileSync(new URL('../city-graphics.js',import.meta.url),'utf8');
 assert.doesNotMatch(s,/offensive-meme-city-v1-center/);
 assert.doesNotMatch(s,/(walletKey|signMessage|holderTier|credits=|roomClient\.action)/);
 const html=fs.readFileSync(new URL('../city.html',import.meta.url),'utf8');
 assert.ok(html.indexOf('city-graphics.js?v=52-graphics-integrated')<html.indexOf('city.js?v=52-graphics-integrated'));
 const pages=fs.readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
 const server=fs.readFileSync(new URL('../server/city-server.mjs',import.meta.url),'utf8');
 assert.match(pages,/city-graphics\.js/);assert.match(server,/'city-graphics\.js'/);
});
