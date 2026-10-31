/* Local-only world2 private fortress squads and bounded raid encounters.
 * Authority is server-side. No wallet access, tokens, durable accounts, or public world1 writes.
 */
'use strict';
(function(root){
 function create(C,W,R,Nav){
  if(!C?.CREW_TYPES?.length||!W?.blocked||!R?.resolve||!Nav?.createRouter)throw Error('World2 defense dependencies missing');
  const lot=R.resolve('fortress:plot'),P={x:lot.x,y:lot.y,cols:C.PLOT.cols,rows:C.PLOT.rows,tile:64};
  const center={x:P.x+P.cols*32,y:P.y+P.rows*32};
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const nav=Nav.createRouter({WORLD:W.world,blocked:W.blocked},{cell:80,budget:5000});
  function session(){
   const crew=[],raiders=[],raid={status:'idle',wave:0,remaining:0,cooldown:0,earned:0};
   let serial=0;
   const alive=p=>p&&p.hp>0&&!p.room;
   const safe=(x,y,p)=>!W.blocked(x,y,p);
   const nearHome=p=>distance(p,center)<=540;
   const checkHome=p=>{if(!alive(p)||!nearHome(p))throw Error('Return alive to the private fortress lot first.');};
   function hire(p,role){
    checkHome(p);
    const kind=C.CREW_TYPES.find(x=>x.id===role);
    if(!kind)throw Error('Unknown defender role.');
    if(crew.length>=4)throw Error('Defender roster is full (4 maximum).');
    if(!Number.isSafeInteger(p.credits)||p.credits<kind.cost||p.credits>1000000)throw Error('Insufficient preview credits.');
    const offsets=[[0,0],[30,0],[-30,0],[0,30],[0,-30],[40,40]];
    const spawn=offsets.map(([dx,dy])=>({x:p.x+dx,y:p.y+dy})).find(x=>safe(x.x,x.y,p));
    if(!spawn)throw Error('No safe defender spawn available; move into open space.');
    const unit={id:'defender-'+(++serial),role:kind.id,mode:'guard',x:spawn.x,y:spawn.y,
     home:{...spawn},hp:kind.hp,maxHp:kind.hp,cooldown:0,kills:0};
    crew.push(unit);p.credits-=kind.cost;
    return kind.name+' hired for '+kind.cost+' preview credits.';
   }
   function order(p,id,mode){
    if(!alive(p))throw Error('Respawn before issuing squad orders.');
    if(!['guard','follow'].includes(mode))throw Error('Choose guard or follow.');
    const unit=crew.find(x=>x.id===id);if(!unit)throw Error('You do not own that defender.');
    if(unit.hp<=0)throw Error('Downed defender cannot take orders.');
    unit.mode=mode;
    if(mode==='guard')unit.home={x:unit.x,y:unit.y};
    return unit.id+' now '+mode+'s its assigned position.';
   }
   function spawnRaid(p){
    const offsets=[[-400,-230],[415,-230],[-365,370],[400,350],[-495,100],[510,70]];
    const result=[];
    const count=Math.min(5,2+Math.min(3,Math.floor(raid.wave/2)));
    for(const [dx,dy] of offsets){
     if(result.length>=count)break;
     const x=center.x+dx,y=center.y+dy;
     if(safe(x,y,p)&&distance({x,y},p)>155)result.push({id:'raider-'+raid.wave+'-'+result.length,
      x,y,hp:65,maxHp:65,alive:true,cooldown:0});
    }
    if(result.length<count)throw Error('No safe raid spawn locations; clear private construction or try later.');
    return result;
   }
   function start(p){
    checkHome(p);
    if(raid.status==='active')throw Error('Private fortress raid already active.');
    if(raid.cooldown>0)throw Error('Fortress raid cooldown: '+Math.ceil(raid.cooldown)+' seconds.');
    if(!crew.some(u=>u.hp>0))throw Error('Hire at least one active defender before starting a raid.');
    const nextWave=raid.wave+1;
    raid.wave=nextWave;
    try{const next=spawnRaid(p);raiders.splice(0,raiders.length,...next);raid.remaining=next.length;}
    catch(e){raid.wave--;throw e;}
    raid.status='active';
    return 'Private fortress raid wave '+raid.wave+' started: '+raid.remaining+' hostile raiders.';
   }
   function hit(target,damage){
    const r=raiders.find(x=>x.id===target);
    if(raid.status!=='active'||!r?.alive||!Number.isFinite(damage)||damage<=0)return false;
    r.hp=Math.max(0,r.hp-Math.min(damage,100));
    if(r.hp===0){r.alive=false;raid.remaining=Math.max(0,raid.remaining-1);}
    return true;
   }
   function abort(){
    if(raid.status!=='active')return;
    raid.status='failed';raid.remaining=0;raid.cooldown=15;raiders.length=0;
   }
   function move(u,target,speed,dt,p){
    if(distance(u,target)<18)return;
    if(!nav.clear(u,target,p))return;
    const d=Math.max(1,distance(u,target)),sx=(target.x-u.x)*speed*dt/d,sy=(target.y-u.y)*speed*dt/d;
    if(safe(u.x+sx,u.y,p))u.x+=sx;
    if(safe(u.x,u.y+sy,p))u.y+=sy;
   }
   function tick(p,step){
    const dt=Math.max(0,Math.min(.1,Number.isFinite(step)?step:0));
    raid.cooldown=Math.max(0,raid.cooldown-dt);
    for(const u of crew){
     u.cooldown=Math.max(0,u.cooldown-dt);
     if(u.hp<=0)continue;
     const kit=C.CREW_TYPES.find(k=>k.id===u.role);
     const hostile=raid.status==='active'?raiders.filter(r=>r.alive&&distance(r,u)<kit.range&&nav.clear(u,r,p))
      .sort((a,b)=>distance(a,u)-distance(b,u))[0]:null;
     if(hostile&&u.cooldown<=0){hit(hostile.id,kit.damage);u.cooldown=kit.cooldown;if(!hostile.alive)u.kills++;}
     else if(u.mode==='follow'&&alive(p)&&distance(u,p)>85&&distance(u,p)<1150)move(u,p,kit.speed,dt,p);
     else if(u.mode==='guard'&&distance(u,u.home)>36)move(u,u.home,kit.speed,dt,p);
    }
    if(raid.status!=='active')return;
    if(!alive(p)||distance(p,center)>1000){abort();return;}
    for(const r of raiders){
     if(!r.alive)continue;
     r.cooldown=Math.max(0,r.cooldown-dt);
     const candidates=[p,...crew.filter(u=>u.hp>0)].filter(x=>distance(x,r)<480)
      .sort((a,b)=>distance(a,r)-distance(b,r));
     const target=candidates[0]||center;
     if(distance(r,target)>120)move(r,target,100,dt,p);
     else if(r.cooldown<=0&&target!==center&&nav.clear(r,target,p)){
      target.hp=Math.max(0,target.hp-9);r.cooldown=1.35;
     }
    }
    if(p.hp<=0){abort();p.hp=100;p.x=W.commons.x;p.y=W.commons.y;p.input={x:0,y:0};p.fireHeld=false;return;}
    if(raid.remaining===0){
     raid.status='complete';raid.earned++;raid.cooldown=45;raiders.length=0;
     if(Number.isSafeInteger(p.xp)&&p.xp<=999999875)p.xp+=125;
     if(Number.isSafeInteger(p.credits)&&p.credits<=999905)p.credits+=95;
    }
   }
   function snapshot(){return {crew:crew.map(u=>({id:u.id,role:u.role,mode:u.mode,x:u.x,y:u.y,hp:u.hp,maxHp:u.maxHp,kills:u.kills})),
    raiders:raid.status==='active'?raiders.filter(r=>r.alive).map(r=>({id:r.id,x:r.x,y:r.y,hp:r.hp,maxHp:r.maxHp})):[],
    raid:{...raid}};}
   return Object.freeze({hire,order,start,hit,tick,snapshot,crew,raiders,raid,abort});
  }
  return Object.freeze({session,center});
 }
 root.CityWorld2Defense=Object.freeze({create});
})(typeof window==='undefined'?globalThis:window);
