/* Meme City quarter-voxel first-person movement.
 * One player is 7.2 x 0.25m tall. Simple heightfield step collision, gravity
 * and jumping: NOT full solid voxel/cave-interior collision or swim physics.
 * Pure deterministic controller, independent of WebGL and the legacy save.
 */
'use strict';
(function(root){
 const GRAVITY=42,JUMP_SPEED=18,MAX_STEP=2.2,RADIUS=.27,SPEED=15;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 // Reuse the same capsule-footprint offsets for floor, cave and roof queries.
 // Avoid rebuilding offset arrays during every swept movement segment.
 const FOOTPRINT=Object.freeze([[0,0],[RADIUS,RADIUS],[-RADIUS,RADIUS],[RADIUS,-RADIUS],[-RADIUS,-RADIUS]].map(pair=>Object.freeze(pair)));
 function createController(world,start){
  if(!world?.surfaceAt||!Number.isFinite(start?.x)||!Number.isFinite(start?.z))
   throw Error('Voxel world and finite player coordinates required');
  function floorAt(x,z,referenceY=Infinity){
   if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>999900||Math.abs(z)>999900)return null;
   let top=-Infinity;
   for(const [ox,oz] of FOOTPRINT){
    const bx=Math.floor(x+ox),bz=Math.floor(z+oz);
    surfaceQueries++;
    const col=world.surfaceAt(bx,bz);
    if(!col)return null;
    let height=col.height+1;
    // Caves share world coordinates with the terrain. The roof stays solid
    // until the player reaches an open mouth or is already below the roof.
    const gallery=caveAt(bx,bz);
    if(gallery&&(gallery.exposed||referenceY<gallery.ceiling)){
     height=gallery.floor;
    }
    top=Math.max(top,height);
   }
   return top;
  }
  // Counters must exist before spawn sampling invokes floorAt().
  let surfaceQueries=0, caveQueries=0, obstructionQueries=0;
  const requestedY=Number.isFinite(start.y)?start.y:Infinity;
  const initial=floorAt(start.x,start.z,requestedY);
  if(initial===null)throw Error('Spawn outside supported world');
  const state={x:start.x,z:start.z,y:initial,vy:0,grounded:true};
  function snapshot(){return Object.freeze({...state});}
  let accumulator=0;
  function obstructed(x,y,z){
   if(typeof world.gateRoad?.obstructs!=='function')return false;
   obstructionQueries++;
   return !!world.gateRoad.obstructs(x,y,z,world.PLAYER_HEIGHT,RADIUS);
  }
  function caveAt(x,z){
   if(typeof world.caveRoomAt!=='function')return null;
   caveQueries++;
   return world.caveRoomAt(x,z);
  }
  function teleport(x,z,referenceY=Infinity){
   const floor=floorAt(x,z,referenceY);
   if(floor===null)return false;
   // A destination must be clear before committing the teleport. Failed
   // transitions leave position, velocity and grounded state untouched.
   if(obstructed(x,floor,z))return false;
   for(const [ox,oz] of FOOTPRINT){
    const gallery=caveAt(Math.floor(x+ox),Math.floor(z+oz));
    if(gallery&&!gallery.exposed&&floor<gallery.ceiling&&floor+world.PLAYER_HEIGHT>gallery.ceiling)return false;
   }
   state.x=x;state.z=z;state.y=floor;state.vy=0;state.grounded=true;
   // A successful world transition starts a new simulation timeline.
   // Do not replay a partial movement frame at the destination.
   accumulator=0;
   return true;
  }
  function moveAxis(axis,delta){
   // Sweep in quarter-voxel increments so a fast mobile frame cannot tunnel
   // through a one-cell wall or cave boundary between endpoint samples.
   const segments=Math.max(1,Math.ceil(Math.abs(delta)/.25));
   const part=delta/segments;
   let moved=false;
   for(let i=0;i<segments;i++){
    const nx=axis==='x'?state.x+part:state.x;
    const nz=axis==='z'?state.z+part:state.z;
    const floor=floorAt(nx,nz,state.y);
    if(floor===null||obstructed(nx,Math.max(state.y,floor),nz))break;
    const climb=floor-state.y;
    if(climb>(state.grounded?MAX_STEP:.18))break;
    // Sample the player's radius, not just the center. A gallery with a
    // solid roof must fit the entire player before entering it laterally.
     let blocked=false;
    for(const [ox,oz] of FOOTPRINT){
     const gallery=caveAt(Math.floor(nx+ox),Math.floor(nz+oz));
     if(gallery&&!gallery.exposed&&Math.max(state.y,floor)<gallery.ceiling&&Math.max(state.y,floor)+world.PLAYER_HEIGHT>gallery.ceiling){
      blocked=true;break;
     }
    }
    if(blocked)break;
    if(axis==='x')state.x=nx;else state.z=nz;
    if(state.grounded&&climb>0)state.y=floor;
    moved=true;
   }
   return moved;
  }
  function tick(input,dt){
   if(!Number.isFinite(dt)||dt<0)throw Error('Invalid time step');
   const step=clamp(dt,0,.05);
   let vx=clamp(Number(input?.right)||0,-1,1),vz=clamp(Number(input?.forward)||0,-1,1);
   const len=Math.hypot(vx,vz);
   if(len>1){vx/=len;vz/=len;}
   const yaw=Number.isFinite(input?.yaw)?input.yaw:0;
   const rightX=Math.cos(yaw),rightZ=-Math.sin(yaw);
   const forwardX=Math.sin(yaw),forwardZ=Math.cos(yaw);
   // Include the direct water/feet sample in the same surface-query budget as swept collision.
   surfaceQueries++;
   const feet=world.surfaceAt(Math.floor(state.x),Math.floor(state.z));
   // Optional water-volume query allows submerged cave pools without
   // treating dry terrain below sea level as water. Legacy worlds without
   // this query retain the previous sea-level behavior.
   const water=typeof world.isWaterAt==='function'
    ? !!world.isWaterAt(state.x,state.y+world.PLAYER_HEIGHT*.5,state.z)
    : !!feet&&state.y<world.SEA_LEVEL;
   const speed=SPEED*(water?.62:1);
   const dx=(vx*rightX+vz*forwardX)*speed*step;
   const dz=(vx*rightZ+vz*forwardZ)*speed*step;
   // Two-axis sweep permits sliding along terrain walls.
   moveAxis('x',dx);moveAxis('z',dz);
   if(input?.jump&&state.grounded){state.grounded=false;state.vy=JUMP_SPEED;}
   // Swimming is deliberately opt-in: an explicit water-volume query enables
   // controlled ascent, reduced gravity and terminal sinking velocity.
   // This avoids changing legacy below-sea-level terrain behavior.
   const swimming=water&&typeof world.isWaterAt==='function';
   // Remember the starting feet height for swept roof collision. Testing
   // only the destination can miss a thin ceiling during a fast ascent.
   const previousY=state.y;
   if(swimming){
    state.grounded=false;
    state.vy=clamp(state.vy+(input?.jump?14:-4)*step,-3,5);
    state.y+=state.vy*step;
   }else if(!state.grounded){
    state.vy=Math.max(-40,state.vy-GRAVITY*step);
    state.y+=state.vy*step;
   }
   // A solid underground roof cannot be jumped through. Leave roofless
   // mouth tiles open so the transition is continuous with the outside.
   // Check all capsule footprint corners when rising beneath a cave roof.
   // The center alone can miss an adjacent lower roof while the head clips
   // through it. Do not constrain a player already standing on the surface.
   if(state.vy>0&&typeof world.caveRoomAt==='function'){
    let ceiling=Infinity;
    for(const [ox,oz] of FOOTPRINT){
     const gallery=caveAt(Math.floor(state.x+ox),Math.floor(state.z+oz));
     if(gallery&&!gallery.exposed&&Number.isFinite(gallery.ceiling)){
      const roof=gallery.ceiling;
      const crossedFromBelow=previousY<roof
       &&previousY+world.PLAYER_HEIGHT<=roof
       &&state.y+world.PLAYER_HEIGHT>roof;
      const overlappingFromBelow=previousY<roof
       &&state.y<roof&&state.y+world.PLAYER_HEIGHT>roof;
      if(crossedFromBelow||overlappingFromBelow)
       ceiling=Math.min(ceiling,roof);
     }
    }
    if(ceiling<Infinity){state.y=ceiling-world.PLAYER_HEIGHT;state.vy=0;}
   }
   const floor=floorAt(state.x,state.z,state.y);
   if(floor!==null&&state.y<=floor){state.y=floor;state.vy=0;state.grounded=true;}
   else if(floor!==null&&state.y>floor+.01)state.grounded=false;
   return snapshot();
  }
  // Frame-facing fixed-step adapter. Physics is advanced in bounded, equal
  // increments rather than feeding variable render deltas into tick().
  // Excess wall-clock time is intentionally dropped after a stall; this
  // prevents a backgrounded mobile tab from simulating seconds of catch-up.
  const FIXED_DT=1/60,MAX_FRAME_DT=.1,MAX_SUBSTEPS=6;
  function tickFrame(input,elapsedSeconds){
   if(!Number.isFinite(elapsedSeconds)||elapsedSeconds<0)throw Error('Invalid frame time');
   const beforeSurface=surfaceQueries,beforeCave=caveQueries,beforeObstructions=obstructionQueries;
   const admittedSeconds=Math.min(elapsedSeconds,MAX_FRAME_DT);
   const droppedFromFrame=elapsedSeconds-admittedSeconds;
   accumulator+=admittedSeconds;
   let steps=0;
   while(accumulator+1e-10>=FIXED_DT&&steps<MAX_SUBSTEPS){
    tick(input,FIXED_DT);
    accumulator-=FIXED_DT;
    steps++;
   }
   let droppedFromCatchup=0;
   if(steps===MAX_SUBSTEPS&&accumulator>=FIXED_DT){
    const retained=accumulator%FIXED_DT;
    droppedFromCatchup=accumulator-retained;
    accumulator=retained;
   }
   // Per-frame counters expose bounded simulation work to the QA profiler.
   // These are telemetry only: render LOD never changes collision or time step.
   return Object.freeze({state:snapshot(),steps,alpha:clamp(accumulator/FIXED_DT,0,1),
    simulatedSeconds:steps*FIXED_DT,
    droppedSeconds:droppedFromFrame+droppedFromCatchup,
    surfaceQueries:surfaceQueries-beforeSurface,caveQueries:caveQueries-beforeCave,
    obstructionQueries:obstructionQueries-beforeObstructions});
  }
  return Object.freeze({tick,tickFrame,snapshot,teleport,floorAt,
   FIXED_DT,MAX_SUBSTEPS,GRAVITY,JUMP_SPEED,MAX_STEP,PLAYER_HEIGHT:world.PLAYER_HEIGHT});
 }
 root.CityVoxelPhysics=Object.freeze({createController,GRAVITY,JUMP_SPEED,MAX_STEP});
})(typeof window==='undefined'?globalThis:window);
