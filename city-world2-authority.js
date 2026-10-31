/* Review-only world2 room engine. The SERVER owns all movement, gameplay and credit mutations.
 * Shares canonical geometry/POIs and existing bounded room/session admission; never handles tokens.
 * No endpoint exposes this prototype in the deployed world1 service.
 */
'use strict';
(function(root){
 function createClass(C,I,W,R,Nav,Territory,Contracts,Services){
  if(!C?.validIds||!I?.ROOM||!W?.blocked||!R?.resolve||!Territory?.create||!Contracts?.create||!Services?.create)
   throw Error('Incomplete world2 authority dependencies');
  const service=Services.create(C,I),nav=Nav.createRouter({WORLD:W.world,blocked:W.blocked},{cell:80,budget:9000});
  const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const neutral={x:W.commons.x,y:W.commons.y};
  if(W.blocked(neutral.x,neutral.y))throw Error('Neutral room spawn is blocked');
  const actions=Object.freeze(['joinFaction','startCapture','enterBuilding','exitBuilding','buyGear','equipGear','sellGear',
   'buyMedkit','useMedkit','startCourier','deliverCourier','abandonCourier','reload']);
  class Engine{
   static CAPABILITIES=Object.freeze({online:{actions}});
   constructor(){
    this.players=new Map();this.couriers=new Map();this.territory=Territory.create(C,W,R);
    this.guards=this.territory.zones.map((z,i)=>Object.seal({
     id:'guard-'+i,kind:'gang',clan:z.homeClan,x:z.x,y:z.y,hp:70,maxHp:70,alive:true,
     respawn:0,cooldown:0
    }));
    this.captureOwner=null;this.mode='world2-review-only';this.time=0;
   }
   join(id,name,avatar){
    if(this.players.has(id)||this.players.size>=8)throw Error('World2 room capacity reached.');
    if(!C.validIds.includes(avatar))throw Error('Unknown avatar.');
    const p={id,name:String(name||'Guest').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,22)||'Guest',avatar,
     x:neutral.x,y:neutral.y,input:{x:0,y:0},aim:{x:0,y:1},fireHeld:false,fireCooldown:0,ammo:24,
     hp:100,maxHp:100,heat:0,xp:0,credits:180,kills:0,jobs:0,route:0,clan:null,reputation:{},
     inventory:[],equipped:{},rising:{medkits:0},room:null,plot:[],outposts:[],crew:[],style:{}};
    this.players.set(id,p);this.couriers.set(id,Contracts.create(R));return p;
   }
   player(id){const p=this.players.get(id);if(!p)throw Error('Guest session not found.');return p;}
   input(id,x,y){const p=this.player(id);if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Invalid movement.');
    const len=Math.max(1,Math.hypot(x,y));p.input={x:x/len,y:y/len};
   }
   trigger(id,fire,aimX=1,aimY=0){
    const p=this.player(id);
    if(!Number.isFinite(aimX)||!Number.isFinite(aimY)||Math.abs(aimX)>1||Math.abs(aimY)>1)
     throw Error('Invalid aim vector.');
    const len=Math.hypot(aimX,aimY);if(len>0.05)p.aim={x:aimX/len,y:aimY/len};
    p.fireHeld=fire===true;
   }
   shoot(p){
    if(p.room||p.hp<=0||!p.fireHeld||p.fireCooldown>0||p.ammo<=0)return;
    p.ammo--;p.fireCooldown=C.WEAPON.shotInterval;
    const victims=this.guards.filter(a=>a.alive&&d(a,p)<=540).map(a=>{
     const len=d(a,p)||1,dot=((a.x-p.x)*p.aim.x+(a.y-p.y)*p.aim.y)/len;
     return {a,len,dot};
    }).filter(x=>x.dot>=.93&&nav.clear(p,x.a)).sort((a,b)=>a.len-b.len);
    const target=victims[0]?.a;if(!target)return;
    target.hp=Math.max(0,target.hp-35);
    if(!target.hp){target.alive=false;target.respawn=35;p.kills++;}
   }
   tick(step){
    const dt=Math.min(.1,Math.max(0,Number.isFinite(step)?step:0));this.time+=dt;
    for(const p of this.players.values()){
     p.fireCooldown=Math.max(0,p.fireCooldown-dt);
     const dx=p.input.x*205*dt,dy=p.input.y*205*dt;
     if(p.room){
      const r=p.room;if(!I.roomBlocked(r.x+dx,r.y,r.theme))r.x+=dx;
      if(!I.roomBlocked(r.x,r.y+dy,r.theme))r.y+=dy;
     }else if(p.hp>0){
      if(!W.blocked(p.x+dx,p.y))p.x+=dx;
      if(!W.blocked(p.x,p.y+dy))p.y+=dy;
      this.shoot(p);
     }
     this.couriers.get(p.id)?.tick(dt);
    }
    for(const g of this.guards){
     if(!g.alive){g.respawn=Math.max(0,g.respawn-dt);if(g.respawn===0){g.hp=g.maxHp;g.alive=true;}continue;}
     g.cooldown=Math.max(0,g.cooldown-dt);
     if(g.cooldown>0)continue;
     const closest=[...this.players.values()].filter(p=>!p.room&&p.hp>0&&p.clan!==g.clan&&d(p,g)<170)
      .sort((a,b)=>d(a,g)-d(b,g))[0];
     if(closest&&nav.clear(g,closest)){closest.hp=Math.max(0,closest.hp-6);g.cooldown=1.5;
      if(closest.hp===0){closest.hp=100;closest.x=neutral.x;closest.y=neutral.y;
       closest.input={x:0,y:0};closest.fireHeld=false;this.couriers.get(closest.id)?.abandon();}}
    }
    if(this.captureOwner){
     const p=this.players.get(this.captureOwner);
     const result=this.territory.tick(dt,p,this.guards);
     if(!p||!this.territory.active()||result?.status==='interrupted'||result?.status==='captured')
      this.captureOwner=null;
    }
   }
   action(id,a){
    const p=this.player(id),type=a?.type;
    if(!actions.includes(type))throw Error('Action unavailable in world2 shared prototype.');
    const take=r=>{if(!r||!['joined','capturing','contested','active','delivered','abandoned','bought','equipped','sold','healed'].includes(r.status))
      throw Error(r?.message||'Action refused.');return r.message;};
    if(type==='joinFaction'){
     if(this.captureOwner&&this.captureOwner!==id)throw Error('Another guest is capturing territory.');
     return take(this.territory.join(p,a.clan));
    }
    if(type==='startCapture'){
     if(p.room)throw Error('Return outside to capture territory.');
     if(this.captureOwner&&this.captureOwner!==id)throw Error('Another guest is capturing territory.');
     const result=this.territory.start(p,a.zone,this.guards);
     take(result);this.captureOwner=id;return result.message;
    }
    if(type==='enterBuilding'){
     if(p.room)throw Error('Already inside.');
     const point=R.resolve('door:'+a.building);
     if(!point||point.kind!=='door'||d(p,point)>95)throw Error('Walk to a valid building doorway.');
     const source=I.BUILDINGS.find(b=>b.roomId===a.building);
     if(!source)throw Error('Unknown building.');
     p.room={id:point.id,name:point.name,x:I.ROOM.spawn.x,y:I.ROOM.spawn.y,theme:source.theme,activity:source.activity};
     p.fireHeld=false;p.input={x:0,y:0};return 'Entered '+point.name+'.';
    }
    if(type==='exitBuilding'){
     if(!p.room||d(p.room,I.ROOM.exit)>95)throw Error('Walk to the interior exit.');
     p.room=null;p.input={x:0,y:0};return 'Returned to world2 streets.';
    }
    if(type==='buyGear')return take(service.buyGear(p,a.item,p.room));
    if(type==='equipGear')return take(service.equip(p,a.uid,p.room));
    if(type==='sellGear')return take(service.sell(p,a.uid,p.room));
    if(type==='buyMedkit')return take(service.buyMedkit(p,p.room));
    if(type==='useMedkit')return take(service.useMedkit(p));
    if(type==='startCourier'){
     if(p.room)throw Error('Accept the courier outside Launch House.');
     return take(this.couriers.get(id).start(p));
    }
    if(type==='deliverCourier'){
     if(p.room)throw Error('Deliver the parcel on the street.');
     return take(this.couriers.get(id).deliver(p));
    }
    if(type==='abandonCourier')return take(this.couriers.get(id).abandon());
    if(type==='reload'){p.ammo=24;return 'Server magazine reloaded.';}
    throw Error('Unknown server action.');
   }
   snapshot(id){
    const p=this.player(id),other=[...this.players.values()].map(x=>({
     id:x.id,name:x.name,avatar:x.avatar,x:x.x,y:x.y,hp:x.hp,clan:x.clan,
     room:x.room?{id:x.room.id,x:x.room.x,y:x.room.y}:null
    }));
    return {worldVersion:2,preview:true,mode:'server-authoritative-prototype',
     self:{id:p.id,name:p.name,avatar:p.avatar,x:p.x,y:p.y,hp:p.hp,credits:p.credits,xp:p.xp,kills:p.kills,
      jobs:p.jobs,clan:p.clan,reputation:{...p.reputation},ammo:p.ammo,inventory:p.inventory.map(o=>({...o})),
      equipped:{...p.equipped},rising:{...p.rising},room:p.room?{...p.room}:null,
      courier:{...this.couriers.get(id).state}},
     players:other,territory:this.territory.snapshot(),guards:this.guards.map(g=>({
      id:g.id,x:g.x,y:g.y,clan:g.clan,alive:g.alive,hp:g.hp
     })),listings:[],chat:[]};
   }
   leave(id){
    this.players.delete(id);this.couriers.delete(id);
    if(this.captureOwner===id){this.territory.cancel();this.captureOwner=null;}
   }
  }
  return Engine;
 }
 root.CityWorld2Authority=Object.freeze({createClass});
})(typeof window==='undefined'?globalThis:window);
