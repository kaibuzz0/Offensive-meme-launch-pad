import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../city-voxel-renderer.js',import.meta.url),'utf8');
const root={performance:{now:()=>1200}};
vm.runInNewContext(source,root,{filename:'city-voxel-renderer.js'});

function fakeScene(){
 const fills=[];
 const ctx={
  fillStyle:null,strokeStyle:null,lineWidth:1,
  createLinearGradient:()=>({addColorStop(){}}),
  fillRect(x,y,w,h){fills.push({color:this.fillStyle,x,y,w,h});},
  beginPath(){},moveTo(){},lineTo(){},stroke(){}
 };
 const canvas={clientWidth:400,clientHeight:620,width:0,height:0,
  getContext(type){assert.equal(type,'2d');return ctx;}};
 const world={
  EYE_HEIGHT:6.4,
  gateRoad:{x:0,z:0,gateX:0,gateZ:36,
   parts:[{x:-14,z:35,y:114,w:9,h:25,d:10,color:[.39,.46,.53]},
    {x:5,z:35,y:114,w:9,h:25,d:10,color:[.39,.46,.53]},
    {x:5,z:14,y:115,w:3,h:2,d:3,color:[.43,.26,.13]}]},
  surfaceAt(x,z){
   const road=Math.abs(x)<5&&z>=-4&&z<56;
   return {height:road?114:113+((Math.abs(x)+Math.abs(z))%7),
    road,curb:Math.abs(x)===4,water:false,group:'grassland',
    material:road?'stone':'topsoil'};
  }
 };
 return {fills,ctx,canvas,world};
}

test('phone compatibility view draws actual seeded landscape colors and buildings rather than a solid black/gray frame',()=>{
 const t=fakeScene();
 const renderer=root.CityVoxelRenderer.createCanvasRenderer(t.canvas,t.world);
 assert.equal(renderer.software,true);
 const r=renderer.render({x:0,y:120,z:0,yaw:0,pitch:0});
 assert.equal(r.loaded,1);
 assert.equal(r.workerStatus,'canvas');
 assert.ok(t.fills.length>300,'heightfield rays must paint actual world columns');
 assert.ok(new Set(t.fills.map(x=>String(x.color))).size>8,
  'scene must contain differently colored sky, ground, road and structures');
 assert.ok(t.fills.some(x=>x.w>=t.canvas.width&&x.h>=t.canvas.height),
  'sky must paint the full game canvas');
 assert.ok(t.fills.some(x=>/^rgb\\(1(?:0[5-9]|1[0-7]),(?:9[5-9]|10[0-9]),(?:8[5-9]|9[0-9])\\)$/.test(String(x.color))),
  'stone-colored road pixels should be drawn from generated terrain');
 assert.ok(r.vertices>500);
});

test('phone compatibility view supports different camera orientations and saves',()=>{
 const t=fakeScene();
 const renderer=root.CityVoxelRenderer.createCanvasRenderer(t.canvas,t.world);
 const a=renderer.render({x:0,y:120,z:0,yaw:0,pitch:0});
 root.performance.now=()=>1450;
 const b=renderer.render({x:1,y:120,z:1,yaw:Math.PI/3,pitch:.1});
 assert.ok(b.loaded>0&&a.loaded>0);
 assert.ok(t.fills.length>400,'moving the camera must redraw world');
 renderer.dispose();
});
