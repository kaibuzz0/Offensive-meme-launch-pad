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
  if(!Number.isSafeInteger(chunkX)||!Number.isSafeInteger(chunkZ)||!Number.isSafeInteger(seed))throw TypeError('Safe integer seed and chunk coordinates required');
  // Hashing coerces chunk coordinates to signed 32-bit integers; bound the
  // domain to prevent distant chunks aliasing IDs and populations.
  // IDs and voxel positions must remain exact; reject overflow before hashing.
  const maxChunk=Math.min(0x7fffffff,Math.floor((Number.MAX_SAFE_INTEGER-(CHUNK_SIZE-1))/CHUNK_SIZE));
  if(Math.abs(chunkX)>maxChunk||Math.abs(chunkZ)>maxChunk)throw RangeError('Chunk coordinates exceed safe voxel range');
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
  // Public generated populations are immutable just like terrain snapshots.
  // Callers must keep per-instance movement and interaction state separately.
  return Object.freeze(animals);
 }
 // Terrain adapter: reads existing voxel surface columns without changing seeds,
 // cave layouts, chunk caches, saves, or rendering. Coordinates stay in voxels.
 const AQUATIC=new Set(['fish']);
 const AMPHIBIOUS=new Set(['frog']);
 const AERIAL=new Set(['songbird','hawk','owl','eagle','duck','seabird','bat']);
 function spawnChunkOnTerrain(world,chunkX,chunkZ,options={}){
  if(!world||typeof world.surfaceAt!=='function'||!Number.isSafeInteger(world.seed))
   throw TypeError('Seeded voxel world with surfaceAt required');
  if(world.CHUNK_SIZE!==CHUNK_SIZE)throw RangeError('Wildlife and terrain chunk sizes differ');
  // Keep chunk-to-voxel arithmetic exact before any terrain query or spawn hash.
  if(!Number.isSafeInteger(chunkX)||!Number.isSafeInteger(chunkZ))
   throw TypeError('Safe integer chunk coordinates required');
  const maxChunk=Math.min(0x7fffffff,Math.floor((Number.MAX_SAFE_INTEGER-(CHUNK_SIZE-1))/CHUNK_SIZE));
  if(Math.abs(chunkX)>maxChunk||Math.abs(chunkZ)>maxChunk)
   throw RangeError('Chunk coordinates exceed safe voxel range');
  const centerX=chunkX*CHUNK_SIZE+Math.floor(CHUNK_SIZE/2);
  const centerZ=chunkZ*CHUNK_SIZE+Math.floor(CHUNK_SIZE/2);
  // Reuse each sampled terrain column within this bounded spawn pass.
  // No persistent cache: world edits remain visible on the next activation.
  const columns=new Map();
  const surface=(x,z)=>{
   const key=x+':'+z;
   if(columns.has(key))return columns.get(key);
   const value=world.surfaceAt(x,z);
   columns.set(key,value);
   return value;
  };
  const center=surface(centerX,centerZ);
  if(!center)return Object.freeze([]);
  const biome={group:center.group,name:center.biomeName};
  const candidates=spawnChunk(world.seed,chunkX,chunkZ,biome,options);
  const placed=[];
  for(const animal of candidates){
   const x=Math.floor(animal.x),z=Math.floor(animal.z),col=surface(x,z);
   if(!col||!Number.isSafeInteger(col.height)||col.mouth||col.sinkhole)continue;
   // Missing or malformed slope metadata must not place ground actors on
   // unverified terrain; aerial and aquatic actors do not require walkable grade.
   const aquatic=AQUATIC.has(animal.species);
   // Rivers can host fish even where the atlas's biome is not a river biome.
   // Do not place land animals underwater, fish on dry land, or ground
   // creatures on near-vertical slopes.
   const wet=!!col.water||!!col.river;
   const aerial=AERIAL.has(animal.species);
   const amphibious=AMPHIBIOUS.has(animal.species);
   // Water and flying actors need a valid bed elevation, but not a walkable
   // ground grade. Only terrestrial placement depends on slope metadata.
   if(!aquatic&&!aerial&&(!Number.isFinite(col.slope)||col.slope<0))continue;
   // Land fauna must belong to the habitat under their actual feet, not
   // merely the center of a chunk that may straddle a biome boundary.
   // Aerial fauna can cross boundaries; aquatic fauna follows water below.
   if(!aerial&&!aquatic&&habitatFor({group:col.group,name:col.biomeName})!==animal.habitat)continue;
   // Flying species can traverse water and steep terrain; ground species
   // cannot. Fish require actual water and a finite water surface above bed.
   if(aquatic?!wet:!aerial&&(!amphibious&&wet||col.slope>18))continue;
   const waterTop=Number.isFinite(col.waterLevel)?col.waterLevel:world.SEA_LEVEL;
   // Fish need enough water to remain above the bed and below the surface.
   if(aquatic&&(!Number.isFinite(waterTop)||waterTop-col.height<=0.5))continue;
   // Frogs use wetland banks and shallow water, never deep open water.
   if(amphibious&&wet&&(!Number.isFinite(waterTop)||waterTop-col.height>2))continue;
   const y=aquatic?Math.min(col.height+1,waterTop-0.5):
    aerial?Math.max(col.height,wet?waterTop:col.height)+4+(hash(world.seed,x,z,511)%5):
    amphibious&&wet?Math.max(col.height,waterTop)+1:col.height+1;
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
  // Immutable snapshots are read by the renderer every frame. Rebuild only
  // when chunk membership or a population descriptor actually changes.
  let cachedSnapshot=null;
  const dirty=()=>{cachedSnapshot=null;};
  const key=(cx,cz)=>cx+':'+cz;
  const validate=(cx,cz)=>{
   if(!Number.isSafeInteger(cx)||!Number.isSafeInteger(cz))throw TypeError('Safe integer chunk coordinates required');
   // Validate before cache lookup and before staging a multi-chunk sync.
   const maxChunk=Math.min(0x7fffffff,Math.floor((Number.MAX_SAFE_INTEGER-(CHUNK_SIZE-1))/CHUNK_SIZE));
   if(Math.abs(cx)>maxChunk||Math.abs(cz)>maxChunk)throw RangeError('Chunk coordinates exceed safe voxel range');
  };
  function enter(cx,cz){
   validate(cx,cz);
   const k=key(cx,cz);
   if(active.has(k)){
    // A revisited visible chunk is recent; evict the least recently used one.
    const creatures=active.get(k);
    // Map iteration would allocate a temporary array on every cache hit.
    // The most-recent key is the last insertion in this bounded LRU map.
    let newest;
    for(const candidate of active.keys())newest=candidate;
    const wasNewest=newest===k;
    active.delete(k);
    active.set(k,creatures);
    // Snapshot order follows LRU order; moving a non-tail chunk changes it.
    if(!wasNewest)dirty();
    return creatures;
   }
   const creatures=spawnChunkOnTerrain(world,cx,cz,options);
   if(active.size>=maxChunks)active.delete(active.keys().next().value);
   active.set(k,creatures);
   dirty();
   return creatures;
  }
  function leave(cx,cz){validate(cx,cz);const removed=active.delete(key(cx,cz));if(removed)dirty();return removed;}
  // Terrain edits invalidate only affected cached populations. The next enter
  // resamples edited columns; unrelated chunks retain their descriptors.
  function invalidate(cx,cz){validate(cx,cz);const removed=active.delete(key(cx,cz));if(removed)dirty();return removed;}
  // Edit pipelines report voxel coordinates, not chunk coordinates. Resolve
  // negative voxel positions with floor (not truncation) so boundary edits
  // invalidate the correct cached population without clearing neighbors.
  function invalidateAtVoxel(x,z){
   if(!Number.isSafeInteger(x)||!Number.isSafeInteger(z))
    throw TypeError('Safe integer voxel coordinates required');
   return invalidate(Math.floor(x/CHUNK_SIZE),Math.floor(z/CHUNK_SIZE));
  }
  // Accept a complete, successfully committed edit batch. Validate all inputs
  // before touching the cache so a malformed trailing edit cannot cause a
  // partial invalidation. Callers own transaction durability and ordering.
  function invalidateCommittedVoxels(edits){
   if(!Array.isArray(edits)||edits.length>4096)throw RangeError('Committed voxel edits must be an array of at most 4096');
   const affected=new Set();
   for(const edit of edits){
    if(!edit||!Number.isSafeInteger(edit.x)||!Number.isSafeInteger(edit.z))
     throw TypeError('Committed edits require safe integer x,z voxel coordinates');
    const cx=Math.floor(edit.x/CHUNK_SIZE),cz=Math.floor(edit.z/CHUNK_SIZE);
    validate(cx,cz);
    affected.add(key(cx,cz));
   }
   let removed=0;
   for(const k of affected)if(active.delete(k))removed++;
   if(removed)dirty();
   return removed;
  }
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
   // Fast path for the common per-frame sync: the requested order and all
   // active descriptors are already current. Avoid a new Map and snapshot.
   if(active.size===chunks.length){
    const previous=active.keys();
    let identical=true;
    for(const [cx,cz] of chunks){
     if(previous.next().value!==key(cx,cz)){identical=false;break;}
    }
    if(identical)return snapshot();
   }
   // Stage new chunks before changing the active set. If surfaceAt throws,
   // the previous visible wildlife stays intact instead of partially unloading.
   const staged=new Map();
   for(const [cx,cz] of chunks){
    const k=key(cx,cz);
    staged.set(k,active.has(k)?active.get(k):spawnChunkOnTerrain(world,cx,cz,options));
   }
   // A renderer may sync the same visible set every frame. Preserve the
   // immutable snapshot unless membership, ordering, or descriptors changed.
   const previousEntries=active.entries();
   // Compare the two bounded maps directly: avoid materializing a temporary
   // entries array on every visible-chunk sync.
   let unchanged=active.size===staged.size;
   if(unchanged){
    for(const [k,creatures] of staged){
     const previous=previousEntries.next().value;
     if(!previous||previous[0]!==k||previous[1]!==creatures){unchanged=false;break;}
    }
   }
   if(unchanged)return snapshot();
   active.clear();
   for(const [k,creatures] of staged)active.set(k,creatures);
   dirty();
   return snapshot();
  }
  function snapshot(){
   if(!cachedSnapshot)cachedSnapshot=Object.freeze(Array.from(active.values()).flat());
   return cachedSnapshot;
  }
  return Object.freeze({enter,leave,invalidate,invalidateAtVoxel,invalidateCommittedVoxels,sync,snapshot,activeChunks:()=>active.size,
   clear:()=>{if(active.size){active.clear();dirty();}}});
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
  // A zero-duration simulation tick must not change velocity or position.
  // Return independent descriptors so callers cannot mutate input agents.
  if(dt===0)return valid.map(a=>({...a}));
  return valid.map((a,i)=>{
   let n=0,cx=0,cz=0,vx=0,vz=0,sepX=0,sepZ=0;
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
