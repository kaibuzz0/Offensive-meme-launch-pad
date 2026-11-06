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
  if(!world?.surfaceAt||!Number.isFinite(start?.x)||!Number.isFinite(start?.z))
   throw Error('Voxel world and finite player coordinates required');
  function floorAt(x,z,referenceY=Infinity){
   if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>999900||Math.abs(z)>999900)return null;
   const samples=[[0,0],[RADIUS,RADIUS],[-RADIUS,RADIUS],[RADIUS,-RADIUS],[-RADIUS,-RADIUS]];
   let top=-Infinity;
   for(const [ox,oz] of samples){
    const bx=Math.floor(x+ox),bz=Math.floor(z+oz);
    const col=world.surfaceAt(bx,bz);
    if(!col)return null;
    let height=col.height+1;
    // Caves share world coordinates with the terrain. The roof stays solid
    // until the player reaches an open mouth or is already below the roof.
    const gallery=world.caveRoomAt?.(bx,bz);
    if(gallery&&(gallery.exposed||referenceY<=gallery.ceiling-1)){
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
  function teleport(x,z,referenceY=Infinity){
   const floor=floorAt(x,z,referenceY);
   if(floor===null)return false;
   state.x=x;state.z=z;state.y=floor;state.vy=0;state.grounded=true;
   return true;
  }
  function moveAxis(axis,delta){
   const nx=axis==='x'?state.x+delta:state.x;
   const nz=axis==='z'?state.z+delta:state.z;
   const floor=floorAt(nx,nz,state.y);
   if(floor===null)return false;
   // Airborne travel may traverse a step only if the feet clear the surface.
   const climb=floor-state.y;
   if(climb>(state.grounded?MAX_STEP:.18))return false;
   if(axis==='x')state.x=nx;else state.z=nz;
   if(state.grounded&&climb>0){state.y=floor;}
   return true;
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
   const feet=world.surfaceAt(Math.floor(state.x),Math.floor(state.z));
   const water=feet&&state.y<world.SEA_LEVEL;
   const speed=SPEED*(water?.62:1);
   const dx=(vx*rightX+vz*forwardX)*speed*step;
   const dz=(vx*rightZ+vz*forwardZ)*speed*step;
   // Two-axis sweep permits sliding along terrain walls.
   moveAxis('x',dx);moveAxis('z',dz);
   if(input?.jump&&state.grounded){state.grounded=false;state.vy=JUMP_SPEED;}
   if(!state.grounded){
    state.vy=Math.max(-40,state.vy-GRAVITY*step);
    state.y+=state.vy*step;
   }
   // A solid underground roof cannot be jumped through. Leave roofless
   // mouth tiles open so the transition is continuous with the outside.
   const gallery=world.caveRoomAt?.(Math.floor(state.x),Math.floor(state.z));
   // Only collide with an underground ceiling while the player's feet are
   // inside that gallery. Surface players stand ABOVE the same cave roof;
   // applying its ceiling to them teleports them into the cave on jump.
   if(gallery&&!gallery.exposed&&state.vy>0&&state.y<gallery.ceiling&&state.y+world.PLAYER_HEIGHT>gallery.ceiling){
    state.y=gallery.ceiling-world.PLAYER_HEIGHT;
    state.vy=0;
   }
   const floor=floorAt(state.x,state.z,state.y);
   if(floor!==null&&state.y<=floor){state.y=floor;state.vy=0;state.grounded=true;}
   else if(floor!==null&&state.y>floor+.01)state.grounded=false;
   return snapshot();
  }
  return Object.freeze({tick,snapshot,teleport,floorAt,
   GRAVITY,JUMP_SPEED,MAX_STEP,PLAYER_HEIGHT:world.PLAYER_HEIGHT});
 }
 root.CityVoxelPhysics=Object.freeze({createController,GRAVITY,JUMP_SPEED,MAX_STEP});
})(typeof window==='undefined'?globalThis:window);
