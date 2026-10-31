/* Inactive world2 collision/layout model for testing streets and access before gameplay migration. */
'use strict';
(function(root){
 function create(C,I,T){
  if(T.draft.enabled)throw Error('World2 must remain an inactive review layout.');
  const world=T.draft.world,fort=T.draft.areas.fortress,center=world.center;
  const width=220,half=width/2,thickness=30,gap=145;
  const roads=[
   {id:'north',x:center.x-half,y:0,w:width,h:fort.y},
   {id:'east',x:fort.x+fort.w,y:center.y-half,w:world.width-(fort.x+fort.w),h:width},
   {id:'south',x:center.x-half,y:fort.y+fort.h,w:width,h:world.height-(fort.y+fort.h)},
   {id:'west',x:0,y:center.y-half,w:fort.x,h:width}
  ];
  const walls=[
   {id:'north-west',x:fort.x,y:fort.y,w:center.x-gap-fort.x,h:thickness},
   {id:'north-east',x:center.x+gap,y:fort.y,w:fort.x+fort.w-center.x-gap,h:thickness},
   {id:'south-west',x:fort.x,y:fort.y+fort.h-thickness,w:center.x-gap-fort.x,h:thickness},
   {id:'south-east',x:center.x+gap,y:fort.y+fort.h-thickness,w:fort.x+fort.w-center.x-gap,h:thickness},
   {id:'west-north',x:fort.x,y:fort.y,w:thickness,h:center.y-gap-fort.y},
   {id:'west-south',x:fort.x,y:center.y+gap,w:thickness,h:fort.y+fort.h-center.y-gap},
   {id:'east-north',x:fort.x+fort.w-thickness,y:fort.y,w:thickness,h:center.y-gap-fort.y},
   {id:'east-south',x:fort.x+fort.w-thickness,y:center.y+gap,w:thickness,h:fort.y+fort.h-center.y-gap}
  ];
  // The old hub's 2x3 row of services cannot fit a northern boulevard
  // using a naive one-to-one compression. Preserve IDs; author distinct
  // building slots on either side of the road, leaving the four-way corridor open.
  const hubSlots={launch:[4480,4100],arcade:[5360,4100],club:[4480,4196],shop:[5360,4196],market:[4480,4292],garage:[5360,4292]};
  const buildings=[],doors=[],seen=new Set();
  for(const b of I.BUILDINGS){
   const original=I.door(b),areaId=T.sourceId(C,original);
   if(!areaId)throw Error('No old region for building '+b.roomId);
   const source=T.source(C,areaId),dest=T.draft.areas[areaId],sx=dest.w/source.w,sy=dest.h/source.h;
   let x=Math.round(dest.x+(b.x-source.x)*sx),y=Math.round(dest.y+(b.y-source.y)*sy),
     w=Math.round(b.w*sx),h=Math.round(b.h*sy);
   if(areaId==='hub'&&hubSlots[b.roomId]){[x,y]=hubSlots[b.roomId];w=245;h=45;}
   if(!seen.add(b.roomId))throw Error('Duplicate interior '+b.roomId);
   const projected={id:b.roomId,area:areaId,x,y,w,h,activity:b.activity,name:b.name,protected:['supplies','shop','market'].includes(b.activity)};
   const door={id:b.roomId,area:areaId,name:b.name,activity:b.activity,x:x+w/2,y:y+h+(areaId==='hub'?21:Math.max(26,Math.round(37*sy)))};
   if(![x,y,w,h,door.x,door.y].every(Number.isFinite)||x<0||y<0||x+w>world.width||y+h>world.height)throw Error('Building out of bounds: '+b.roomId);
   buildings.push(Object.freeze(projected));doors.push(Object.freeze(door));
  }
  const inside=(x,y,b,margin=0)=>x>b.x-margin&&x<b.x+b.w+margin&&y>b.y-margin&&y<b.y+b.h+margin;
  function blocked(x,y,actor){
   if(!Number.isFinite(x)||!Number.isFinite(y)||x<28||y<35||x>world.width-28||y>world.height-28)return true;
   if(walls.some(w=>inside(x,y,w,12)))return true;
   if(buildings.some(b=>inside(x,y,b,14)))return true;
   if(actor?.plot?.some(o=>C.BUILD_KIT.find(k=>k.id===o.kind)?.solid&&inside(x,y,{x:T.draft.plot.x+o.col*64,y:T.draft.plot.y+o.row*64,w:60,h:60},6)))return true;
   if(actor?.outposts?.some(o=>{const lot=T.outpost(C,o.clan);return lot&&C.BUILD_KIT.find(k=>k.id===o.kind)?.solid&&inside(x,y,{x:lot.x+o.col*64,y:lot.y+o.row*64,w:60,h:60},6);}))return true;
   return false;
  }
  const spawn={x:center.x,y:center.y},commons={x:T.draft.areas.hub.x+T.draft.areas.hub.w/2,y:T.draft.areas.hub.y+T.draft.areas.hub.h/2};
  return Object.freeze({world,fortress:fort,spawn:Object.freeze(spawn),commons:Object.freeze(commons),roads:Object.freeze(roads.map(Object.freeze)),
    walls:Object.freeze(walls.map(Object.freeze)),buildings:Object.freeze(buildings),doors:Object.freeze(doors),blocked});
 }
 root.CityWorld2=Object.freeze({create});
})(typeof window==='undefined'?globalThis:window);
