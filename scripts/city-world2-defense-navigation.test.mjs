import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx={};
vm.runInNewContext(fs.readFileSync(new URL('../city-world2-defense.js',import.meta.url),'utf8'),ctx);
const types=[{id:'sentry',name:'Sentry',cost:20,hp:80,range:180,damage:10,cooldown:1,speed:100}];
const C={CREW_TYPES:types,PLOT:{cols:16,rows:10}};
const barrier=(x,y)=>x>=540&&x<=565&&y>=245&&y<=345;
const W={world:{width:1000,height:1000},commons:{x:100,y:100},
 blocked:(x,y)=>x<25||y<25||x>975||y>975||barrier(x,y)};
const R={resolve:id=>id==='fortress:plot'?{x:200,y:0}:null};
let plans=0;
const Nav={createRouter:()=>({
 clear:(a,b)=>{
  for(let i=0;i<=60;i++){const t=i/60;if(W.blocked(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false;}
  return true;
 },
 plan:(a,b)=>{plans++;return {status:'ok',
  points:[{x:a.x,y:a.y},{x:490,y:175},{x:650,y:175},{x:b.x,y:b.y}]};}
})};
test('defender follow order navigates around blocked street using bounded server route planning',()=>{
 plans=0;
 const session=ctx.CityWorld2Defense.create(C,W,R,Nav).session();
 const p={x:500,y:300,hp:100,room:null,credits:200,plot:[]};
 session.hire(p,'sentry');
 const id=session.crew[0].id;session.order(p,id,'follow');
 p.x=650;p.y=300;
 for(let i=0;i<160;i++){
  session.tick(p,.1);
  assert.equal(W.blocked(session.crew[0].x,session.crew[0].y),false,'navigation stays outside walls');
 }
 assert.ok(session.crew[0].x>570,'defender must reach opposite side instead of stopping at solid wall');
 assert.ok(plans>=1&&plans<=18,'path searches are cached and bounded, not computed every tick');
 assert.equal(p.credits,180,'navigation never mints or consumes additional player credits');
});
test('unreachable route is retried at bounded intervals without teleporting',()=>{
 let searches=0;
 const blockedNav={createRouter:()=>({clear:()=>false,plan:()=>{searches++;return {status:'unreachable',points:[]};}})};
 const session=ctx.CityWorld2Defense.create(C,W,R,blockedNav).session();
 const p={x:500,y:300,hp:100,room:null,credits:200,plot:[]};
 session.hire(p,'sentry');session.order(p,session.crew[0].id,'follow');
 p.x=650;p.y=300;
 const start={x:session.crew[0].x,y:session.crew[0].y};
 for(let i=0;i<100;i++)session.tick(p,.1);
 assert.deepEqual({x:session.crew[0].x,y:session.crew[0].y},start);
 assert.ok(searches>=1&&searches<=8,'failed path should back off instead of repeating every frame');
});
