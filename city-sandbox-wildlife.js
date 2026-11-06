/* Meme City wildlife prototype: deterministic, bounded and engine-independent.
 * Coordinates are in world voxels. No DOM, WebGL, or persistent save mutations.
 * Spawns are computed per chunk without advancing a global random generator.
 */
'use strict';
(function(root){
 const CHUNK_SIZE=16;
 const hash=(seed,x,z,salt)=>{
  let h=((seed|0)^Math.imul(x|0,0x9e3779b1)^Math.imul(z|0,0x85ebca77)^Math.imul(salt|0,0xc2b2ae3d))|0;
  h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);
  return (h^(h>>>16))>>>0;
 };
 const rand=(seed,x,z,salt)=>hash(seed,x,z,salt)/4294967296;
 const HABITATS=Object.freeze({
  forest:Object.freeze(['songbird','deer','rabbit']),
  plains:Object.freeze(['songbird','rabbit','fox']),
  desert:Object.freeze(['lizard','hawk']),
  tundra:Object.freeze(['hare','owl']),
  mountain:Object.freeze(['eagle','goat']),
  wetland:Object.freeze(['duck','frog','fish']),
  ocean:Object.freeze(['seabird','fish']),
  river:Object.freeze(['duck','fish']),
  cave:Object.freeze(['bat'])
 });
 const MAX_PER_CHUNK=6;
 function habitatFor(biome){
  const name=String(typeof biome==='string'?biome:(biome?.group||biome?.name||biome?.id||'')).toLowerCase();
  if(/cave|underground|subterranean/.test(name))return 'cave';
  if(/ocean|sea|reef|coral/.test(name))return 'ocean';
  if(/river|stream/.test(name))return 'river';
  if(/marsh|swamp|wetland|mangrove|bog/.test(name))return 'wetland';
  if(/desert|dune|arid|badland/.test(name))return 'desert';
  if(/tundra|snow|ice|glacier|polar/.test(name))return 'tundra';
  if(/mountain|alpine|highland|peak/.test(name))return 'mountain';
  if(/forest|jungle|wood|grove|taiga/.test(name))return 'forest';
  return 'plains';
 }
 function spawnChunk(seed,chunkX,chunkZ,biome,options={}){
  if(!Number.isInteger(chunkX)||!Number.isInteger(chunkZ)||!Number.isInteger(seed))throw TypeError('Integer seed and chunk coordinates required');
  const cap=options.maxPerChunk===undefined?MAX_PER_CHUNK:options.maxPerChunk;
  if(!Number.isInteger(cap)||cap<0||cap>MAX_PER_CHUNK)throw RangeError('maxPerChunk must be 0..6');
  const habitat=habitatFor(biome),species=HABITATS[habitat];
  const count=Math.min(cap,Math.floor(rand(seed,chunkX,chunkZ,11)*(MAX_PER_CHUNK+1)));
  const animals=[];
  for(let i=0;i<count;i++){
   const kind=species[hash(seed,chunkX,chunkZ,100+i)%species.length];
   animals.push(Object.freeze({
    id:`${seed}:${chunkX}:${chunkZ}:${i}`,
    species:kind,habitat,
    x:chunkX*CHUNK_SIZE+rand(seed,chunkX,chunkZ,200+i)*CHUNK_SIZE,
    z:chunkZ*CHUNK_SIZE+rand(seed,chunkX,chunkZ,300+i)*CHUNK_SIZE,
    heading:rand(seed,chunkX,chunkZ,400+i)*Math.PI*2
   }));
  }
  return animals;
 }
 function cappedFlockStep(agents,dt,options={}){
  if(!Array.isArray(agents)||agents.length>64)throw RangeError('Flock must contain 0..64 agents');
  if(!Number.isFinite(dt)||dt<0||dt>0.1)throw RangeError('dt must be 0..0.1 seconds');
  const radius=options.radius??8, speed=options.speed??3;
  if(!Number.isFinite(radius)||radius<=0||!Number.isFinite(speed)||speed<0||speed>20)throw RangeError('Invalid flock configuration');
  const valid=agents.map(a=>{
   if(!a||![a.x,a.z,a.vx,a.vz].every(Number.isFinite))throw TypeError('Flock agents require finite x,z,vx,vz');
   return a;
  });
  return valid.map((a,i)=>{
   let n=0,cx=0,cz,vx=0,vz=0,sepX=0,sepZ=0;
   for(let j=0;j<valid.length;j++){
    if(i===j)continue;
    const b=valid[j],dx=b.x-a.x,dz=b.z-a.z,d2=dx*dx+dz*dz;
    if(d2>radius*radius||d2<1e-9)continue;
    n++;cx+=b.x;cz+=b.z;vx+=b.vx;vz+=b.vz;
    sepX-=dx/(d2+0.01);sepZ-=dz/(d2+0.01);
   }
   let ax=0,az=0;
   if(n){ax=(cx/n-a.x)*0.25+(vx/n-a.vx)*0.4+sepX*1.2;az=(cz/n-a.z)*0.25+(vz/n-a.vz)*0.4+sepZ*1.2;}
   let nx=a.vx+ax*dt,nz=a.vz+az*dt;
   const len=Math.hypot(nx,nz);
   if(len>speed){nx=nx/len*speed;nz=nz/len*speed;}
   return { ...a,x:a.x+nx*dt,z:a.z+nz*dt,vx:nx,vz:nz };
  });
 }
 const api=Object.freeze({CHUNK_SIZE,MAX_PER_CHUNK,HABITATS,habitatFor,spawnChunk,cappedFlockStep});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.CitySandboxWildlife=api;
})(typeof globalThis!=='undefined'?globalThis:this);
