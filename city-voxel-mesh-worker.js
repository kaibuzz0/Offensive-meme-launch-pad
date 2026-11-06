/* Meme City — static, same-origin voxel mesh worker.
 * Deterministic generation and face culling run away from the main thread.
 * The generated Float32Array buffer is transferred, not cloned.
 * The parent bounds requests and active GPU buffers independently.
 */
'use strict';
(function(root){
 importScripts('city-worldgen.js','city-terrain-world.js','city-voxel-world.js','city-voxel-renderer.js');
 let world=null,seed=null;
 const now=()=>typeof root.performance?.now==='function'?root.performance.now():Date.now();
 const reply=(message,transfer)=>root.postMessage(message,transfer||[]);
 root.onmessage=function(event){
  const m=event?.data||{};
  try{
   if(m.type==='init'){
    if(typeof m.seed!=='string'||m.seed.length>128||!Array.isArray(m.definitions)||
       m.definitions.length!==132)throw Error('Invalid terrain world metadata');
    const atlas=root.CityTerrainWorld.createTerrain(m.seed,m.definitions);
    world=root.CityVoxelWorld.createVoxelWorld(atlas);
    seed=m.seed;
    reply({type:'ready',seed,seedHash:world.seed,biomeCount:atlas.biomes.length});
    return;
   }
   if(m.type!=='mesh')return;
   if(!world)throw Error('Worker not initialized');
   const {cx,cz,stride,id}=m;
   if(!Number.isSafeInteger(cx)||!Number.isSafeInteger(cz)||
      Math.abs(cx)>62500||Math.abs(cz)>62500||
      (stride!==1&&stride!==4)||!Number.isSafeInteger(id)||id<1)throw Error('Invalid mesh request');
   const started=now();
   const mesh=root.CityVoxelRenderer.generateMesh(world,cx,cz,stride);
   const durationMs=Math.max(0,now()-started);
   if(!mesh||!Number.isSafeInteger(mesh.vertices)||mesh.vertices<0||mesh.vertices>650000||
      !(mesh.data instanceof Float32Array)||mesh.data.byteLength>24*1024*1024||
      mesh.data.byteOffset!==0||mesh.data.byteLength!==mesh.data.buffer.byteLength||
      mesh.data.length!==mesh.vertices*9||
      !Number.isSafeInteger(mesh.tiles)||mesh.tiles<0||
      !Number.isSafeInteger(mesh.plants)||mesh.plants<0)throw Error('Invalid mesh geometry or metadata');
   reply({type:'mesh',id,cx,cz,stride,seedHash:world.seed,
    vertices:mesh.vertices,tiles:mesh.tiles,plants:mesh.plants,
    durationMs,byteLength:mesh.data.byteLength,
    buffer:mesh.data.buffer},[mesh.data.buffer]);
  }catch(err){
   reply({type:'error',id:Number.isSafeInteger(m.id)?m.id:null,
    message:err instanceof Error?err.message:'Mesh generation failed'});
  }
 };
})(typeof self==='undefined'?globalThis:self);
