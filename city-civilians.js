/* One-world street life: bounded civilian witnesses and faction patrol alerts.
 * Session-only ambient state. No wallet, inventory, XP or save schema effects. */
'use strict';
(function(root){
 const C=root.MemeCityCore,P=C.Engine.prototype;
 const base={tick:P.tick,snapshot:P.snapshot};
 const MAX=16,STEP=.16,ALERT_LIFETIME=6,ACTIVATE=1450;
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function safe(x,y){
  if(C.blocked(x,y))return false;
  return true;
 }
 function openNear(x,y){
  if(safe(x,y))return {x,y};
  for(let r=50;r<=230;r+=30)for(let k=0;k<12;k++){
   const theta=2*Math.PI*k/12,at={x:x+Math.cos(theta)*r,y:y+Math.sin(theta)*r};
   if(safe(at.x,at.y))return at;
  }
  return null;
 }
 function initialize(e){
  if(e.civilians)return;
  const s=C.DISTRICTS.find(d=>d.id==='social');
  const spots=[
   ...[[680,615],[850,970],[1160,590],[1420,980],[1720,610],[1920,960]]
    .map(([x,y])=>({x:C.HUB.x+x,y:C.HUB.y+y,zone:'hub'})),
   ...C.NEIGHBORHOODS.map((n,i)=>({
    x:n.x+[-110,100,-100,145,-85,115][i],y:n.y+[325,-280,270,-250,320,305][i],zone:n.id
   })),
   ...[430,770,1110,1450].map((x,i)=>({
    x:s.ox+x,y:s.oy+1045+(i%2)*23,zone:'social'
   }))
  ];
  e.civilians=spots.flatMap((o,i)=>{
   const p=openNear(o.x,o.y);return p?[{
    id:'street-civilian-'+i,x:p.x,y:p.y,homeX:p.x,homeY:p.y,
    zone:o.zone,phase:i*1.7,style:{skin:i%6,hair:i%4,pants:(i+2)%4},
    state:'stroll',panic:0,facing:{x:i%2?1:-1,y:0},
    moving:false,waypoint:i%4,speed:45+(i%3)*8,threatAt:null
   }]:[];
  }).slice(0,MAX);
  e.civilianClock=0;
 }
 function danger(e,c){
  let best=null,dMin=520;
  for(const b of e.arcade?.bots||[]){
   if(b.hp<=0)continue;
   const aggressive=b.kind==='zombie'||b.territoryRole==='invader'||
    ['attack','chase','skirmish','defending'].includes(b.state);
   if(!aggressive)continue;
   const d=dist(b,c);if(d<dMin){best=b;dMin=d;}
  }
  for(const p of e.players.values()){
   if(p.room||!p.fireHeld||C.areaAt(p.x,p.y)==='creator'||C.areaAt(p.x,p.y)==='social')continue;
   const d=dist(p,c);if(d<Math.min(220,dMin)){best=p;dMin=d;}
  }
  return best;
 }
 function move(c,target,dt,speed){
  const dx=target.x-c.x,dy=target.y-c.y,d=Math.hypot(dx,dy);
  if(d<12){c.moving=false;return false;}
  const vx=dx/d,vy=dy/d,step=Math.min(d,speed*dt);
  const nx=c.x+vx*step,ny=c.y+vy*step;
  if(safe(nx,ny)){c.x=nx;c.y=ny;c.moving=true;c.facing={x:vx,y:vy};return true;}
  for(const turn of [-1,1]){
   const ax=vx*.42-vy*turn*.9,ay=vy*.42+vx*turn*.9;
   if(safe(c.x+ax*step,c.y+ay*step)){
    c.x+=ax*step;c.y+=ay*step;c.moving=true;c.facing={x:ax,y:ay};return true;
   }
  }
  c.moving=false;return false;
 }
 function signal(e,c,threat){
  const alert={x:threat.x,y:threat.y,expires:e.arcade.time+ALERT_LIFETIME};
  let nearest=null,best=630;
  for(const b of e.arcade?.bots||[]){
   if(b.hp<=0||b.owner||b.eventId||b.territoryRole||b.kind==='zombie')continue;
   const protector=b.kind==='cop'&&(c.zone==='hub'||c.zone==='social')||
    b.resident&&b.faction===c.zone;
   if(!protector)continue;
   if(threat.kind!=='zombie'&&threat.faction&&!C.rivals(C.factionOf(b),C.factionOf(threat)))continue;
   const d=dist(b,c);if(d<best){best=d;nearest=b;}
  }
  if(nearest)nearest.civilianAlert=alert;
 }
 function update(e,dt){
  initialize(e);
  const players=[...e.players.values()].filter(p=>!p.room);
  if(!players.length)return;
  for(const c of e.civilians){
   if(!players.some(p=>dist(p,c)<ACTIVATE)){c.moving=false;continue;}
   const threat=danger(e,c);
   if(threat){
    c.panic=Math.max(c.panic,3.5);
    c.threatAt={x:threat.x,y:threat.y};
    c.state='fleeing';
    signal(e,c,threat);
   }else c.panic=Math.max(0,c.panic-dt);
   if(c.panic>0&&c.threatAt){
    const vx=c.x-c.threatAt.x,vy=c.y-c.threatAt.y,
     d=Math.max(1,Math.hypot(vx,vy));
    const target={x:c.x+vx/d*190,y:c.y+vy/d*190};
    const fled=move(c,target,dt,135);
    c.state=fled?'fleeing':'sheltering';
    if(dist(c,c.threatAt)>360)c.panic=Math.min(c.panic,1);
    continue;
   }
   const orbit=[
    {x:c.homeX-95,y:c.homeY-42},
    {x:c.homeX+105,y:c.homeY-38},
    {x:c.homeX+70,y:c.homeY+56},
    {x:c.homeX-83,y:c.homeY+56}
   ];
   const dest=orbit[c.waypoint%4];
   if(dist(c,dest)<21)c.waypoint=(c.waypoint+1)%4;
   const stepped=move(c,orbit[c.waypoint%4],dt,c.speed);
   if(!stepped)c.waypoint=(c.waypoint+1)%4;
   c.state=stepped?'stroll':'waiting';c.threatAt=null;
  }
 }
 P.tick=function(dt){
  base.tick.call(this,dt);
  if(!Number.isFinite(dt)||dt<=0)return;
  initialize(this);
  this.civilianClock+=Math.min(.1,dt);
  if(this.civilianClock>=STEP){
   const elapsed=this.civilianClock;this.civilianClock=0;
   update(this,elapsed);
  }
 };
 P.snapshot=function(id){
  const s=base.snapshot.call(this,id);initialize(this);
  s.civilians=this.civilians.map(c=>({
   id:c.id,x:c.x,y:c.y,state:c.state,zone:c.zone,
   phase:c.phase,style:{...c.style},facing:{...c.facing},moving:c.moving
  }));
  return s;
 };
 root.CityCivilians=Object.freeze({MAX,STEP,ALERT_LIFETIME,ACTIVATE});
})(typeof window==='undefined'?globalThis:window);
