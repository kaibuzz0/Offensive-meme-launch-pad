/* Read-only, in-game WebGL camera mirror for the original single World V1.
 * The existing Canvas game remains authoritative for movement, aim and saves.
 * No new world engine, player controls, timers or network requests.
 */
'use strict';
(function(root){
 const MAX_FPS=12,REBASING_DISTANCE=540;
 function create(options){
  const {graphics,canvas,container,status,buildings,biomes,frontier,
   getPlayer,getAim,getColor,isVisible}=options||{};
  if(!graphics?.createWorldScene||!graphics?.createPreview||!graphics?.samplePlayerCamera||
    !canvas||!container||!status||typeof getPlayer!=='function'||
    typeof getAim!=='function'||typeof getColor!=='function'||typeof isVisible!=='function')
   throw Error('Live 3D requires game view, read-only state providers and the graphics module');
  let enabled=false,mode='third',preview=null,scene=null,anchor=null,regionId=null;
  let lastDraw=-Infinity,lastPosition=null,phase=0,draws=0,rebases=0,reason='';
  const currentRegion=p=>frontier?.regionAt?.(p.x,p.y)?.id||biomes?.regionAt?.(p.x,p.y)?.id||null;
  const canView=p=>p&&!p.room&&Number.isFinite(p.x)&&Number.isFinite(p.y);
  const fail=message=>{reason=message;status.textContent=message;return false;};
  function release(){
   if(preview){preview.destroy();preview=null;}
   scene=null;anchor=null;regionId=null;lastPosition=null;
  }
  function rebase(player){
   const candidate=graphics.createWorldScene(buildings,{x:player.x,y:player.y},biomes,frontier);
   if(!candidate)return fail('No local World V1 geometry available for 3D preview.');
   const next=graphics.createPreview(canvas,getColor(player),candidate);
   if(!next?.supported){next?.destroy?.();return fail('3D unavailable on this device. The original 2D game still works.');}
   if(preview)preview.destroy();
   preview=next;scene=candidate;anchor={x:player.x,y:player.y};
   regionId=currentRegion(player);rebases++;return true;
  }
  function tick(now){
   if(!enabled||!isVisible())return false;
   if(!Number.isFinite(now)||now-lastDraw<1000/MAX_FPS)return false;
   const player=getPlayer(),aim=getAim();
   if(!canView(player))return fail('Live 3D mirror currently supports outside streets only.');
   if(!aim||!Number.isFinite(aim.x)||!Number.isFinite(aim.y)||Math.hypot(aim.x,aim.y)<1e-6)
    return fail('Game aim is unavailable; retaining the original 2D view.');
   const region=currentRegion(player);
   if(!preview||!anchor||Math.hypot(player.x-anchor.x,player.y-anchor.y)>REBASING_DISTANCE||
       (region!==regionId&&region!==null)){
    if(!rebase(player))return false;
   }
   if(lastPosition){
    const distance=Math.hypot(player.x-lastPosition.x,player.y-lastPosition.y);
    if(Number.isFinite(distance)&&distance>.2&&distance<400)
     phase=(phase+Math.min(1.5,distance/80))%10000;
   }
   const pose=graphics.samplePlayerCamera(scene,player,aim,phase);
   if(!pose||!preview.observePlayer(player,aim,phase)){
    // Camera may leave a nearby landmark's footprint bounds without crossing
    // the streaming threshold. Rebase once to the real player locality.
    if(!rebase(player)||!preview.observePlayer(player,aim,phase))
     return fail('3D view paused outside this sampled neighborhood.');
   }
   if(!preview.draw(mode,getColor(player)))return fail('3D preview stopped; the 2D game still works.');
   lastPosition={x:player.x,y:player.y};lastDraw=now;draws++;
   const seen=preview.observed?.()||pose;
   status.textContent='LIVE 3D / '+(mode==='third'?'third-person':'first-person')+
    ' / X '+Math.round(seen.world.x)+' · Y '+Math.round(seen.world.y)+
    ' / read-only mirror';
   container.dataset.worldX=String(Math.round(seen.world.x));
   container.dataset.worldY=String(Math.round(seen.world.y));
   container.dataset.mode=mode;container.dataset.frames=String(draws);
   reason='';return true;
  }
  function start(){
   if(enabled)return true;
   if(!isVisible())return fail('Enter the game and close menus before enabling live 3D.');
   const player=getPlayer();
   if(!canView(player))return fail('Live 3D is available outside buildings.');
   if(!rebase(player))return false;
   enabled=true;container.hidden=false;lastDraw=-Infinity;lastPosition=null;
   return true;
  }
  function stop(){
   if(!enabled&&!preview)return false;
   enabled=false;release();container.hidden=true;lastDraw=-Infinity;
   status.textContent='Live 3D off';return true;
  }
  function setMode(next){
   if(next!=='first'&&next!=='third')return false;
   mode=next;lastDraw=-Infinity;return true;
  }
  const stats=()=>Object.freeze({enabled,mode,draws,rebases,phase,reason,
   preview:preview?.stats?.()||null});
  container.hidden=true;
  return Object.freeze({start,stop,tick,setMode,stats,destroy:stop});
 }
 root.CityLive3D=Object.freeze({create,MAX_FPS,REBASING_DISTANCE});
})(typeof window!=='undefined'?window:globalThis);
