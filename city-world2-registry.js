/* Canonical v2 points of interest. Authoritative only for a non-deployed world2 preview.
 * The legacy game keeps its original destinations until a complete engine migration.
 */
'use strict';
(function(root){
 function create(C,I,R,T,W){
  if(!C||!I||!R||!T||!W)throw Error('World2 destination dependencies missing.');
  const entries=[],ids=new Set(),doors=new Map(W.doors.map(d=>[d.id,d]));
  function passable(pos){
   if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y))return false;
   return !W.blocked(pos.x,pos.y);
  }
  function nearest(pos){
   if(passable(pos))return {x:pos.x,y:pos.y};
   // Fixed deterministic search: never invent a point inside a building/fortress wall.
   for(let r=24;r<=400;r+=24){
    for(let i=0;i<32;i++){const angle=i*Math.PI/16,p={x:Math.round(pos.x+Math.cos(angle)*r),y:Math.round(pos.y+Math.sin(angle)*r)};if(passable(p))return p;}
   }
   return null;
  }
  function add(id,name,kind,pos,activity='',area=''){
   if(!id||ids.has(id))throw Error('Duplicate world2 POI '+id);
   const safe=nearest(pos);
   if(!safe)throw Error('Unreachable world2 POI placement '+id);
   const point=Object.freeze({id,name,kind,activity,area,x:safe.x,y:safe.y});
   entries.push(point);ids.add(id);return point;
  }
  function projected(p){const q=T.point(C,p);return q?{x:q.x,y:q.y}:null;}
  function region(id){const r=T.draft.areas[id];return r?{x:r.x+r.w/2,y:r.y+r.h/2}:null;}
  add('district:hub','Founder Commons','district',W.commons,'','hub');
  for(const d of C.DISTRICTS)add('district:'+d.id,d.name,'district',d.id==='fortress'?W.spawn:region(d.id),'',d.id);
  for(const n of C.NEIGHBORHOODS)add('neighborhood:'+n.id,n.name,'district',region(n.id),'',n.id);
  for(const d of W.doors)add('door:'+d.id,d.name,'door',d,d.activity,d.area);
  for(const s of C.WORLD.stations){
   const byDoor=doors.get(s.id),clan=s.id.startsWith('clan-')?s.id.slice(5):null;
   const point=byDoor||clan&&region(clan)||projected(s)||W.commons;
   add('station:'+s.id,s.name,'station',point,s.kind,byDoor?.area||clan||T.sourceId(C,s)||'hub');
  }
  for(const l of R.LANDMARKS)add('landmark:'+l.id,l.name,'landmark',projected(l), 'discovery',l.area);
  for(const guide of R.GUIDES){
   const associated={nova:'district:hub',wrench:'door:garage',doc:'door:shop',marshal:'district:arena',keeper:'district:fortress'}[guide.id];
   const point=entries.find(e=>e.id===associated)||projected(guide)||W.commons;
   add('guide:'+guide.id,guide.name,'guide',point,guide.panel,point.area||T.sourceId(C,guide)||'hub');
  }
  const checkpoints=['door:launch','district:creator','door:market'];
  checkpoints.forEach((id,i)=>add('checkpoint:'+i,C.WORLD.route[i]?.name||('Checkpoint '+(i+1)),'checkpoint',entries.find(x=>x.id===id),'journey',entries.find(x=>x.id===id)?.area||'hub'));
  add('fortress:plot','Private construction plot','construction',T.draft.plot,'build','fortress');
  const all=Object.freeze(entries);
  const byId=new Map(all.map(p=>[p.id,p]));
  function resolve(id){return typeof id==='string'?byId.get(id)||null:null;}
  function migrationTarget(original){
   if(!original||typeof original!=='object')return null;
   const stable=resolve(original.id);if(stable)return stable;
   // Older saves occasionally used building names as target labels.
   if(typeof original.name==='string'){
    const matches=all.filter(p=>p.kind==='door'&&p.name===original.name);
    if(matches.length===1)return matches[0];
   }
   const projection=projected(original);
   if(projection){const safe=nearest(projection);if(safe)return Object.freeze({id:null,name:original.name||'Legacy destination',kind:'legacy',...safe});}
   return null;
  }
  return Object.freeze({all,resolve,migrationTarget,doors:Object.freeze(all.filter(p=>p.kind==='door')),checkpoints:Object.freeze(checkpoints.map((_,i)=>resolve('checkpoint:'+i)))});
 }
 root.CityWorld2Registry=Object.freeze({create});
})(typeof window==='undefined'?globalThis:window);
