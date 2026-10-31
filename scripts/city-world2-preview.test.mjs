import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function load(){
 const elements=new Map(),frames=[];
 const context={console,performance:{now:()=>1000},devicePixelRatio:1,Image:class{constructor(){this.complete=false;}},requestAnimationFrame:cb=>frames.push(cb),addEventListener(){}};
 context.window=context;
 const canvasContext=new Proxy({}, {get:(target,key)=>key in target?target[key]:()=>{},set:(target,key,value)=>(target[key]=value,true)});
 function element(id){
  if(elements.has(id))return elements.get(id);
  const obj={id,tagName:id==='nav-select'?'SELECT':'DIV',value:'',textContent:'',width:280,height:280,style:{},children:[],dataset:{},
   append(child){this.children.push(child);},addEventListener(type,fn){this['on'+type]=fn;},
   getContext(){return canvasContext;},getBoundingClientRect(){return {width:900,height:600,left:0,top:0};},
   setPointerCapture(){}};
  elements.set(id,obj);return obj;
 }
 context.document={getElementById:element,querySelectorAll(){return ['up','down','left','right'].map(k=>Object.assign(element('key-'+k),{dataset:{key:k}}));},createElement:()=>({}),addEventListener(){}};
 context.localStorage={getItem:()=>null,setItem(){throw Error('Unexpected write to live storage');}};
 for(const file of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-topology.js','city-nav.js','city-world2.js','city-world2-registry.js','city-migration.js','city-world2-territory.js','city-world2-simulation.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),context,{filename:file});
 context.CityVisuals={person(){}};
 vm.runInNewContext(fs.readFileSync(new URL('../city-world2-preview.js',import.meta.url),'utf8'),context,{filename:'city-world2-preview.js'});
 return {context,elements,frames,element};
}
test('isolated world2 browser preview mounts real POI controls with no automatic live-save writes',()=>{
 const {element,frames}=load();
 assert.ok(element('nav-select').children.length>=47);
 assert.ok(element('status').textContent.includes('nonpersistent preview'));
 assert.equal(typeof element('route').onclick,'function');
 assert.equal(frames.length,1);
 assert.doesNotThrow(()=>frames[0](1016),'mock canvas initial frame must render');
});
test('preview buttons can plan destination, place an in-memory wall, clear routes and reset',()=>{
 const {element}=load();
 element('nav-select').value='door:market';
 element('route').onclick();
 assert.match(element('status').textContent,/Safe walking path/);
 element('clear-route').onclick();
 assert.match(element('status').textContent,/cleared/);
 element('reset').onclick();
 assert.match(element('status').textContent,/unchanged/);
 element('load-preview').onclick();
 assert.match(element('status').textContent,/unavailable/,'no real save must result in clear failure');
});

test('world2 preview offers working combat, defense, checkpoint and HUD controls',()=>{
 const {element,frames}=load();
 for(const id of ['fire','reload','defend','claim-checkpoint'])assert.equal(typeof element(id).onclick,'function',id);
 element('defend').onclick();assert.match(element('status').textContent,/Fortress defense wave/);
 element('fire').onclick();assert.match(element('status').textContent,/Shot missed|Target hit|Enemy defeated/);
 element('reload').onclick();assert.match(element('status').textContent,/reloaded/);
 assert.doesNotThrow(()=>frames[0](1050));assert.match(element('combat-hud').textContent,/HP \d+\/100/);
 element('reset').onclick();assert.match(element('status').textContent,/unchanged/);
});

test('world2 browser preview has real faction, route and capture controls',()=>{
 const {element,frames}=load();
 assert.equal(element('control-select').children.length,6);
 assert.equal(element('faction-select').children.length,6);
 assert.equal(typeof element('capture-control').onclick,'function');
 element('faction-select').value='congress';element('join-faction').onclick();
 assert.match(element('status').textContent,/Preview faction selected/);
 element('route-control').onclick();assert.match(element('status').textContent,/Safe walking path/);
 element('capture-control').onclick();assert.match(element('status').textContent,/155 units/);
 assert.doesNotThrow(()=>frames[0](1050));
 assert.match(element('combat-hud').textContent,/Faction congress/);
});
