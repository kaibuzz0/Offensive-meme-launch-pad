/* Review-only world2 room engine. The SERVER owns all movement, gameplay and credit mutations.
 * Shares canonical geometry/POIs and existing bounded room/session admission; never handles tokens.
 * No endpoint exposes this prototype in the deployed world1 service.
 */
'use strict';
(function(root){
 function createClass(C,I,W,R,Nav,Territory,Contracts,Services,Defense,Journey){
  if(!C?.validIds||!I?.ROOM||!W?.blocked||!R?.resolve||!Territory?.create||!Contracts?.create||!Services?.create||!Defense?.create||!Journey?.create)
   throw Error('Incomplete world2 authority dependencies');
  const service=Services.create(C,I),defense=Defense.create(C,W,R,Nav),journey=Journey.create(R,Nav.createRouter({WORLD:W.world,blocked:W.blocked},{cell:80,budget:9000})),nav=Nav.createRouter({WORLD:W.world,blocked:W.blocked},{cell:80,budget:9000});
  const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const neutral={x:W.commons.x,y:W.commons.y};
  if(W.blocked(neutral.x,neutral.y))throw Error('Neutral room spawn is blocked');
  const actions=Object.freeze(['joinFaction','startCapture','enterBuilding','exitBuilding','buyGear','equipGear','sellGear',
   'buyMedkit','useMedkit','startCourier','deliverCourier','abandonCourier','reload','buildPlot','removePlot',
   'hireDefender','orderDefender','startRaid','claimJourney']);
  class Engine{
   static CAPABILITIES=Object.freeze({online:{actions}});
   constructor(){
    this.players=new Map();this.couriers=new Map();this.journeys=new Map();this.privateDefense=new Map();this.territory=Territory.create(C,W,R);
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
    this.players.set(id,p);this.couriers.set(id,Contracts.create(R));this.journeys.set(id,journey.session());this.privateDefense.set(id,defense.session());return p;
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
   hasEquipped(p,id){const item=C.ITEMS.find(x=>x.id===id);if(!item)return false;
    const uid=p.equipped?.[item.slot];return !!uid&&p.inventory.some(x=>x.uid===uid&&x.item===id);}
   shoot(p){
    if(p.room||p.hp<=0||!p.fireHeld||p.fireCooldown>0||p.ammo<=0)return;
    p.ammo--;p.fireCooldown=C.WEAPON.shotInterval;
    const session=this.privateDefense.get(p.id);
    const victims=[...this.guards.filter(a=>a.alive).map(a=>({a,raid:false})),
     ...(session?.raiders||[]).filter(a=>a.alive).map(a=>({a,raid:true}))].filter(({a})=>d(a,p)<=540).map(({a,raid})=>{
     const len=d(a,p)||1,dot=((a.x-p.x)*p.aim.x+(a.y-p.y)*p.aim.y)/len;
     return {a,len,dot,raid};
    }).filter(x=>x.dot>=.93&&nav.clear(p,x.a)).sort((a,b)=>a.len-b.len);
    const victim=victims[0];if(!victim)return;
    const damage=this.hasEquipped(p,'blaster')?36:35;
    if(victim.raid){const wasAlive=victim.a.alive;session.hit(victim.a.id,damage);if(wasAlive&&!victim.a.alive)p.kills++;return;}
    const target=victim.a;target.hp=Math.max(0,target.hp-damage);
    if(!target.hp){target.alive=false;target.respawn=35;p.kills++;}
   }
   tick(step){
    const dt=Math.min(.1,Math.max(0,Number.isFinite(step)?step:0));this.time+=dt;
    for(const p of this.players.values()){
     p.fireCooldown=Math.max(0,p.fireCooldown-dt);
     const speed=205+(this.hasEquipped(p,'boots')?25:0),dx=p.input.x*speed*dt,dy=p.input.y*speed*dt;
     if(p.room){
      const r=p.room;if(!I.roomBlocked(r.x+dx,r.y,r.theme))r.x+=dx;
      if(!I.roomBlocked(r.x,r.y+dy,r.theme))r.y+=dy;
     }else if(p.hp>0){
      if(!W.blocked(p.x+dx,p.y,p))p.x+=dx;
      if(!W.blocked(p.x,p.y+dy,p))p.y+=dy;
      this.shoot(p);
     }
     this.couriers.get(p.id)?.tick(dt);
     this.privateDefense.get(p.id)?.tick(p,dt);
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
   // Private, ephemeral fortress plots use canonical world2 coordinates. All state and costs
   // belong to the authenticated guest; clients never choose an owner or supply credits.
   plotAction(p,a,remove=false){
    if(p.room||!(p.hp>0))throw Error('Return alive to your fortress plot first.');
    const plot=R.resolve('fortress:plot');
    if(!plot||!W.fortress)throw Error('Private fortress is unavailable.');
    const {col,row}=a||{},P={x:plot.x,y:plot.y,cols:C.PLOT.cols,rows:C.PLOT.rows,tile:64};
    if(!Number.isSafeInteger(col)||!Number.isSafeInteger(row)||col<0||row<0||col>=P.cols||row>=P.rows)
     throw Error('Invalid fortress tile.');
    const cell={x:P.x+col*P.tile+P.tile/2,y:P.y+row*P.tile+P.tile/2};
    if(d(p,cell)>245)throw Error('Move within 245 units of the requested fortress tile.');
    const existing=p.plot.findIndex(x=>x.col===col&&x.row===row);
    if(remove){
     if(existing<0)throw Error('No structure on that tile.');
     const old=p.plot[existing],item=C.BUILD_KIT.find(k=>k.id===old.kind),value=Math.floor(item.cost/2);
     if(!Number.isSafeInteger(p.credits)||p.credits<0||p.credits+value>1000000)
      throw Error('Preview credit limit reached.');
     p.plot.splice(existing,1);p.credits+=value;return item.name+' removed; +'+value+' preview credits.';
    }
    if(existing>=0)throw Error('Fortress tile is occupied.');
    const kit=C.BUILD_KIT.find(k=>k.id===a.kind);
    if(!kit)throw Error('Unknown fortress structure.');
    if(p.plot.length>=P.cols*P.rows)throw Error('Fortress plot is full.');
    if(!Number.isSafeInteger(p.credits)||p.credits<kit.cost||p.credits>1000000)
     throw Error('Insufficient preview credits.');
    const next={col,row,kind:kit.id,rotation:0};
    const candidate=[...p.plot,next],blocked=C.buildAccess(candidate,P.cols,P.rows);
    if(blocked)throw Error(blocked);
    const before=p.plot;p.plot=candidate;
    if(W.blocked(p.x,p.y,p)){p.plot=before;throw Error('Cannot trap your character in a structure.');}
    p.credits-=kit.cost;return kit.name+' built for '+kit.cost+' preview credits.';
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
    if(type==='buildPlot')return this.plotAction(p,a);
    if(type==='removePlot')return this.plotAction(p,a,true);
    if(type==='hireDefender')return this.privateDefense.get(id).hire(p,a.role);
    if(type==='orderDefender')return this.privateDefense.get(id).order(p,a.id,a.mode);
    if(type==='startRaid')return this.privateDefense.get(id).start(p);
    if(type==='claimJourney')return this.journeys.get(id).claim(p);
    if(type==='reload'){p.ammo=24;return 'Server magazine reloaded.';}
    throw Error('Unknown server action.');
   }
   // Only a trusted server vault calls these functions. Clients cannot submit save payloads.
   exportProgress(id){
    const p=this.player(id);
    return {schema:1,worldVersion:2,player:{
      name:p.name,avatar:p.avatar,x:p.x,y:p.y,hp:p.hp,xp:p.xp,credits:p.credits,ammo:p.ammo,
      kills:p.kills,jobs:p.jobs,clan:p.clan,reputation:{...p.reputation},
      inventory:p.inventory.map(i=>({...i})),equipped:{...p.equipped},
      rising:{medkits:p.rising.medkits},plot:p.plot.map(o=>({...o}))},
      journey:this.journeys.get(id).snapshot().index,
      defense:this.privateDefense.get(id).progress()};
   }
   restoreProgress(id,raw){
    // Stage and validate before mutating any room state, so corrupted records fail closed.
    const fail=()=>{throw Error('Saved world2 character is incompatible.');};
    const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
    const integer=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
    if(!obj(raw)||raw.schema!==1||raw.worldVersion!==2||!obj(raw.player))fail();
    const p=this.player(id),v=raw.player;
    if(typeof v.name!=='string'||v.name.length>22||!C.validIds.includes(v.avatar)||
      !integer(v.hp,0,100)||!integer(v.xp,0,1000000000)||!integer(v.credits,0,1000000)||
      !integer(v.ammo,0,24)||!integer(v.kills,0,1000000)||!integer(v.jobs,0,1000000)||
      !Number.isFinite(v.x)||!Number.isFinite(v.y)||
      (v.clan!==null&&!C.NEIGHBORHOODS.some(z=>z.id===v.clan))||
      !obj(v.reputation)||!obj(v.rising)||!integer(v.rising.medkits,0,9)||
      !Array.isArray(v.inventory)||v.inventory.length>100||!obj(v.equipped)||
      !Array.isArray(v.plot)||v.plot.length>C.PLOT.cols*C.PLOT.rows)fail();
    const reputation={};
    for(const [k,value] of Object.entries(v.reputation)){
     if(!C.NEIGHBORHOODS.some(z=>z.id===k)||!integer(value,0,1000000))fail();
     reputation[k]=value;
    }
    const taken=new Set(),inventory=v.inventory.map(i=>{
     if(!obj(i)||typeof i.uid!=='string'||!/^gear-[1-9][0-9]{0,6}$/.test(i.uid)||
       taken.has(i.uid)||!C.ITEMS.some(g=>g.id===i.item))fail();
     taken.add(i.uid);return {uid:i.uid,item:i.item};
    });
    const equipped={};
    for(const [slot,uid] of Object.entries(v.equipped)){
     if(!['head','outfit','hand','feet'].includes(slot)||typeof uid!=='string')fail();
     const owned=inventory.find(i=>i.uid===uid),item=C.ITEMS.find(i=>i.id===owned?.item);
     if(!item||item.slot!==slot)fail();
     equipped[slot]=uid;
    }
    const cells=new Set(),plot=v.plot.map(o=>{
     if(!obj(o)||!integer(o.col,0,C.PLOT.cols-1)||!integer(o.row,0,C.PLOT.rows-1)||
       !C.BUILD_KIT.some(k=>k.id===o.kind)||!integer(o.rotation,0,3))fail();
     const key=o.row*C.PLOT.cols+o.col;if(cells.has(key))fail();cells.add(key);
     return {col:o.col,row:o.row,kind:o.kind,rotation:o.rotation};
    });
    if(C.buildAccess(plot,C.PLOT.cols,C.PLOT.rows))fail();
    const stageJourney=journey.session(),stageDefense=defense.session();
    try{stageJourney.restore(raw.journey);stageDefense.restore(raw.defense);}catch{fail();}
    const staged={...p,plot};
    const position=!W.blocked(v.x,v.y,staged)?{x:v.x,y:v.y}:neutral;
    if(W.blocked(position.x,position.y,staged))fail();
    Object.assign(p,{name:v.name,avatar:v.avatar,x:position.x,y:position.y,
     hp:v.hp>0?v.hp:100,xp:v.xp,credits:v.credits,ammo:v.ammo,kills:v.kills,jobs:v.jobs,
     clan:v.clan,reputation,inventory,equipped,rising:{medkits:v.rising.medkits},plot,
     room:null,input:{x:0,y:0},fireHeld:false,fireCooldown:0});
    this.journeys.set(id,stageJourney);
    this.privateDefense.set(id,stageDefense);
    return {restored:true,relocated:position.x!==v.x||position.y!==v.y};
   }
   snapshot(id){
    const p=this.player(id),other=[...this.players.values()].map(x=>({
     id:x.id,name:x.name,avatar:x.avatar,x:x.x,y:x.y,hp:x.hp,clan:x.clan,
     room:x.room?{id:x.room.id,x:x.room.x,y:x.room.y}:null
    }));
    return {worldVersion:2,preview:true,mode:'server-authoritative-prototype',
     self:{id:p.id,name:p.name,avatar:p.avatar,x:p.x,y:p.y,hp:p.hp,credits:p.credits,xp:p.xp,kills:p.kills,
      jobs:p.jobs,clan:p.clan,reputation:{...p.reputation},ammo:p.ammo,inventory:p.inventory.map(o=>({...o})),
      equipped:{...p.equipped},rising:{...p.rising},plot:p.plot.map(x=>({...x})),
      defense:this.privateDefense.get(id).snapshot(),journey:this.journeys.get(id).snapshot(),room:p.room?{...p.room}:null,
      courier:{...this.couriers.get(id).state}},
     players:other,territory:this.territory.snapshot(),guards:this.guards.map(g=>({
      id:g.id,x:g.x,y:g.y,clan:g.clan,alive:g.alive,hp:g.hp
     })),listings:[],chat:[]};
   }
   leave(id){
    this.players.delete(id);this.couriers.delete(id);this.journeys.delete(id);this.privateDefense.delete(id);
    if(this.captureOwner===id){this.territory.cancel();this.captureOwner=null;}
   }
  }
  return Engine;
 }
 root.CityWorld2Authority=Object.freeze({createClass});
})(typeof window==='undefined'?globalThis:window);
