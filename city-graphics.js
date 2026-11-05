/* Optional native WebGL camera proof and persisted Canvas quality settings.
 * This does not replace MemeCityCore, the city renderer or user avatars.
 * The first/third person examples are a bounded 3D graphics-panel preview.
 */
'use strict';
(function(root){
 const KEY='offensive-meme-city-graphics-v1';
 const ZOOM=Object.freeze({wide:.82,normal:1,detail:1.35});
 const QUALITY=Object.freeze({auto:2,performance:1,balanced:1.5,high:2});
 const DEFAULT=Object.freeze({zoom:'normal',quality:'auto'});
 const valid=(obj)=>obj&&typeof obj==='object'&&Object.keys(DEFAULT).every(k=>typeof obj[k]==='string'&&Object.prototype.hasOwnProperty.call(k==='zoom'?ZOOM:QUALITY,obj[k]));
 function createSettings(storage){
  let state={...DEFAULT};
  try{const raw=storage?.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(valid(parsed))state={zoom:parsed.zoom,quality:parsed.quality};}}catch{/* Optional settings must never block play. */}
  const commit=(key,value,values)=>{
   if(!Object.prototype.hasOwnProperty.call(values,value))return false;
   state={...state,[key]:value};
   try{storage?.setItem(KEY,JSON.stringify(state));}catch{/* Current view remains usable. */}
   return true;
  };
  return Object.freeze({
   key:KEY,snapshot:()=>Object.freeze({...state}),
   zoom:()=>ZOOM[state.zoom],pixelRatioCap:()=>QUALITY[state.quality],
   setZoom:v=>commit('zoom',v,ZOOM),setQuality:v=>commit('quality',v,QUALITY),
   cycleZoom:()=>{const next=state.zoom==='normal'?'detail':state.zoom==='detail'?'wide':'normal';commit('zoom',next,ZOOM);return next;}
  });
 }
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const norm=(a)=>{const d=Math.hypot(...a)||1;return a.map(v=>v/d);};
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 function multiply(a,b){
  const out=new Float32Array(16);
  for(let col=0;col<4;col++)for(let row=0;row<4;row++)
   for(let k=0;k<4;k++)out[col*4+row]+=a[k*4+row]*b[col*4+k];
  return out;
 }
 function perspective(aspect,fov=Math.PI/3,near=.1,far=100){
  const f=1/Math.tan(fov/2),d=1/(near-far),m=new Float32Array(16);
  m[0]=f/aspect;m[5]=f;m[10]=(far+near)*d;m[11]=-1;m[14]=2*far*near*d;
  return m;
 }
 function lookAt(eye,target){
  const z=norm(eye.map((v,i)=>v-target[i])),x=norm(cross([0,1,0],z)),y=cross(z,x);
  return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
 }
 function model(position,size){
  return new Float32Array([size[0],0,0,0,0,size[1],0,0,0,0,size[2],0,position[0],position[1],position[2],1]);
 }
 const faces=[
  [[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],
  [[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]],
  [[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]],
  [[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]],
  [[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]],
  [[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]
 ];
 const vertices=new Float32Array(faces.flatMap(f=>[...f[0],...f[1],...f[2],...f[0],...f[2],...f[3]]));
 function rgb(hex){
  if(typeof hex!=='string'||!/^#[0-9a-f]{6}$/i.test(hex))return [0.72,0.91,0.49];
  return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
 }
 function createPreview(canvas,color='#b6e87a'){
  let gl,program,buffer,vs,fs;
  try{gl=canvas?.getContext?.('webgl',{antialias:false,preserveDrawingBuffer:true,alpha:false});}catch{return Object.freeze({supported:false,draw:()=>false,destroy:()=>{}});}
  if(!gl)return Object.freeze({supported:false,draw:()=>false,destroy:()=>{}});
  try{
   function shader(type,text){
    const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Shader failed');
    return s;
   }
   vs=shader(gl.VERTEX_SHADER,'attribute vec3 p;uniform mat4 matrix;void main(){gl_Position=matrix*vec4(p,1.0);}');
   fs=shader(gl.FRAGMENT_SHADER,'precision mediump float;uniform vec3 tint;void main(){gl_FragColor=vec4(tint,1.0);}');
   program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Shader link failed');
   buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
  }catch{
   if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);
   return Object.freeze({supported:false,draw:()=>false,destroy:()=>{}});
  }
  let disposed=false;
  const matrix=gl.getUniformLocation(program,'matrix'),tint=gl.getUniformLocation(program,'tint'),attr=gl.getAttribLocation(program,'p');
  function draw(mode='third',nextColor=color){
   if(disposed||!['first','third'].includes(mode))return false;
   const w=clamp(Math.round(canvas.clientWidth||640),220,640),h=Math.round(w*9/16);
   canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);
   gl.enable(gl.DEPTH_TEST);gl.clearColor(.055,.09,.14,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,3,gl.FLOAT,false,0,0);
   const eye=mode==='first'?[0,1.68,0]:[2.2,2.75,-5.4],target=mode==='first'?[0,1.6,5]:[0,1.1,.4];
   const vp=multiply(perspective(w/h),lookAt(eye,target));
   function box(pos,sz,c){
    gl.uniformMatrix4fv(matrix,false,multiply(vp,model(pos,sz)));
    gl.uniform3fv(tint,c);gl.drawArrays(gl.TRIANGLES,0,36);
   }
   const shirt=rgb(nextColor),dark=[.12,.17,.23],stone=[.28,.37,.42],road=[.22,.29,.32];
   box([0,-.17,2],[24,.3,24],[.16,.26,.24]);
   box([0,-.005,2],[3,.04,19],road);
   for(const s of [-1,1]){
    box([s*3.4,.8,3.8],[2.3,1.6,2.2],stone);
    box([s*3.4,.9,8],[2.8,1.8,2.9],[.35,.36,.39]);
    box([s*1.9,.7,6],[.25,1.4,.25],[.29,.25,.20]);
    box([s*1.9,1.6,6],[.85,.75,.85],[.15,.38,.27]);
   }
   if(mode==='third'){
    box([0,1.14,0],[.62,.72,.32],shirt);
    box([0,1.80,0],[.52,.49,.50],[.90,.87,.78]);
    for(const s of [-1,1]){
     box([s*.16,1.86,.259],[.115,.14,.024],dark);
     box([s*.39,1.12,0],[.2,.69,.25],shirt);
     box([s*.19,.43,0],[.24,.72,.29],[.2,.26,.34]);
     box([s*.19,.09,.08],[.27,.16,.44],dark);
    }
    box([0,1.67,.26],[.24,.08,.025],dark);
    box([0,1.2,-.169],[.34,.34,.01],[.15,.23,.31]);
    box([.58,1.14,.48],[.13,.16,.9],[.37,.42,.49]);
   }else{
    for(const s of [-1,1])box([s*.37,1.04,.95],[.21,.32,.48],shirt);
    box([.39,1.1,1.3],[.18,.22,.8],stone);
   }
   gl.flush();return true;
  }
  function destroy(){
   if(disposed)return;disposed=true;
   gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  }
  return Object.freeze({supported:true,draw,destroy});
 }
 root.CityGraphics=Object.freeze({KEY,ZOOM,QUALITY,createSettings,createPreview,perspective,lookAt,multiply});
})(typeof window==='undefined'?globalThis:window);
