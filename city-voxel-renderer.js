/* First-person WebGL1 voxel renderer for the existing Meme City canvas.
 * Face-culled height columns (one vertical quad per exposed column side),
 * bounded GPU mesh cache, no remote art, shaders or third-party code.
 * Coordinates: 1 cube = 0.25m; the player eye is 6.4 cubes above ground.
 */
'use strict';
(function(root){
 const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
 function rgb(h,s,l){
  h=((h%360)+360)%360/360;s=clamp(s/100,0,1);l=clamp(l/100,0,1);
  const f=n=>{const k=(n+h*12)%12,a=s*Math.min(l,1-l);
   return l-a*Math.max(-1,Math.min(k-3,9-k,1));};
  return [f(0),f(8),f(4)];
 }
 function quad(data,a,b,c,d,color,normal){
  for(const p of [a,b,c,a,c,d])
   data.push(p[0],p[1],p[2],color[0],color[1],color[2],normal[0],normal[1],normal[2]);
 }
 function box(data,x,y,z,w,h,d,color){
  const x1=x+w,y1=y+h,z1=z+d;
  quad(data,[x,y1,z],[x1,y1,z],[x1,y1,z1],[x,y1,z1],color,[0,1,0]);
  quad(data,[x,y,z],[x,y1,z],[x,y1,z1],[x,y,z1],color,[-1,0,0]);
  quad(data,[x1,y,z],[x1,y,z1],[x1,y1,z1],[x1,y1,z],color,[1,0,0]);
  quad(data,[x,y,z],[x1,y,z],[x1,y1,z],[x,y1,z],color,[0,0,-1]);
  quad(data,[x,y,z1],[x,y1,z1],[x1,y1,z1],[x1,y,z1],color,[0,0,1]);
 }
 function foliage(data,feature){
  const {x,y,z,type,height,color}=feature,rand=color;
  const leaf=type==='pine'?[.17,.39,.26]:
   type==='palm'?[.12,.55,.23]:type==='mushroom'?[.60,.26,.40]:[.18,.49,.25];
  const stem=[.38,.27,.16];
  if(type==='pine'||type==='tree'||type==='palm'){
   box(data,x+.37,y,z+.37,.27,height,.27,stem);
   if(type==='pine'){
    for(let i=0;i<3;i++)box(data,x-1.15+i*.4,y+height-7+i*2,z-1.15+i*.4,
      3.25-i*.8,2,3.25-i*.8,leaf);
   }else{
    box(data,x-1.1,y+height-3,z-1.1,3.2,3.2,3.2,leaf);
    box(data,x-.5,y+height-.3,z-.5,2,1.4,2,leaf);
   }
  }else if(type==='cactus'){
   box(data,x+.28,y,z+.28,.48,height,.48,[.24,.48,.25]);
   box(data,x-.42,y+height*.4,z+.30,.75,.35,.4,[.28,.54,.29]);
  }else if(type==='mushroom'){
   box(data,x+.41,y,z+.41,.18,Math.max(1,height),.18,[.72,.70,.56]);
   box(data,x-.45,y+height-.2,z-.45,1.9,.65,1.9,leaf);
  }else if(type==='crystal'){
   box(data,x+.2,y,z+.22,.55,height+1,.55,[.54,.62,.82]);
  }else if(type==='rock'){
   box(data,x+.16,y,z+.13,.8,.7+height*.15,.75,[.39,.40,.39]);
  }else{
   const stemHeight=type==='reed'?2.8:type==='shrub'?1.9:type==='flower'?1.5:1;
   const green=type==='shrub'?[.32,.42,.21]:type==='reed'?[.34,.58,.30]:[.25,.60,.26];
   const a=[x+.15,y,z+.15],b=[x+.8,y+stemHeight,z+.8],c=[x+.8,y,z+.8],d=[x+.15,y+stemHeight,z+.15];
   quad(data,a,c,b,d,green,[0,0,1]);
   quad(data,[x+.8,y,z+.15],[x+.15,y,z+.8],[x+.15,y+stemHeight,z+.8],[x+.8,y+stemHeight,z+.15],green,[1,0,0]);
   if(type==='flower'){
    const petal=rand>.65?[.95,.85,.32]:rand>.32?[.95,.46,.56]:[.61,.50,.86];
    box(data,x+.25,y+1.2,z+.25,.6,.28,.6,petal);
   }
  }
 }
 function baseColor(tile){
  const {group,height,hue,sat,light}=tile;
  if(height>=176)return rgb(207,15,89);
  if(group==='alpine'||group==='volcanic')return rgb(hue,sat*.48,clamp(light+12,20,70));
  if(group==='desert'||group==='salt')return rgb(hue,clamp(sat,15,75),clamp(light+7,22,79));
  if(group==='tundra')return rgb(199,22,height>90?80:66);
  if(group==='wetland')return rgb(96,30,37);
  return rgb(hue,clamp(sat+8,20,85),clamp(light+5,18,74));
 }
 function generateMesh(world,cx,cz){
  const chunk=world.chunkAt(cx,cz);if(!chunk)return null;
  const data=[];
  for(const tile of chunk.tiles){
   const {x,z,height:y}=tile,color=baseColor(tile);
   quad(data,[x,y+1,z],[x+1,y+1,z],[x+1,y+1,z+1],[x,y+1,z+1],color,[0,1,0]);
   const sides=[
    {n:world.surfaceAt(x-1,z),axis:'left'},
    {n:world.surfaceAt(x+1,z),axis:'right'},
    {n:world.surfaceAt(x,z-1),axis:'front'},
    {n:world.surfaceAt(x,z+1),axis:'back'}
   ];
   const shade=color.map(v=>v*.79);
   for(const side of sides){
    const low=side.n?.height??y;
    if(low>=y)continue;
    const a=low+1,b=y+1;
    if(side.axis==='left')quad(data,[x,a,z],[x,b,z],[x,b,z+1],[x,a,z+1],shade,[-1,0,0]);
    if(side.axis==='right')quad(data,[x+1,a,z],[x+1,a,z+1],[x+1,b,z+1],[x+1,b,z],shade,[1,0,0]);
    if(side.axis==='front')quad(data,[x,a,z],[x+1,a,z],[x+1,b,z],[x,b,z],shade,[0,0,-1]);
    if(side.axis==='back')quad(data,[x,a,z+1],[x,b,z+1],[x+1,b,z+1],[x+1,a,z+1],shade,[0,0,1]);
   }
   if(tile.water){
    const water=[.15,.45,.67];
    const yy=world.SEA_LEVEL+1.15;
    quad(data,[x,yy,z],[x+1,yy,z],[x+1,yy,z+1],[x,yy,z+1],water,[0,1,0]);
    // Water surface is deliberately opaque for predictable mobile depth rendering.
   }
  }
  for(const plant of chunk.plants)foliage(data,plant);
  return {data:new Float32Array(data),tiles:chunk.tiles.length,plants:chunk.plants.length,
   vertices:data.length/9};
 }
 // Procedural material grain, atmosphere and water. No external textures.
 const vertexSource='attribute vec3 aPos;attribute vec3 aColor;attribute vec3 aNormal;'+
  'uniform mat4 uMatrix;uniform vec3 uEye;varying vec3 vColor;varying float vDist;'+
  'varying vec3 vPosition;varying float vWater;'+
  'void main(){gl_Position=uMatrix*vec4(aPos,1.0);'+
  'float lit=.47+.50*max(0.0,dot(normalize(aNormal),normalize(vec3(.40,.87,.22))));'+
  'vColor=aColor*lit;vDist=distance(aPos,uEye);vPosition=aPos;'+
  'vWater=(aColor.r<.20&&aColor.g>.40&&aColor.g<.49&&aColor.b>.64)?1.0:0.0;}';
 const fragmentSource='precision mediump float;varying vec3 vColor;varying float vDist;'+
  'varying vec3 vPosition;varying float vWater;uniform float uTime;'+
  'float grain(vec3 p){return fract(sin(dot(floor(p),vec3(19.17,53.41,7.63)))*43758.5453);}'+
  'void main(){'+
  'float micro=grain(vPosition*3.0)*.13-.055;'+
  'float strata=sin(vPosition.y*.53+vPosition.x*.11)*.027;'+
  'vec3 color=vColor*(1.0+micro+strata);'+
  'if(vWater>.5){float wave=sin(vPosition.x*.81+uTime*.8)*sin(vPosition.z*.62-uTime*.7);'+
  'float sheen=pow(.5+.5*sin((vPosition.x+vPosition.z)*1.5+uTime*1.5),12.0);'+
  'color=vec3(.055,.26,.42)+vec3(.022,.087,.115)*wave+vec3(.10,.15,.15)*sheen;}'+
  'float fog=smoothstep(35.0,103.0,vDist);'+
  'gl_FragColor=vec4(mix(color,vec3(.63,.77,.88),fog),1.0);}';
 const skyVertex='attribute vec2 aXY;varying vec2 vUV;'+
  'void main(){gl_Position=vec4(aXY,0.9999,1.0);vUV=aXY*.5+.5;}';
 const skyFragment='precision mediump float;varying vec2 vUV;uniform vec2 uLook;'+
  'void main(){float y=clamp(vUV.y,0.0,1.0);'+
  'vec3 sky=mix(vec3(.75,.83,.85),vec3(.12,.35,.63),smoothstep(.1,1.0,y));'+
  'vec2 sun=vec2(.5+.5*sin(1.3-uLook.x),.68-.45*sin(uLook.y));'+
  'float halo=exp(-pow(distance(vUV,sun)*6.0,2.0));'+
  'float disc=1.0-smoothstep(.027,.049,distance(vUV,sun));'+
  'sky+=vec3(.29,.22,.11)*halo+vec3(.51,.43,.31)*disc;'+
  'gl_FragColor=vec4(min(sky,vec3(1.0)),1.0);}';
 function shader(gl,kind,source){
  const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));
  return s;
 }
 function perspective(aspect,near=.1,far=115){
  const f=1/Math.tan(77*Math.PI/360/2),a=new Float32Array(16);
  a[0]=f/aspect;a[5]=f;a[10]=(far+near)/(near-far);
  a[11]=-1;a[14]=2*far*near/(near-far);return a;
 }
 function view(eye,yaw,pitch){
  const cp=Math.cos(pitch),fx=Math.sin(yaw)*cp,fy=Math.sin(pitch),fz=Math.cos(yaw)*cp;
  const rx=Math.cos(yaw),rz=-Math.sin(yaw);
  const ux=fy*rz,uy=cp,uz=-fy*rx;
  const m=new Float32Array(16);
  m[0]=rx;m[4]=0;m[8]=rz;m[12]=-(rx*eye[0]+rz*eye[2]);
  m[1]=ux;m[5]=uy;m[9]=uz;m[13]=-(ux*eye[0]+uy*eye[1]+uz*eye[2]);
  m[2]=-fx;m[6]=-fy;m[10]=-fz;m[14]=fx*eye[0]+fy*eye[1]+fz*eye[2];
  m[15]=1;return m;
 }
 function multiply(a,b){
  const o=new Float32Array(16);
  for(let col=0;col<4;col++)for(let row=0;row<4;row++)
   for(let k=0;k<4;k++)o[col*4+row]+=a[k*4+row]*b[col*4+k];
  return o;
 }
 function createRenderer(canvas,world){
  const gl=canvas.getContext('webgl',{antialias:false,alpha:false,depth:true,
    preserveDrawingBuffer:false,powerPreference:'low-power'});
  if(!gl)return null;
  const program=gl.createProgram();
  gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,vertexSource));
  gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,fragmentSource));
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  const loc={
   pos:gl.getAttribLocation(program,'aPos'),color:gl.getAttribLocation(program,'aColor'),
   normal:gl.getAttribLocation(program,'aNormal'),matrix:gl.getUniformLocation(program,'uMatrix'),
   eye:gl.getUniformLocation(program,'uEye')
  };
  const skyProgram=gl.createProgram();
  gl.attachShader(skyProgram,shader(gl,gl.VERTEX_SHADER,skyVertex));
  gl.attachShader(skyProgram,shader(gl,gl.FRAGMENT_SHADER,skyFragment));
  gl.linkProgram(skyProgram);
  if(!gl.getProgramParameter(skyProgram,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(skyProgram));
  const skyBuffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const skyPos=gl.getAttribLocation(skyProgram,'aXY'),skyLook=gl.getUniformLocation(skyProgram,'uLook');
  const timeUniform=gl.getUniformLocation(program,'uTime');
  const chunks=new Map(),MAX_CHUNKS=49,RADIUS=3;
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  function release(key){
   const c=chunks.get(key);if(c){gl.deleteBuffer(c.buffer);chunks.delete(key);}
  }
  function dispose(){for(const key of chunks.keys())release(key);gl.deleteBuffer(skyBuffer);gl.deleteProgram(skyProgram);gl.deleteProgram(program);}
  function load(cx,cz){
   const key=cx+':'+cz;if(chunks.has(key))return;
   const mesh=generateMesh(world,cx,cz);if(!mesh)return;
   const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.bufferData(gl.ARRAY_BUFFER,mesh.data,gl.STATIC_DRAW);
   chunks.set(key,{cx,cz,buffer,vertices:mesh.vertices,bytes:mesh.data.byteLength});
  }
  function render(player){
   const rect=canvas.getBoundingClientRect();
   const dpr=Math.min(window.devicePixelRatio||1,1.5);
   const width=Math.max(2,Math.round(rect.width*dpr)),height=Math.max(2,Math.round(rect.height*dpr));
   if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
   gl.viewport(0,0,width,height);
   gl.clearColor(.63,.77,.88,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.disable(gl.DEPTH_TEST);
   gl.useProgram(skyProgram);
   gl.uniform2f(skyLook,player.yaw,player.pitch);
   gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);
   gl.enableVertexAttribArray(skyPos);
   gl.vertexAttribPointer(skyPos,2,gl.FLOAT,false,0,0);
   gl.drawArrays(gl.TRIANGLES,0,3);
   gl.disableVertexAttribArray(skyPos);
   gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);
   const px=Math.floor(player.x/16),pz=Math.floor(player.z/16),wanted=[];
   for(let dz=-RADIUS;dz<=RADIUS;dz++)for(let dx=-RADIUS;dx<=RADIUS;dx++){
    if(dx*dx+dz*dz>RADIUS*RADIUS+1)continue;
    wanted.push({cx:px+dx,cz:pz+dz,d:dx*dx+dz*dz});
   }
   wanted.sort((a,b)=>a.d-b.d);
   const targets=new Set(wanted.map(c=>c.cx+':'+c.cz));
   for(const k of chunks.keys())if(!targets.has(k))release(k);
   // Only one heavy mesh generation/upload per frame, so Android movement
   // remains interactive even when new mountain chunks enter the viewport.
   const missing=wanted.find(c=>!chunks.has(c.cx+':'+c.cz));
   if(missing)load(missing.cx,missing.cz);
   while(chunks.size>MAX_CHUNKS)release(chunks.keys().next().value);
   const eye=[player.x,player.y+world.EYE_HEIGHT,player.z];
   gl.useProgram(program);
   gl.uniform1f(timeUniform,(typeof performance!=='undefined'?performance.now():0)/1000);
   gl.uniformMatrix4fv(loc.matrix,false,multiply(perspective(width/height),view(eye,player.yaw,player.pitch)));
   gl.uniform3fv(loc.eye,eye);
   gl.enableVertexAttribArray(loc.pos);gl.enableVertexAttribArray(loc.color);gl.enableVertexAttribArray(loc.normal);
   let verts=0,bytes=0;
   for(const c of chunks.values()){
    gl.bindBuffer(gl.ARRAY_BUFFER,c.buffer);
    gl.vertexAttribPointer(loc.pos,3,gl.FLOAT,false,36,0);
    gl.vertexAttribPointer(loc.color,3,gl.FLOAT,false,36,12);
    gl.vertexAttribPointer(loc.normal,3,gl.FLOAT,false,36,24);
    gl.drawArrays(gl.TRIANGLES,0,c.vertices);
    verts+=c.vertices;bytes+=c.bytes;
   }
   return {loaded:chunks.size,wanted:wanted.length,vertices:verts,bytes,glError:gl.getError()};
  }
  return Object.freeze({gl,render,dispose,chunkCount:()=>chunks.size,meshAt:(cx,cz)=>generateMesh(world,cx,cz)});
 }
 root.CityVoxelRenderer=Object.freeze({createRenderer,generateMesh,rgb,
  VOXEL_METERS:.25,MAX_GPU_CHUNKS:49});
})(typeof window==='undefined'?globalThis:window);
