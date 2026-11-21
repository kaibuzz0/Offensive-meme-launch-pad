/* Meme City quarter-voxel first-person movement.
 * One player is 7.2 x 0.25m tall. Simple heightfield step collision, gravity
 * and jumping: NOT full solid voxel/cave-interior collision or swim physics.
 * Pure deterministic controller, independent of WebGL and the legacy save.
 */
'use strict';
(function(root){
 const GRAVITY=42,JUMP_SPEED=18,MAX_STEP=2.2,RADIUS=.27,SPEED=15;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function createController(world,start){
  if(typeof world?.surfaceAt!=='function'||!Number.isFinite(start?.x)||!Number.isFinite(start?.z))
   throw Error('Voxel world and finite player coordinates required');
  if(!Number.isFinite(world.PLAYER_HEIGHT)||world.PLAYER_HEIGHT<=0)
   throw Error('Finite positive player collision height required');
  // Per-tick physics query counts, independent of visual detail.
  let lastWork=Object.freeze({surfaceQueries:0,caveQueries:0,structuralQueries:0,editQueries:0,waterQueries:0,sweepSegments:0,requestedSeconds:0,simulatedSeconds:0,discardedSeconds:0,failed:false});
  let work=null;
  function floorAt(x,z,referenceY=Infinity){
   if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>999900||Math.abs(z)>999900)return null;
   const samples=[[0,0],[RADIUS,RADIUS],[-RADIUS,RADIUS],[RADIUS,-RADIUS],[-RADIUS,-RADIUS]];
   let top=-Infinity;
   for(const [ox,oz] of samples){
    const bx=Math.floor(x+ox),bz=Math.floor(z+oz);
    if(work)work.surfaceQueries++;
    const col=world.surfaceAt(bx,bz);
    if(!col||!Number.isFinite(col.height))return null;
    let height=col.height+1;
    // Caves share world coordinates with the terrain. The roof stays solid
    // until the player reaches an open mouth or is already below the roof.
    if(work&&typeof world.caveRoomAt==='function')work.caveQueries++;
    const gallery=world.caveRoomAt?.(bx,bz);
    // Reject corrupt cave columns even when approaching from the surface.
    // Vehicle occupancy already enforces this invariant regardless of depth;
    // player traversal, spawn and teleport must agree on the same geometry.
    if(gallery&&(!Number.isFinite(gallery.floor)||!Number.isFinite(gallery.ceiling)
     ||gallery.ceiling<=gallery.floor))return null;
    if(gallery&&(gallery.exposed||referenceY<gallery.ceiling)){
     height=gallery.floor;
    }
    top=Math.max(top,height);
   }
   return top;
  }
  const requestedY=Number.isFinite(start.y)?start.y:Infinity;
  const initial=floorAt(start.x,start.z,requestedY);
  if(initial===null)throw Error('Spawn outside supported world');
  const state={x:start.x,z:start.z,y:initial,vy:0,grounded:true};
  function snapshot(){return Object.freeze({...state});}
  // Committed edits share the vehicle world's logical collision callback.
  // Preview meshes and render detail must never determine occupancy.
  function editBlocks(x,y,z){
   if(world.editObstructs===undefined)return false;
   if(typeof world.editObstructs!=='function')throw new TypeError('editObstructs must be a function');
   if(work)work.editQueries++;
   const blocked=world.editObstructs(x,y,z,world.PLAYER_HEIGHT,RADIUS);
   if(typeof blocked!=='boolean')throw new TypeError('editObstructs must return a boolean');
   return blocked;
  }
  function structureBlocks(x,y,z){
   if(world.gateRoad?.obstructs===undefined)return false;
   if(typeof world.gateRoad.obstructs!=='function')throw new TypeError('gateRoad.obstructs must be a function');
   if(work)work.structuralQueries++;
   const blocked=world.gateRoad.obstructs(x,y,z,world.PLAYER_HEIGHT,RADIUS);
   if(typeof blocked!=='boolean')throw new TypeError('gateRoad.obstructs must return a boolean');
   return blocked;
  }
  function teleport(x,z,referenceY=Infinity){
   // A save restore or fast-travel destination must obey the same static
   // collision footprint as walking. Reject invalid destinations atomically.
   const floor=floorAt(x,z,referenceY);
   if(floor===null||!Number.isFinite(floor))return false;
   if(structureBlocks(x,floor,z))return false;
   if(editBlocks(x,floor,z))return false;
   for(const [ox,oz] of [[0,0],[RADIUS,RADIUS],[-RADIUS,RADIUS],[RADIUS,-RADIUS],[-RADIUS,-RADIUS]]){
    const gallery=world.caveRoomAt?.(Math.floor(x+ox),Math.floor(z+oz));
    if(gallery&&!gallery.exposed&&floor<gallery.ceiling
     &&floor+world.PLAYER_HEIGHT>gallery.ceiling)return false;
   }
   state.x=x;state.z=z;state.y=floor;state.vy=0;state.grounded=true;
   return true;
  }
  function moveAxis(axis,delta){
   // Sweep in quarter-voxel increments so a fast mobile frame cannot tunnel
   // through a one-cell wall or cave boundary between endpoint samples.
   const segments=Math.max(1,Math.ceil(Math.abs(delta)/.25));
   const part=delta/segments;
   let moved=false;
   for(let i=0;i<segments;i++){
    if(work)work.sweepSegments++;
    const nx=axis==='x'?state.x+part:state.x;
    const nz=axis==='z'?state.z+part:state.z;
    const floor=floorAt(nx,nz,state.y);
    if(floor===null)break;
    if(structureBlocks(nx,Math.max(state.y,floor),nz))break;
    if(editBlocks(nx,Math.max(state.y,floor),nz))break;
    const climb=floor-state.y;
    if(climb>(state.grounded?MAX_STEP:.18))break;
    // Sample the player's radius, not just the center. A gallery with a
    // solid roof must fit the entire player before entering it laterally.
    const samples=[[0,0],[RADIUS,RADIUS],[-RADIUS,RADIUS],[RADIUS,-RADIUS],[-RADIUS,-RADIUS]];
    let blocked=false;
    for(const [ox,oz] of samples){
     if(work&&typeof world.caveRoomAt==='function')work.caveQueries++;
     const gallery=world.caveRoomAt?.(Math.floor(nx+ox),Math.floor(nz+oz));
     if(gallery&&!gallery.exposed&&Math.max(state.y,floor)<gallery.ceiling
      &&Math.max(state.y,floor)+world.PLAYER_HEIGHT>gallery.ceiling){
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
   work={surfaceQueries:0,caveQueries:0,structuralQueries:0,editQueries:0,waterQueries:0,sweepSegments:0};
   let failed=true;
   // A late collision-query exception must not retain movement from an earlier axis.
   const before={...state};
   try {
   const step=clamp(dt,0,.05);
   // Expose simulation time discarded by the bounded catch-up clamp.
   // These are diagnostics, not a substitute for a shared fixed-step loop.
   work.requestedSeconds=dt;
   work.simulatedSeconds=step;
   work.discardedSeconds=dt-step;
   const finiteAxis=value=>typeof value==='number'&&Number.isFinite(value)?clamp(value,-1,1):0;
   let vx=finiteAxis(input?.right),vz=finiteAxis(input?.forward);
   const len=Math.hypot(vx,vz);
   if(len>1){vx/=len;vz/=len;}
   const yaw=typeof input?.yaw==='number'&&Number.isFinite(input.yaw)?input.yaw:0;
   const rightX=Math.cos(yaw),rightZ=-Math.sin(yaw);
   const forwardX=Math.sin(yaw),forwardZ=Math.cos(yaw);
   // Count the direct water/feet surface probe as well as floorAt samples.
   if(work)work.surfaceQueries++;
   const feet=world.surfaceAt(Math.floor(state.x),Math.floor(state.z));
   // Optional water-volume query allows submerged cave pools without
   // treating dry terrain below sea level as water. Legacy worlds without
   // this query retain the previous sea-level behavior.
   if(work&&typeof world.isWaterAt==='function')work.waterQueries++;
   const water=typeof world.isWaterAt==='function'
    ? !!world.isWaterAt(state.x,state.y+world.PLAYER_HEIGHT*.5,state.z)
    : !!feet&&state.y<world.SEA_LEVEL;
   const speed=SPEED*(water?.62:1);
   const dx=(vx*rightX+vz*forwardX)*speed*step;
   const dz=(vx*rightZ+vz*forwardZ)*speed*step;
   // Two-axis sweep permits sliding along terrain walls.
   moveAxis('x',dx);moveAxis('z',dz);
   if(input?.jump===true&&state.grounded){state.grounded=false;state.vy=JUMP_SPEED;}
   // Swimming is deliberately opt-in: an explicit water-volume query enables
   // controlled ascent, reduced gravity and terminal sinking velocity.
   // This avoids changing legacy below-sea-level terrain behavior.
   const swimming=water&&typeof world.isWaterAt==='function';
   // Remember the starting feet height for swept roof collision. Testing
   // only the destination can miss a thin ceiling during a fast ascent.
   const previousY=state.y;
   if(swimming){
    state.grounded=false;
    state.vy=clamp(state.vy+(input?.jump===true?14:-4)*step,-3,5);
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
    for(const [ox,oz] of [[0,0],[RADIUS,RADIUS],[-RADIUS,RADIUS],[RADIUS,-RADIUS],[-RADIUS,-RADIUS]]){
     if(work)work.caveQueries++;
     const gallery=world.caveRoomAt(Math.floor(state.x+ox),Math.floor(state.z+oz));
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
   const result=snapshot();
   failed=false;
   return result;
   } catch(error) {
    Object.assign(state,before);
    throw error;
   } finally {
    lastWork=Object.freeze({...work,failed});
    work=null;
   }
  }
  // Frame scheduler for the canonical runtime. All gameplay bodies can be
  // stepped from the same fixed cadence; rendering detail never changes it.
  // A bounded backlog prevents an inactive browser tab from causing a spiral.
  const FIXED_DT=1/60, MAX_FRAME_DT=.25, MAX_SUBSTEPS=4;
  let accumulator=0;
  function tickFrame(input,elapsedSeconds){
   if(!Number.isFinite(elapsedSeconds)||elapsedSeconds<0)
    throw Error('Invalid frame time');
   const accepted=Math.min(elapsedSeconds,MAX_FRAME_DT);
   const discardedInput=elapsedSeconds-accepted;
   // A failing world query must not leave a partially advanced frame behind.
   // Preserve the accumulator and player pose until every substep succeeds.
   const beforeFrame={...state};
   const beforeAccumulator=accumulator;
   const beforeProfile=lastWork;
   accumulator+=accepted;
   let steps=0;
   const totals={surfaceQueries:0,caveQueries:0,structuralQueries:0,editQueries:0,waterQueries:0,sweepSegments:0};
   try {
    while(accumulator+1e-10>=FIXED_DT&&steps<MAX_SUBSTEPS){
     tick(input,FIXED_DT);
     const work=profileLastTick();
     for(const key of Object.keys(totals))totals[key]+=work[key];
     accumulator=Math.max(0,accumulator-FIXED_DT);
     steps++;
    }
   } catch(error) {
    Object.assign(state,beforeFrame);
    accumulator=beforeAccumulator;
    lastWork=beforeProfile;
    throw error;
   }
   // Discard ALL unprocessed whole steps after the bounded catch-up.
   // Retaining a full step here would advance the world on a zero-delta frame.
   const wholeBacklogSteps=Math.floor((accumulator+1e-10)/FIXED_DT);
   const droppedBacklog=wholeBacklogSteps*FIXED_DT;
   if(wholeBacklogSteps>0)accumulator=Math.max(0,accumulator-droppedBacklog);
   return Object.freeze({state:snapshot(),steps,alpha:Math.min(1,accumulator/FIXED_DT),
    simulatedSeconds:steps*FIXED_DT,discardedSeconds:discardedInput+droppedBacklog,
    activeBodies:1,...totals});
  }
  function profileLastTick(){return lastWork;}
  return Object.freeze({tick,tickFrame,snapshot,teleport,floorAt,profileLastTick,
   FIXED_DT,MAX_SUBSTEPS,
   GRAVITY,JUMP_SPEED,MAX_STEP,PLAYER_HEIGHT:world.PLAYER_HEIGHT});
 }
 root.CityVoxelPhysics=Object.freeze({createController,GRAVITY,JUMP_SPEED,MAX_STEP});
})(typeof window==='undefined'?globalThis:window);
