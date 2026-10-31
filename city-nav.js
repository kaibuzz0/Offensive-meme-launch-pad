/* Collision-respecting walking routes. Never moves or teleports a player. */
'use strict';
(function(root){
 function createRouter(C,opts={}){
  if(!C?.WORLD||typeof C.blocked!=='function')throw Error('World collision source required');
  const cell=opts.cell||80,budget=opts.budget||9000,w=C.WORLD.width,h=C.WORLD.height,nx=Math.ceil(w/cell),ny=Math.ceil(h/cell),count=nx*ny;
  if(!Number.isInteger(cell)||cell<32||cell>256||!Number.isInteger(budget)||budget<1||count>100000)throw Error('Invalid route budget or grid');
  const cache=new Uint8Array(count),xy=id=>({x:(id%nx+.5)*cell,y:(Math.floor(id/nx)+.5)*cell});
  const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.y>=0&&p.x<=w&&p.y<=h;
  function clear(a,b,actor){
   if(!finite(a)||!finite(b))return false;
   const steps=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/16));
   for(let i=0;i<=steps;i++){const t=i/steps;if(C.blocked(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,actor))return false;}
   return true;
  }
  function open(id,actor){
   if(id<0||id>=count)return false;
   if(!cache[id]){const p=xy(id);cache[id]=C.blocked(p.x,p.y)?2:1;}
   if(cache[id]===2)return false;
   if(actor?.plot?.length||actor?.outposts?.length){const p=xy(id);return !C.blocked(p.x,p.y,actor);}
   return true;
  }
  function near(point,actor){
   const cx=Math.max(0,Math.min(nx-1,Math.floor(point.x/cell))),cy=Math.max(0,Math.min(ny-1,Math.floor(point.y/cell)));
   for(let ring=0;ring<=6;ring++){
    let best=-1,distance=Infinity;
    for(let y=Math.max(0,cy-ring);y<=Math.min(ny-1,cy+ring);y++)for(let x=Math.max(0,cx-ring);x<=Math.min(nx-1,cx+ring);x++){
     if(Math.max(Math.abs(x-cx),Math.abs(y-cy))!==ring)continue;
     const id=y*nx+x,p=xy(id),d=Math.hypot(p.x-point.x,p.y-point.y);
     if(d<distance&&open(id,actor)&&clear(point,p,actor)){distance=d;best=id;}
    }
    if(best>=0)return best;
   }
   return -1;
  }
  function push(h,v){let i=h.length;h.push(v);while(i){const p=(i-1)>>1;if(h[p].f<=v.f)break;h[i]=h[p];i=p;}h[i]=v;}
  function pop(h){const first=h[0],last=h.pop();if(h.length){let i=0;while(true){const l=2*i+1,r=l+1;if(l>=h.length)break;const j=r<h.length&&h[r].f<h[l].f?r:l;if(h[j].f>=last.f)break;h[i]=h[j];i=j;}h[i]=last;}return first;}
  function plan(a,b,actor){
   if(!finite(a)||!finite(b)||C.blocked(a.x,a.y,actor)||C.blocked(b.x,b.y,actor))return {status:'invalid',points:[],expanded:0};
   if(clear(a,b,actor))return {status:'ok',points:[{x:a.x,y:a.y},{x:b.x,y:b.y}],expanded:0,distance:Math.hypot(a.x-b.x,a.y-b.y)};
   const first=near(a,actor),last=near(b,actor);
   if(first<0||last<0)return {status:'unreachable',points:[],expanded:0};
   const g=new Float64Array(count).fill(Infinity),parent=new Int32Array(count).fill(-1),seen=new Uint8Array(count),heap=[];
   const endX=last%nx,endY=Math.floor(last/nx),estimate=id=>cell*(Math.abs(id%nx-endX)+Math.abs(Math.floor(id/nx)-endY));
   g[first]=0;push(heap,{id:first,g:0,f:estimate(first)});
   let expanded=0,found=false;
   while(heap.length&&expanded<budget){
    const v=pop(heap),id=v.id;if(seen[id]||v.g!==g[id])continue;
    seen[id]=1;expanded++;if(id===last){found=true;break;}
    const x=id%nx,y=Math.floor(id/nx);
    for(const next of [x?id-1:-1,x+1<nx?id+1:-1,y?id-nx:-1,y+1<ny?id+nx:-1]){
     if(next<0||seen[next]||!open(next,actor)||!clear(xy(id),xy(next),actor))continue;
     const alt=v.g+cell;if(alt<g[next]){g[next]=alt;parent[next]=id;push(heap,{id:next,g:alt,f:alt+estimate(next)});}
    }
   }
   if(!found)return {status:expanded>=budget?'budget':'unreachable',points:[],expanded};
   const ids=[];for(let id=last;id>=0;id=parent[id]){ids.push(id);if(id===first)break;}
   if(ids.at(-1)!==first)return {status:'unreachable',points:[],expanded};
   ids.reverse();const raw=[{x:a.x,y:a.y},...ids.map(xy),{x:b.x,y:b.y}],points=[raw[0]];
   for(let i=0;i<raw.length-1;){let j=raw.length-1;while(j>i+1&&!clear(raw[i],raw[j],actor))j--;points.push(raw[j]);i=j;}
   let distance=0;for(let i=1;i<points.length;i++)distance+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
   return {status:'ok',points,expanded,distance};
  }
  function distanceToRoute(point,points){
   if(!finite(point)||!Array.isArray(points)||points.length<2)return Infinity;
   let nearest=Infinity;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy||1)));nearest=Math.min(nearest,Math.hypot(point.x-a.x-t*dx,point.y-a.y-t*dy));}return nearest;
  }
  return Object.freeze({plan,clear,distanceToRoute,cell,budget});
 }
 root.CityNav=Object.freeze({createRouter});
})(typeof window==='undefined'?globalThis:window);
