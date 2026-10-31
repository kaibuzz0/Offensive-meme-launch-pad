/* Draft world v2 spatial blueprint. Data and migration previews only: never active gameplay coordinates. */
'use strict';
(function(root){
 const TILE=2016,WIDTH=TILE*5,HEIGHT=TILE*5,CENTER={x:TILE*2.5,y:TILE*2.5};
 const assignments=[
  ['fortress',2,2,'private-center'],['hub',2,2,'public-commons'],
  ['creator',2,1,'north'],['arena',2,3,'south'],['social',3,2,'east'],
  ['offensive',2,0,'far-north'],['congress',4,2,'far-east'],
  ['exit',2,4,'far-south'],['you-missed',0,2,'far-west'],
  ['maduro',3,1,'northeast'],['redacted',1,3,'southwest']
 ];
 const areas=Object.freeze(Object.fromEntries(assignments.map(([id,col,row,role])=>{
  const rect=id==='hub'?{x:4380,y:4080,w:1320,h:320}:id==='fortress'?{x:4390,y:4430,w:1300,h:1280}:{x:col*TILE,y:row*TILE,w:TILE,h:TILE};
  return [id,Object.freeze({id,col,row,role,...rect})];
 })));
 const PLOT=Object.freeze({x:4536,y:4600,cols:16,rows:10,tile:64});
 const roads=Object.freeze([
  Object.freeze({id:'north',from:Object.freeze({x:CENTER.x,y:areas.fortress.y}),to:Object.freeze({x:CENTER.x,y:0})}),
  Object.freeze({id:'east',from:Object.freeze({x:areas.fortress.x+areas.fortress.w,y:CENTER.y}),to:Object.freeze({x:WIDTH,y:CENTER.y})}),
  Object.freeze({id:'south',from:Object.freeze({x:CENTER.x,y:areas.fortress.y+areas.fortress.h}),to:Object.freeze({x:CENTER.x,y:HEIGHT})}),
  Object.freeze({id:'west',from:Object.freeze({x:areas.fortress.x,y:CENTER.y}),to:Object.freeze({x:0,y:CENTER.y})})
 ]);
 function source(C,id){
  if(id==='hub')return {x:C.HUB.x,y:C.HUB.y,w:C.HUB.width,h:C.HUB.height};
  const d=C.DISTRICTS.find(d=>d.id===id)||C.NEIGHBORHOODS.find(n=>n.id===id);
  return d?{x:d.ox,y:d.oy,w:2240,h:1660}:null;
 }
 function sourceId(C,p){
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return null;
  for(const id of ['hub','fortress','creator','arena','social',...C.NEIGHBORHOODS.map(n=>n.id)]){
   const b=source(C,id);if(b&&p.x>=b.x&&p.x<b.x+b.w&&p.y>=b.y&&p.y<b.y+b.h)return id;
  }
  return null; // Greenbelt and unsupported positions require explicit reviewed migrations.
 }
 function point(C,p,id=sourceId(C,p)){
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Object.hasOwn(areas,id))return null;
  const old=source(C,id),dest=areas[id];
  if(!old||p.x<old.x||p.y<old.y||p.x>=old.x+old.w||p.y>=old.y+old.h)return null;
  return Object.freeze({x:Math.round(dest.x+(p.x-old.x)/old.w*dest.w),y:Math.round(dest.y+(p.y-old.y)/old.h*dest.h),area:id});
 }
 function outpost(C,id){
  const n=C.NEIGHBORHOODS.find(n=>n.id===id);if(!n||!areas[id])return null;
  return Object.freeze({x:areas[id].x+1472,y:areas[id].y+1472,cols:3,rows:3,tile:64});
 }
 function previewSave(C,save){
  if(!save||![2,3,4,5].includes(save.version)||save.worldVersion&&save.worldVersion!==1)return {status:'invalid',reason:'Unsupported save version'};
  const home=point(C,{x:save.x,y:save.y});if(!home)return {status:'blocked',reason:'Player is in an unmapped greenbelt or invalid coordinate'};
  const transformed=[];for(const person of save.crew||[]){if(!person?.post)continue;const next=point(C,person.post);if(!next)return {status:'blocked',reason:'A saved crew post has no verified destination'};transformed.push({id:person.id||null,role:person.role||null,post:next});}
  return {status:'preview',worldVersion:2,point:home,crewPosts:transformed,unmodified:{xp:save.xp,credits:save.credits,inventory:save.inventory,plot:save.plot,clans:save.clans,rising:save.rising,places:save.places}};
 }
 const ready=Object.freeze({version:2,enabled:false,world:Object.freeze({width:WIDTH,height:HEIGHT,center:Object.freeze(CENTER)}),areas,roads,plot:PLOT});
 root.CityTopology=Object.freeze({draft:ready,source,sourceId,point,outpost,previewSave});
})(typeof window==='undefined'?globalThis:window);
