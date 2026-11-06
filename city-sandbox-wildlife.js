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
  if(/forest|jungle|wood|grove|taiga|evergreen|tropical|fungal/.test(name))return 'forest';
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
 // Terrain adapter: reads existing voxel surface columns without changing seeds,
 // cave layouts, chunk caches, saves, or rendering. Coordinates stay in voxels.
 const AQUATIC=new Set(['fish']);
 const AERIAL=new Set(['songbird','hawk','owl','eagle','duck','seabird','bat']);
 function spawnChunkOnTerrain(world,chunkX,chunkZ,options={}){
  if(!world||typeof world.surfaceAt!=='function'||!Number.isSafeInteger(world.seed))
   throw TypeError('Seeded voxel world with surfaceAt required');
  if(world.CHUNK_SIZE!==CHUNK_SIZE)throw RangeError('Wildlife and terrain chunk sizes differ');
  const centerX=chunkX*CHUNK_SIZE+Math.floor(CHUNK_SIZE/2);
  const centerZ=chunkZ*CHUNK_SIZE+Math.floor(CHUNK_SIZE/2);
  const center=world.surfaceAt(centerX,centerZ);
  if(!center)return [];
  const biome={group:center.group,name:center.biomeName};
  const candidates=spawnChunk(world.seed,chunkX,chunkZ,biome,options);
  const placed=[];
  for(const animal of candidates){
   const x=Math.floor(animal.x),z=Math.floor(animal.z),col=world.surfaceAt(x,z);
   if(!col||!Number.isSafeInteger(col.height)||col.mouth||col.sinkhole)continue;
   const aquatic=AQUATIC.has(animal.species);
   // Rivers can host fish even where the atlas's biome is not a river biome.
   // Do not place land animals underwater, fish on dry land, or ground
   // creatures on near-vertical slopes.
   const wet=!!col.water||!!col.river;
   const aerial=AERIAL.has(animal.species);
   // Flying species can traverse water and steep terrain; ground species
   // cannot. Fish require actual water and a finite water surface above bed.
   if(aquatic?!wet:!aerial&&(wet||col.slope>18))continue;
   const waterTop=Number.isFinite(col.waterLevel)?col.waterLevel:world.SEA_LEVEL;
   if(aquatic&&(!Number.isFinite(waterTop)||waterTop<=col.height))continue;
   const y=aquatic?Math.min(col.height+1,waterTop-0.5):
    aerial?Math.max(col.height,wet?waterTop:col.height)+4+(hash(world.seed,x,z,511)%5):col.height+1;
   if(!Number.isFinite(y))continue;
   placed.push(Object.freeze({...animal,y}));
  }
  return Object.freeze(placed);
 }
 // Bounded chunk lifecycle for the terrain renderer/integration owner. This
 // manages entity data only; the graphics owner owns rendering and bootstrap.
 function createChunkWildlifeManager(world,options={}){
  if(!world||typeof world.surfaceAt!=='function'||!Number.isSafeInteger(world.seed)||world.CHUNK_SIZE!==CHUNK_SIZE)
   throw TypeError('Compatible seeded voxel world required');
  const maxChunks=options.maxChunks??16;
  if(!Number.isInteger(maxChunks)||maxChunks<1||maxChunks>64)throw RangeError('maxChunks must be 1..64');
  const active=new Map();
  const key=(cx,cz)=>cx+':'+cz;
  const validate=(cx,cz)=>{
   if(!Number.isSafeInteger(cx)||!Number.isSafeInteger(cz))throw TypeError('Safe integer chunk coordinates required');
  };
  function enter(cx,cz){
   validate(cx,cz);
   const k=key(cx,cz);
   if(active.has(k))return active.get(k);
   const creatures=spawnChunkOnTerrain(world,cx,cz,options);
   if(active.size>=maxChunks)active.delete(active.keys().next().value);
   active.set(k,creatures);
   return creatures;
  }
  function leave(cx,cz){validate(cx,cz);return active.delete(key(cx,cz));}
  function sync(chunks){
   if(!Array.isArray(chunks)||chunks.length>maxChunks)throw RangeError('Visible chunks exceed wildlife budget');
   const wanted=new Set();
   for(const chunk of chunks){
    if(!chunk||!Array.isArray(chunk)||chunk.length!==2)throw TypeError('Chunk must be [cx,cz]');
    const [cx,cz]=chunk;validate(cx,cz);
    const k=key(cx,cz);
    if(wanted.has(k))throw RangeError('Duplicate visible chunk');
    wanted.add(k);
   }
   for(const k of active.keys())if(!wanted.has(k))active.delete(k);
   for(const [cx,cz] of chunks)enter(cx,cz);
   return snapshot();
  }
  function snapshot(){
   return Object.freeze(Array.from(active.values()).flat());
  }
  return Object.freeze({enter,leave,sync,snapshot,activeChunks:()=>active.size,
   clear:()=>active.clear()});
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
 const api=Object.freeze({CHUNK_SIZE,MAX_PER_CHUNK,HABITATS,habitatFor,spawnChunk,spawnChunkOnTerrain,createChunkWildlifeManager,cappedFlockStep});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.CitySandboxWildlife=api;
})(typeof globalThis!=='undefined'?globalThis:this);
