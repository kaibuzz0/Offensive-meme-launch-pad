import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const ctx={};
vm.runInNewContext(readFileSync(new URL('../city-live-3d.js',import.meta.url),'utf8'),ctx);
const Live=ctx.CityLive3D;

function fixture({webgl=true}={}){
 const calls={scenes:[],creations:[],draws:[],observed:[],destroyed:0};
 let player={x:5600,y:5940,room:null},aim={x:1,y:0},visible=true;
 const container={hidden:true,dataset:{}},status={textContent:''},canvas={};
 const graphics={
  createWorldScene(_buildings,where){
   calls.scenes.push({...where});
   return {world:{...where},buildings:[],terrain:{cells:[]}};
  },
  createPreview(_canvas,color,scene){
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
    draw(mode,tint){calls.draws.push({mode,tint,position:current});return true;},
    destroy(){calls.destroyed++;},
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
  getPlayer:()=>player,getAim:()=>aim,getColor:()=> '#bdff56',isVisible:()=>visible});
 return {view,calls,container,status,setPlayer:p=>{player=p;},getPlayer:()=>player,
  setAim:a=>{aim=a;},setVisible:v=>{visible=v;}};
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
 assert.ok(js.includes('live3D.tick(time)'),'camera samples current gameplay loop');
 assert.ok(js.includes("getPlayer:()=>me,getAim:()=>aim"));
 assert.ok(server.includes("'city-live-3d.js'"));
 assert.ok(pages.includes('city-live-3d.js'));
});
