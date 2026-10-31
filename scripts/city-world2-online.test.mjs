import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=x=>fs.readFileSync(new URL('../'+x,import.meta.url),'utf8');
const state=(name='Alice')=>({worldVersion:2,preview:true,revision:2,
 self:{id:'self',name,avatar:'offensive',x:5040,y:4100,hp:100,credits:180,xp:0,ammo:24,inventory:[{uid:'gear-1',item:'jacket'}],equipped:{},
  rising:{medkits:0},clan:null,courier:{status:'idle'},room:null},
 players:[{id:'self',name,avatar:'offensive',x:5040,y:4100,hp:100,clan:null,room:null},
  {id:'peer',name:'Bob',x:5050,y:4120,hp:100,clan:null,room:null}],
 guards:[],territory:[],roomInfo:{code:'public-1',private:false,capacity:8,players:2}});
function mock(){
 const elements=new Map(),frames=[],intervals=[],actions=[],inputs=[];let current=state(),connected=false;
 const blankCanvas=new Proxy({}, {get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 function el(id){
  if(elements.has(id))return elements.get(id);
  const o={id,value:'',textContent:'',tagName:id==='room-code'?'INPUT':'DIV',disabled:false,
   width:210,height:210,children:[],dataset:{},addEventListener:(k,f)=>{o['on'+k]=f;},
   append:(v)=>o.children.push(v),getContext:()=>blankCanvas,
   getBoundingClientRect:()=>({width:900,height:600,left:0,top:0}),
   setPointerCapture(){},click(){return this.onclick?.();}};
  elements.set(id,o);return o;
 }
 const ctx={console,performance:{now:()=>1000},devicePixelRatio:1,requestAnimationFrame:f=>frames.push(f),
  setInterval:(fn,ms)=>intervals.push({fn,ms}),addEventListener(){}};
 ctx.window=ctx;
 ctx.document={getElementById:el,createElement:()=>({}),querySelectorAll:()=>['up','down','left','right'].map(k=>Object.assign(el('move-'+k),{dataset:{move:k}})),
  addEventListener(){}};
 Object.defineProperty(ctx,'localStorage',{get(){throw Error('World2 online client must never access localStorage.')}});
 for(const f of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-topology.js','city-nav.js','city-world2.js','city-world2-registry.js'])
  vm.runInNewContext(read(f),ctx,{filename:f});
 ctx.CityVisuals={person:()=>{}};
 ctx.CityWorld2OnlineTransport={create:()=>({
  isJoined:()=>connected,join:async({name})=>{connected=true;current=state(name);return current;},
  input:async a=>{inputs.push(a);return {ok:true};},state:async()=>current,
  action:async(type,fields)=>{actions.push({type,fields});return {message:'Server accepted '+type,state:current};},
  leave:async()=>{connected=false;return {ok:true};},disconnect:()=>{connected=false;},
 })};
 vm.runInNewContext(read('city-world2-online.js'),ctx,{filename:'city-world2-online.js'});
 return {el,frames,intervals,actions,inputs,ctx};
}
test('world2 authoritative browser page initializes offline without private storage or network calls',()=>{
 const h=mock();assert.equal(h.frames.length,1);
 assert.equal(h.intervals.length,2);
 assert.ok(h.el('destination').children.length>=47);
 assert.equal(h.el('server-state').textContent,'Disconnected');
 assert.doesNotThrow(()=>h.frames[0]());
});
test('guest joining updates server-origin room state; movement/fire packets only carry inputs',async()=>{
 const h=mock();h.el('name').value='QA Engineer';h.el('avatar').value='offensive';
 await h.el('join').click();
 assert.match(h.el('room-info').textContent,/public-1/);
 assert.match(h.el('hud').textContent,/credits 180/);
 assert.equal(h.el('server-state').textContent,'Connected to loopback QA server');
 await h.intervals.find(x=>x.ms===100).fn();
 assert.deepEqual(h.inputs.map(x=>Object.keys(x).sort().join(',')),['aimX,aimY,fire,x,y']);
 assert.equal(h.inputs[0].x,0);
 await h.intervals.find(x=>x.ms===280).fn();
 assert.doesNotThrow(()=>h.frames[0](),'peer snapshot should render');
 await h.el('leave').click();assert.equal(h.el('server-state').textContent,'Disconnected');
});
test('every gameplay button submits type-scoped authoritative actions, not client awards',async()=>{
 const h=mock();h.el('avatar').value='offensive';await h.el('join').click();
 h.el('faction').value='exit';h.el('zone').value='control:exit';h.el('gear').value='jacket';h.el('owned').value='gear-1';
 for(const [id,type] of [['join-faction','joinFaction'],['capture','startCapture'],['courier','startCourier'],['deliver','deliverCourier'],
  ['buy','buyGear'],['equip','equipGear'],['sell','sellGear'],['medkit','buyMedkit'],['heal','useMedkit'],['reload','reload']]){
  await h.el(id).click();
  assert.equal(h.actions.at(-1).type,type,id);
 }
 assert.equal(h.actions.find(a=>a.type==='buyGear').fields.item,'jacket');
 assert.equal(h.actions.find(a=>a.type==='equipGear').fields.uid,'gear-1');
 assert.equal(h.actions.find(a=>a.type==='joinFaction').fields.clan,'exit');
 assert.equal(h.actions.find(a=>a.type==='startCapture').fields.zone,'control:exit');
 assert.equal(h.actions.some(a=>a.fields?.credits!==undefined||a.fields?.x!==undefined),false,'UI cannot supply balances or teleport coordinates');
});
