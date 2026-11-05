import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const ctx={};
vm.runInNewContext(readFileSync(new URL('../city-live-3d.js',import.meta.url),'utf8'),ctx);
const Live=ctx.CityLive3D;

function fixture({webgl=true,throwInit=false,failDraw=false,throwDestroy=false}={}){
 const calls={scenes:[],creations:[],draws:[],observed:[],crowds:[],destroyed:0};
 let player={id:'mine',x:5600,y:5940,room:null},aim={x:1,y:0},visible=true;
 let world={players:[{id:'mine',x:5600,y:5940,room:null},{id:'friend',x:5620,y:5960,room:null,facing:{x:1,y:0}}],
  civilians:[{id:'civil1',x:5570,y:5960,phase:2}],arcade:{bots:[],guards:[]},monk:null};
 const container={hidden:true,dataset:{}},status={textContent:''},canvas={};
 const graphics={
  createWorldScene(_buildings,where){
   calls.scenes.push({...where});
   return {world:{...where},buildings:[],terrain:{cells:[]}};
  },
  createPreview(_canvas,color,scene){
   if(throwInit)throw Error('Simulated WebGL initialization failure');
   calls.creations.push({color,scene});
   let current=null;
   return {
    supported:webgl,
    observePlayer(p,a,steps){
     const snapshot=graphics.samplePlayerCamera(scene,p,a,steps);
     if(!snapshot)return false;
     current=snapshot;calls.observed.push(snapshot);return true;
    },
    observed(){return current;},
    setActors(actors){calls.crowds.push(actors);return true;},
    draw(mode,tint){calls.draws.push({mode,tint,position:current});return !failDraw;},
    destroy(){calls.destroyed++;if(throwDestroy)throw Error('GPU context lost during teardown');},
    stats(){return {staticDrawCalls:1,dynamicDrawCalls:1};}
   };
  },
  samplePlayerCamera(scene,p,a,steps=0){
   if(!p||p.room||Math.abs(p.x-scene.world.x)>1440||Math.abs(p.y-scene.world.y)>1440)return null;
   return {x:(p.x-scene.world.x)/120,z:(scene.world.y-p.y)/120,yaw:Math.atan2(a.x,-a.y),
    steps,world:{x:p.x,y:p.y}};
  }
 };
 const view=Live.create({graphics,canvas,container,status,buildings:[{id:'sample'}],
  biomes:{regionAt:(x)=>x>=7000?{id:'local-east'}:{id:'local-west'}},frontier:null,
  getPlayer:()=>player,getAim:()=>aim,getWorldState:()=>world,getColor:()=> '#bdff56',isVisible:()=>visible});
 return {view,calls,container,status,setPlayer:p=>{player=p;},getPlayer:()=>player,
  setAim:a=>{aim=a;},setVisible:v=>{visible=v;},setWorld:w=>{world=w;}};
}

test('live view initializes only on demand and mirrors authoritative moving 2D position',()=>{
 const f=fixture(),v=f.view;
 assert.equal(v.stats().enabled,false);
 assert.equal(f.container.hidden,true);
 assert.equal(f.calls.creations.length,0,'no WebGL context until explicitly enabled');
 assert.equal(v.start(),true);
 assert.equal(f.calls.creations.length,1);
 assert.equal(f.container.hidden,false);
 assert.equal(v.tick(0),true);
 assert.equal(f.calls.draws.length,1);
 assert.equal(f.calls.draws[0].position.world.x,5600);
 assert.equal(v.tick(20),false,'render is throttled while original Canvas game keeps running');
 f.setPlayer({x:5632,y:5912,room:null});
 assert.equal(v.tick(90),true);
 assert.equal(Number(f.container.dataset.worldX),5632);
 assert.equal(Number(f.container.dataset.worldY),5912);
 assert.equal(f.calls.draws.at(-1).position.world.x,5632);
 assert.ok(f.calls.draws.at(-1).position.steps>0,'real movement drives gait phase');
 assert.equal(f.calls.creations.length,1,'ordinary movement reuses the static city mesh');
 assert.match(f.status.textContent,/LIVE 3D \/ third-person \/ X 5632/);
 assert.deepEqual(f.getPlayer(),{x:5632,y:5912,room:null},
  'camera observation never edits original game player');
 assert.equal(v.stop(),true);assert.equal(f.container.hidden,true);
 assert.equal(f.calls.destroyed,1);
 assert.equal(v.tick(200),false);
});

test('3D camera mode changes do not create player inputs or second game simulation',()=>{
 const f=fixture(),v=f.view;
 assert.equal(v.start(),true);v.tick(0);
 assert.equal(v.setMode('first'),true);
 assert.equal(v.tick(5),true,'perspective change bypasses throttle once');
 assert.equal(f.calls.draws.at(-1).mode,'first');
 assert.equal(f.container.dataset.mode,'first');
 assert.equal(v.setMode('experimental'),false);
 assert.equal(v.stats().mode,'first');
 assert.equal(v.setMode('third'),true);assert.equal(v.tick(10),true);
 assert.equal(f.calls.draws.at(-1).mode,'third');
 v.stop();
 assert.equal(f.calls.destroyed,1);
});

test('scene streams new real player locality after walking or crossing biome boundary',()=>{
 const f=fixture(),v=f.view;
 assert.equal(v.start(),true);v.tick(0);
 f.setPlayer({x:5900,y:5940,room:null});v.tick(100);
 assert.equal(f.calls.scenes.length,1,'short walks keep current geometry');
 f.setPlayer({x:6150,y:5940,room:null});v.tick(200);
 assert.equal(f.calls.scenes.length,2,'walking over 540 world units rebases terrain');
 assert.equal(f.calls.destroyed,1,'old GPU buffer released on rebase');
 assert.equal(Number(f.container.dataset.worldX),6150);
 f.setPlayer({x:7050,y:5940,room:null});v.tick(300);
 assert.equal(f.calls.scenes.length,3,'moving into a different named biome updates scene');
 assert.equal(f.calls.draws.at(-1).position.world.x,7050);
 assert.ok(v.stats().rebases>=3);
 v.stop();assert.equal(f.calls.destroyed,3);
});

test('inactive panels and hidden pages suspend the optional GPU view without stopping 2D controls',()=>{
 const f=fixture(),v=f.view;
 f.setVisible(false);
 assert.equal(v.start(),false,'no allocation before game starts or with open menu');
 assert.equal(f.calls.creations.length,0);
 f.setVisible(true);v.start();v.tick(0);
 f.setVisible(false);
 assert.equal(v.tick(500),false);assert.equal(f.calls.draws.length,1);
 f.setVisible(true);
 assert.equal(v.tick(600),true,'the live viewport resumes when menu closes');
 f.setPlayer({x:5630,y:5940,room:{id:'arcade'}});
 assert.equal(v.tick(700),false,'indoors must not claim real street 3D physics');
 assert.match(f.status.textContent,/outside streets only/);
 assert.equal(f.calls.draws.length,2);
 v.stop();
});

test('real World V1 NPCs render through bounded, immutable, sorted read-only snapshots',()=>{
 const player={id:'me',x:5600,y:5940},scene={world:{x:5600,y:5940}};
 const original={
  players:[{id:'me',x:5600,y:5940},{id:'peer',x:5630,y:5940,facing:{x:1,y:0}}],
  civilians:[{id:'civil',x:5580,y:5940,phase:2},{id:'far',x:8000,y:8000}],
  arcade:{bots:[{id:'z',kind:'zombie',x:5620,y:5930,faceX:0,faceY:-1,hp:80},
   {id:'dead',kind:'zombie',x:5620,y:5920,hp:0}],
   guards:[{id:'guard',x:5625,y:5945,hp:50}]},
  monk:{id:'monk',x:5632,y:5930,hp:95}
 };
 const before=JSON.stringify(original);
 const actors=Live.selectNearbyActors(scene,player,original);
 assert.ok(actors.length===5,'only actual nearby, living, non-self entities are selected');
 assert.equal(actors[0].id,'civilian:civil','nearest characters are drawn first');
 assert.ok(actors.some(a=>a.id==='bot:z'&&a.color==='#a7d583'));
 assert.ok(actors.some(a=>a.id==='player:peer'&&Math.abs(a.yaw-Math.PI/2)<1e-8));
 assert.ok(actors.some(a=>a.id==='guard:guard'));
 assert.ok(actors.some(a=>a.id==='monk:monk'));
 assert.ok(!actors.some(a=>a.id==='player:me'||a.id==='bot:dead'));
 assert.equal(Object.isFrozen(actors),true);
 assert.equal(Object.isFrozen(actors[0]),true);
 assert.equal(JSON.stringify(original),before,'observing a crowd cannot mutate authoritative NPC state');
 const limited=Live.selectNearbyActors(scene,player,original,2);
 assert.equal(limited.length,2,'mobile draw cap is respected');
 assert.equal(Live.selectNearbyActors(scene,player,null).length,0);
 assert.equal(Live.selectNearbyActors(scene,{x:NaN,y:5940},original).length,0);
});

test('moving real game entities update the live crowd without allocating a new simulation',()=>{
 const f=fixture(),v=f.view;
 v.start();v.tick(0);
 assert.equal(f.calls.crowds.length,1);
 assert.equal(f.calls.crowds[0].length,2,'self player excluded but nearby peer and civilian included');
 const other={players:[{id:'mine',x:5600,y:5940}],civilians:[{id:'moving',x:5650,y:5940,phase:3}],arcade:{bots:[],guards:[]}};
 const original=JSON.stringify(other);
 f.setWorld(other);v.tick(100);
 assert.equal(f.calls.crowds[1][0].id,'civilian:moving');
 assert.ok(Math.abs(f.calls.crowds[1][0].x-50/120)<1e-8);
 assert.equal(f.calls.creations.length,1,'nearby changes reuse one WebGL context');
 assert.equal(JSON.stringify(other),original,'live crowd does not modify NPC positions');
 v.stop();
});

test('crowd renderer batches multiple avatars into a single bounded dynamic mesh',()=>{
 const glContext={};
 vm.runInNewContext(readFileSync(new URL('../city-graphics.js',import.meta.url),'utf8'),glContext);
 const G=glContext.CityGraphics;
 const actors=[
  {id:'p',x:0,z:0,yaw:0,steps:0,color:'#88bbff'},
  {id:'z',x:1,z:-2,yaw:Math.PI,steps:2,color:'#aacc88'}
 ];
 const batch=G.createCrowdMesh(actors);
 assert.equal(batch.actors,2);
 assert.ok(batch.vertices>1000&&batch.vertices<56*36*2);
 assert.equal(batch.bytes,batch.vertices*24);
 assert.ok(batch.data.every(Number.isFinite));
 assert.deepEqual(Array.from(G.createCrowdMesh(actors).data),Array.from(batch.data),'crowd mesh is deterministic');
 assert.ok(Array.from(batch.data).some(x=>x<0),'world coordinates are signed');
 assert.equal(G.createCrowdMesh([{id:'bad',x:Infinity,z:0,yaw:0,steps:0}]).actors,0);
 assert.equal(G.createCrowdMesh([...actors,...actors]).actors,2,'duplicate characters cannot be drawn twice');
 const full=G.createCrowdMesh(Array.from({length:30},(_,i)=>({id:'a'+i,x:i%10,z:0,yaw:0,steps:0})));
 assert.equal(full.actors,6,'crowd draw has a hard six-character limit');
 assert.ok(full.bytes<=6*56*36*24);
});

test('WebGL unsupported and invalid 3D input fail closed without touching player or saves',()=>{
 const f=fixture({webgl:false});
 assert.equal(f.view.start(),false);assert.equal(f.view.stats().enabled,false);
 assert.equal(f.container.hidden,true);assert.match(f.view.stats().reason,/unavailable on this device/);
 assert.equal(f.calls.creations.length,1);
 assert.equal(f.calls.destroyed,1);
 const p=fixture();
 p.setPlayer({x:NaN,y:500,room:null});
 assert.equal(p.view.start(),false);assert.equal(p.calls.creations.length,0);
 assert.equal(p.view.stats().enabled,false);
 const source=readFileSync(new URL('../city-live-3d.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/engine\.input|engine\.trigger|roomClient\.action|localStorage|sessionStorage|fetch\(|\.save\(/,
  'live 3D reads the existing game instead of introducing another action/save authority');
});

test('GPU failure during initialization, drawing or teardown cannot affect World V1 state',()=>{
 const init=fixture({throwInit:true});
 const original={...init.getPlayer()};
 assert.equal(init.view.start(),false);
 assert.equal(init.view.stats().enabled,false);
 assert.match(init.view.stats().reason,/graphics initialization failed/);
 assert.equal(init.container.hidden,true);
 assert.deepEqual(init.getPlayer(),original);
 const fail=fixture({failDraw:true,throwDestroy:true});
 assert.equal(fail.view.start(),true);
 assert.equal(fail.view.tick(0),false,'failed WebGL draw disables the optional viewport');
 assert.equal(fail.view.stats().enabled,false);
 assert.equal(fail.container.hidden,true);
 assert.equal(fail.calls.destroyed,1,'teardown attempted exactly once');
 assert.match(fail.view.stats().reason,/original 2D game still works/);
 assert.equal(fail.view.tick(100),false,'no further GPU work after automatic shutdown');
 assert.equal(fail.view.stop(),false,'cleanup is idempotent');
 assert.ok(readFileSync(new URL('../city.js',import.meta.url),'utf8').includes('function updateLive3D(time)'),
  'original game loop catches unexpected WebGL errors');
 assert.match(readFileSync(new URL('../city.js',import.meta.url),'utf8'),/try\{live3D\.tick\(time\);\}catch\{/);
});

test('live viewport ships in original game UI, local server and GitHub Pages',()=>{
 const html=readFileSync(new URL('../city.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../city.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../city.css',import.meta.url),'utf8');
 const server=readFileSync(new URL('../server/city-server.mjs',import.meta.url),'utf8');
 const pages=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
 assert.match(html,/city-live-3d\.js\?v=60-live-game-camera/);
 assert.ok(html.indexOf('city-live-3d.js?v=60-live-game-camera')<html.indexOf('city.js?v=60-live-game-camera'));
 for(const id of ['city-live-3d','city-live-3d-toggle','city-live-3d-mode','city-live-3d-close','city-live-3d-canvas','city-live-3d-status'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(css.includes('.city-live-3d{'));
 assert.ok(js.includes('updateLive3D(time)'),'camera safely samples current gameplay loop');
 assert.ok(js.includes("getPlayer:()=>me,getAim:()=>aim"));
 assert.ok(js.includes('getWorldState:()=>state'),'live camera mirrors real NPC state');
 assert.ok(server.includes("'city-live-3d.js'"));
 assert.ok(pages.includes('city-live-3d.js'));
});
