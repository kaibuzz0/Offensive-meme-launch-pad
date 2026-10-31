/* World-map destinations share existing street stations, district anchors and real interior doors. */
'use strict';
(function(root){
 function catalog(C,I,R){
  const points=[],ids=new Set(),world=C.WORLD;
  function add(id,name,x,y,kind,activity=''){
   if(typeof id!=='string'||!id||ids.has(id)||typeof name!=='string'||!name||!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>world.width||y>world.height)throw Error('Invalid or duplicate map destination: '+id);
   ids.add(id);points.push(Object.freeze({id,name,x,y,kind,activity}));
  }
  add('district:hub','Founder Square',world.spawn.x,world.spawn.y,'district');
  for(const d of C.DISTRICTS)add('district:'+d.id,d.name,d.x,d.y,'district');
  for(const n of C.NEIGHBORHOODS)add('neighborhood:'+n.id,n.name,n.x,n.y,'district');
  for(const s of world.stations)add('station:'+s.id,s.name,s.x,s.y,'station',s.kind);
  for(const b of I.BUILDINGS){const entrance=I.door(b);add('door:'+b.roomId,b.name,entrance.x,entrance.y,'door',b.activity);}
  for(const n of R.LANDMARKS)add('landmark:'+n.id,n.name,n.x,n.y,'landmark');
  return Object.freeze(points);
 }
 function fromCanvas(clientX,clientY,rect,world){
  if(!Number.isFinite(clientX)||!Number.isFinite(clientY)||!rect||!Number.isFinite(rect.left)||!Number.isFinite(rect.top)||!Number.isFinite(rect.width)||!Number.isFinite(rect.height)||rect.width<=0||rect.height<=0||!world||world.width<=0||world.height<=0)return null;
  const u=(clientX-rect.left)/rect.width,v=(clientY-rect.top)/rect.height;
  if(u<0||u>1||v<0||v>1)return null;
  return {x:u*world.width,y:v*world.height};
 }
 function closest(points,point,maxDistance=180){
  if(!Array.isArray(points)||!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||!Number.isFinite(maxDistance)||maxDistance<=0)return null;
  const priority={door:0,landmark:1,station:2,district:3};let best=null,score=Infinity;
  for(const p of points){const distance=Math.hypot(p.x-point.x,p.y-point.y);if(distance>maxDistance)continue;
   // Favor a real building entrance when several markers overlap on a phone.
   const rank=priority[p.kind]??4,weight=distance+rank*18;
   if(weight<score){score=weight;best=p;}
  }
  return best;
 }
 root.CityMap=Object.freeze({catalog,fromCanvas,closest});
})(typeof window==='undefined'?globalThis:window);
