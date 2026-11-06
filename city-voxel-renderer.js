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
 function triangle(data,a,b,c,color,normal){
  for(const p of [a,b,c])
   data.push(p[0],p[1],p[2],color[0],color[1],color[2],normal[0],normal[1],normal[2]);
 }
 // Eight-sided non-rectangular canopies, faceted leaf color and tapered crowns.
 function canopy(data,x,y,z,rx,ry,rz,color,seed=0){
  const slices=8;
  for(let i=0;i<slices;i++){
   const a=i*Math.PI*2/slices,b=(i+1)*Math.PI*2/slices;
   const x1=x+Math.cos(a)*rx,z1=z+Math.sin(a)*rz;
   const x2=x+Math.cos(b)*rx,z2=z+Math.sin(b)*rz;
   const variation=.87+(((i*13+Math.floor(seed*100))%7)/35);
   const tint=color.map(v=>Math.min(1,v*variation));
   const n=[Math.cos((a+b)/2),.48,Math.sin((a+b)/2)];
   triangle(data,[x,y+ry,z],[x1,y,z1],[x2,y,z2],tint,n);
   triangle(data,[x,y-ry*.65,z],[x2,y,z2],[x1,y,z1],tint,[n[0],-.54,n[2]]);
  }
 }
 function foliage(data,feature){
  const {x,y,z,type,height,color}=feature,r=color;
  const green=type==='pine'?[.15,.34,.24]:
   type==='palm'?[.16,.43,.21]:type==='mushroom'?[.48,.23,.32]:
   r>.55?[.18,.45,.20]:[.16,.38,.21];
  const stem=[.33,.25,.15];
  if(type==='pine'){
   const tall=height+4;
   box(data,x+.36,y,z+.36,.28,tall,.28,stem);
   for(let i=0;i<4;i++){
    const rad=2.6-i*.38;
    canopy(data,x+.5,y+3+i*2.5,z+.5,rad,2.7,rad,green,r+i);
   }
  }else if(type==='tree'){
   const tall=height+3;
   box(data,x+.34,y,z+.34,.34,tall,.34,stem);
   const leaf=green;
   canopy(data,x+.5,y+tall,z+.5,3.3,2.8,2.9,leaf,r);
   canopy(data,x-1,y+tall-1.4,z+.2,2.1,2.3,2.3,leaf.map(v=>v*.89),r+.1);
   canopy(data,x+1.75,y+tall-.6,z+1,2,2.4,2,leaf.map(v=>v*1.07),r+.3);
  }else if(type==='palm'){
   const tall=height+5;
   box(data,x+.38,y,z+.38,.24,tall,.24,stem);
   for(let i=0;i<7;i++){
    const a=i*Math.PI*2/7,dx=Math.cos(a),dz=Math.sin(a);
    const top=[x+.5,y+tall+.2,z+.5],mid=[x+.5+dx*2.2,y+tall+.5,z+.5+dz*2.2];
    const tip=[x+.5+dx*4.4,y+tall-1.4,z+.5+dz*4.4];
    const orth=[-dz*.5,0,dx*.5],tint=green.map(v=>v*(.88+(i%3)*.09));
    triangle(data,top,mid,[mid[0]+orth[0],mid[1],mid[2]+orth[2]],tint,[0,1,0]);
    triangle(data,mid,tip,[mid[0]+orth[0],mid[1],mid[2]+orth[2]],tint,[0,1,0]);
   }
  }else if(type==='cactus'){
   box(data,x+.28,y,z+.28,.42,height,.42,[.23,.44,.23]);
   box(data,x-.3,y+height*.5,z+.30,.66,.3,.35,[.27,.49,.27]);
   box(data,x-.3,y+height*.5,z+.30,.3,.85,.35,[.27,.49,.27]);
  }else if(type==='mushroom'){
   const tall=Math.max(1,height);
   box(data,x+.39,y,z+.39,.22,tall,.22,[.7,.67,.58]);
   canopy(data,x+.5,y+tall-.1,z+.5,1.7,.66,1.7,green,r);
  }else if(type==='crystal'){
   const blue=[.46,.61,.78];
   canopy(data,x+.5,y+height*.72,z+.5,.7,height*.75,.7,blue,r);
  }else if(type==='rock'){
   canopy(data,x+.5,y+.5,z+.5,.8,.6+.12*height,.7,[.37,.40,.39],r);
  }else{
   const h=type==='reed'?2.7:type==='shrub'?1.8:type==='flower'?1.45:1.2;
   const grass=type==='reed'?[.31,.48,.27]:type==='shrub'?[.26,.41,.22]:[.27,.51,.22];
   for(let blade=0;blade<3;blade++){
    const ox=x+.15+blade*.24,oz=z+.14+((blade*3)%4)*.21;
    const tip=[ox+.08*(blade-1),y+h*(.78+blade*.1),oz+.2];
    triangle(data,[ox,y,oz],tip,[ox+.17,y,oz+.07],grass,[0,0,1]);
    triangle(data,[ox,y,oz+.17],tip,[ox+.19,y,oz],grass,[1,0,0]);
   }
   if(type==='flower'){
    const petal=r>.65?[.96,.80,.35]:r>.33?[.92,.43,.52]:[.68,.51,.87];
    canopy(data,x+.48,y+1.4,z+.5,.43,.23,.42,petal,r);
   }
  }
 }
 function baseColor(tile){
  const {group,height,material,hue,sat,light}=tile;
  const variation=((hue%17)-8)/280,bright=(v)=>clamp(v+variation,0,1);
  if(material==='cave-rock')return [.10,.12,.14];
  if(material==='snow')return [bright(.77),bright(.82),.85];
  if(material==='shore')return [.67,.60,.43];
  if(material==='sand')return [bright(.73),bright(.61),.39];
  if(material==='basalt')return [bright(.27),.24,.24];
  if(material==='cliff')return [bright(.39),bright(.39),.37];
  if(material==='stone')return [bright(.45),bright(.46),.45];
  if(material==='mud')return [bright(.28),bright(.30),.21];
  if(material==='mycelium')return [bright(.35),.30,.38];
  // Keep all 132 named color variations recognizable, within ecological palettes.
  const hueShift=(hue%29)-14;
  if(group==='tropical'||group==='evergreen')return rgb(115+hueShift*.55,40+sat*.12,25+light*.16);
  if(group==='grassland')return rgb(88+hueShift*.6,42,35+light*.1);
  if(group==='wetland')return rgb(103+hueShift*.4,31,28);
  return rgb(92+hueShift,31,37);
 }
 function generateMesh(world,cx,cz,stride=1){
  if(stride!==1&&stride!==4)throw Error('Unsupported terrain LOD');
  let chunk;
  if(stride===1)chunk=world.chunkAt(cx,cz);
  else{
   const tiles=[];
   for(let z=cz*16;z<(cz+1)*16;z+=stride)
    for(let x=cx*16;x<(cx+1)*16;x+=stride)tiles.push(world.surfaceAt(x,z));
   chunk={tiles,plants:[]};
  }
  if(!chunk)return null;
  const data=[];
  for(const tile of chunk.tiles){
   const {x,z,height:y}=tile,color=baseColor(tile);
   quad(data,[x,y+1,z],[x+stride,y+1,z],[x+stride,y+1,z+stride],[x,y+1,z+stride],color,[0,1,0]);
   const sides=[
    {n:world.surfaceAt(x-stride,z),axis:'left'},
    {n:world.surfaceAt(x+stride,z),axis:'right'},
    {n:world.surfaceAt(x,z-stride),axis:'front'},
    {n:world.surfaceAt(x,z+stride),axis:'back'}
   ];
   const shade=color.map(v=>v*.79);
   for(const side of sides){
    const low=side.n?.height??y;
    if(low>=y)continue;
    const a=low+1,b=y+1;
    if(side.axis==='left')quad(data,[x,a,z],[x,b,z],[x,b,z+stride],[x,a,z+stride],shade,[-1,0,0]);
    if(side.axis==='right')quad(data,[x+stride,a,z],[x+stride,a,z+stride],[x+stride,b,z+stride],[x+stride,b,z],shade,[1,0,0]);
    if(side.axis==='front')quad(data,[x,a,z],[x+stride,a,z],[x+stride,b,z],[x,b,z],shade,[0,0,-1]);
    if(side.axis==='back')quad(data,[x,a,z+stride],[x,b,z+stride],[x+stride,b,z+stride],[x+stride,a,z+stride],shade,[0,0,1]);
   }
   if(tile.water){
    const water=[.15,.45,.67];
    const yy=world.SEA_LEVEL+1.15;
    quad(data,[x,yy,z],[x+stride,yy,z],[x+stride,yy,z+stride],[x,yy,z+stride],water,[0,1,0]);
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
  'float fog=smoothstep(55.0,235.0,vDist);'+
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
 function perspective(aspect,near=.1,far=1050){
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
  const chunks=new Map(),MAX_CHUNKS=176,RADIUS=7,NEAR_RADIUS=3;
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  function release(key){
   const c=chunks.get(key);if(c){gl.deleteBuffer(c.buffer);chunks.delete(key);}
  }
  function dispose(){for(const key of chunks.keys())release(key);gl.deleteBuffer(skyBuffer);gl.deleteProgram(skyProgram);gl.deleteProgram(program);}
  function load(cx,cz,stride){
   const key=cx+':'+cz;if(chunks.has(key))return;
   const mesh=generateMesh(world,cx,cz,stride);if(!mesh)return;
   const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.bufferData(gl.ARRAY_BUFFER,mesh.data,gl.STATIC_DRAW);
   chunks.set(key,{cx,cz,stride,buffer,vertices:mesh.vertices,bytes:mesh.data.byteLength});
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
    wanted.push({cx:px+dx,cz:pz+dz,d:dx*dx+dz*dz,stride:dx*dx+dz*dz<=NEAR_RADIUS*NEAR_RADIUS+1?1:4});
   }
   wanted.sort((a,b)=>a.d-b.d);
   const targets=new Set(wanted.map(c=>c.cx+':'+c.cz));
   for(const k of chunks.keys())if(!targets.has(k))release(k);
   // Only one heavy mesh generation/upload per frame, so Android movement
   // remains interactive even when new mountain chunks enter the viewport.
   const missing=wanted.find(c=>{
    const existing=chunks.get(c.cx+':'+c.cz);
    return !existing||existing.stride>c.stride;
   });
   if(missing){
    const key=missing.cx+':'+missing.cz;
    if(chunks.has(key))release(key);
    load(missing.cx,missing.cz,missing.stride);
   }
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
  VOXEL_METERS:.25,MAX_GPU_CHUNKS:176});
})(typeof window==='undefined'?globalThis:window);
