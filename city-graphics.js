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
 function model(position,size,yaw=0){
  const c=Math.cos(yaw),s=Math.sin(yaw);
  return new Float32Array([c*size[0],0,-s*size[0],0,0,size[1],0,0,s*size[2],0,c*size[2],0,position[0],position[1],position[2],1]);
 }
 // Read-only miniature of actual authored building footprints in World V1.
 // The nearest entrance becomes the subject of a separate preview camera.
 // All numbers are validated and capped; no player movement or save keys are read.
 function createWorldScene(buildings,location){
  if(!Array.isArray(buildings)||!location||!Number.isFinite(location.x)||!Number.isFinite(location.y))return null;
  const valid=buildings.slice(0,128).filter(b=>b&&Number.isFinite(b.x)&&Number.isFinite(b.y)&&
   Number.isFinite(b.w)&&Number.isFinite(b.h)&&b.w>0&&b.h>0&&b.w<=1600&&b.h<=1600&&
   b.x>=0&&b.y>=0&&b.x<1e6&&b.y<1e6);
  if(!valid.length)return null;
  const distance=b=>Math.hypot(location.x-(b.x+b.w/2),location.y-(b.y+b.h+37));
  const nearest=valid.reduce((best,b)=>distance(b)<distance(best)?b:best);
  const originX=nearest.x+nearest.w/2,originY=nearest.y+nearest.h+37+420,scale=120;
  const solid=valid.map(b=>({
   id:String(b.roomId||b.id||b.name||'building').slice(0,60),
   name:String(b.name||b.label||b.id||'Meme City building').slice(0,72),
   x:(b.x+b.w/2-originX)/scale,z:(originY-b.y-b.h/2)/scale,
   w:b.w/scale,d:b.h/scale,
   height:Math.max(1.1,Math.min(3.2,b.h/120)),
   color:/^#[0-9a-f]{6}$/i.test(b.accent||b.hue||'')?(b.accent||b.hue):'#78949f'
  })).filter(b=>Math.abs(b.x)<18&&Math.abs(b.z)<18)
   .sort((a,b)=>(a.id===String(nearest.roomId||nearest.id)?-1:b.id===String(nearest.roomId||nearest.id)?1:0)||
     Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z)).slice(0,16);
  return Object.freeze({
   name:String(nearest.name||nearest.label||nearest.id||'Meme City landmark').slice(0,72),
   world:Object.freeze({x:originX,y:originY}),
   buildings:Object.freeze(solid.map(b=>Object.freeze(b)))
  });
 }
 // Segment / 3D AABB camera obstruction. Only moves the optional preview
 // camera, never the avatar, its collision engine or the game world's camera.
 function cameraAvoid(scene,eye,target){
  if(!Array.isArray(eye)||!Array.isArray(target)||eye.length!==3||target.length!==3||
   ![...eye,...target].every(Number.isFinite))return null;
  if(!scene?.buildings?.length)return Object.freeze({eye:eye.slice(),obstructed:false});
  const delta=eye.map((value,i)=>value-target[i]),distance=Math.hypot(...delta);
  if(distance<.01)return Object.freeze({eye:eye.slice(),obstructed:false});
  let nearest=1;
  for(const b of scene.buildings.slice(0,16)){
   if(![b.x,b.z,b.w,b.d,b.height].every(Number.isFinite)||b.w<=0||b.d<=0||b.height<=0)continue;
   const margin=.18,bounds=[
    [b.x-b.w/2-margin,b.x+b.w/2+margin],
    [0,b.height+.12],
    [b.z-b.d/2-margin,b.z+b.d/2+margin]
   ];
   let enter=0,leave=1,miss=false;
   for(let axis=0;axis<3;axis++){
    const origin=target[axis],speed=delta[axis],[lo,hi]=bounds[axis];
    if(Math.abs(speed)<1e-8){if(origin<lo||origin>hi){miss=true;break;}continue;}
    const a=(lo-origin)/speed,c=(hi-origin)/speed;
    enter=Math.max(enter,Math.min(a,c));leave=Math.min(leave,Math.max(a,c));
    if(enter>leave){miss=true;break;}
   }
   if(!miss&&enter<=1&&leave>=0)nearest=Math.min(nearest,Math.max(0,enter-.12/distance));
  }
  // Hold a minimum framing distance instead of allowing the eye inside the
  // avatar. If the focus is somehow already inside a solid, use the input eye.
  if(nearest<=.01)return Object.freeze({eye:eye.slice(),obstructed:false});
  return Object.freeze({eye:target.map((value,i)=>value+delta[i]*nearest),obstructed:nearest<1});
 }
 // A bounded, preview-only camera/character stage. No real game state is mutated.
 function createStage(scene=null){
  let x=0,z=0,yaw=0,steps=0;
  const snapshot=()=>Object.freeze({x,z,yaw,steps});
  return Object.freeze({
   snapshot,
   turn(radians){
    if(!Number.isFinite(radians)||Math.abs(radians)>Math.PI)return false;
    yaw=Math.atan2(Math.sin(yaw+radians),Math.cos(yaw+radians));
    return true;
   },
   step(distance){
    if(!Number.isFinite(distance)||Math.abs(distance)>1)return false;
    const dx=Math.sin(yaw)*distance,dz=Math.cos(yaw)*distance;
    // Swept/substep collision prevents walking through thin building walls
    // even if the final endpoint would be clear. Preview state only.
    const count=Math.max(1,Math.ceil(Math.abs(distance)/.1));
    for(let i=1;i<=count;i++){
     const nx=x+dx*i/count,nz=z+dz*i/count;
     if(Math.abs(nx)>1.2||nz< -3||nz>9)return false;
     if(scene?.buildings?.some(b=>Math.abs(nx-b.x)<b.w/2+.24&&Math.abs(nz-b.z)<b.d/2+.24))return false;
    }
    x+=dx;z+=dz;steps++;return true;
   },
   reset(){x=0;z=0;yaw=0;steps=0;}
  });
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
 function createPreview(canvas,color='#b6e87a',scene=null){
  const sample=scene&&Array.isArray(scene.buildings)?scene:null;
  const stage=createStage(sample);
  const unavailable=()=>Object.freeze({supported:false,draw:()=>false,destroy:()=>{},turn:()=>false,step:()=>false,reset:()=>false,snapshot:stage.snapshot});
  let gl,program,buffer,vs,fs;
  try{gl=canvas?.getContext?.('webgl',{antialias:false,preserveDrawingBuffer:true,alpha:false});}catch{return unavailable();}
  if(!gl)return unavailable();
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
   return unavailable();
  }
  let disposed=false;
  const matrix=gl.getUniformLocation(program,'matrix'),tint=gl.getUniformLocation(program,'tint'),attr=gl.getAttribLocation(program,'p');
  function draw(mode='third',nextColor=color){
   if(disposed||!['first','third'].includes(mode))return false;
   const w=clamp(Math.round(canvas.clientWidth||640),220,640),h=Math.round(w*9/16);
   canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);
   gl.enable(gl.DEPTH_TEST);gl.clearColor(.055,.09,.14,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,3,gl.FLOAT,false,0,0);
   const {x,z,yaw,steps}=stage.snapshot(),sin=Math.sin(yaw),cos=Math.cos(yaw);
   const desiredEye=mode==='first'?[x,1.68,z]:[x-sin*5.4+cos*1.4,2.75,z-cos*5.4-sin*1.4];
   const target=mode==='first'?[x+sin*5,1.60,z+cos*5]:[x+sin*.35,1.12,z+cos*.35];
   const eye=mode==='third'?(cameraAvoid(sample,desiredEye,target)?.eye||desiredEye):desiredEye;
   const vp=multiply(perspective(w/h),lookAt(eye,target));
   function box(pos,sz,c,angle=0){
    gl.uniformMatrix4fv(matrix,false,multiply(vp,model(pos,sz,angle)));
    gl.uniform3fv(tint,c);gl.drawArrays(gl.TRIANGLES,0,36);
   }
   function actorBox(local,sz,c){
    const [lx,ly,lz]=local;
    box([x+lx*cos+lz*sin,ly,z-lx*sin+lz*cos],sz,c,yaw);
   }
   const shirt=rgb(nextColor),dark=[.12,.17,.23],stone=[.28,.37,.42],road=[.22,.29,.32];
   const skull=[.9,.87,.78],teeth=[.70,.70,.63];
   box([0,-.17,2],[24,.3,24],[.16,.26,.24]);
   box([0,-.005,2],[3,.04,19],road);
   if(sample?.buildings?.length){
    // Footprints come from CityInteriors.BUILDINGS, not randomly invented
    // game-world coordinates. Every mesh remains preview-only.
    for(const b of sample.buildings){
     const height=b.height;
     box([b.x,height/2,b.z],[b.w,height,b.d],rgb(b.color));
     box([b.x,height+.09,b.z],[b.w+.15,.18,b.d+.15],[.13,.19,.24]);
     // Facade faces the existing World V1 south entrance. These are thin
     // visual panels, not actual passable doors or texture-pack assets.
     const facade=b.z-b.d/2-.035;
     const front=[.12,.20,.27],glass=[.31,.63,.69];
     const doorW=Math.min(.6,Math.max(.22,b.w*.26));
     box([b.x,.48,facade],[doorW,.96,.045],front);
     box([b.x,1.0,facade-.014],[doorW*.6,.06,.05],[.83,.79,.61]);
     if(b.w>=1.3){
      const offset=Math.min(b.w*.32,.95);
      for(const side of [-1,1]){
       box([b.x+side*offset,Math.min(height-.35,1.38),facade],[.35,.45,.046],glass);
       box([b.x+side*offset,Math.min(height-.35,1.38),facade-.027],[.025,.45,.045],front);
      }
     }
    }
   }else{
    for(const side of [-1,1]){
     box([side*3.4,.8,3.8],[2.3,1.6,2.2],stone);
     box([side*3.4,.9,8],[2.8,1.8,2.9],[.35,.36,.39]);
     box([side*1.9,.7,6],[.25,1.4,.25],[.29,.25,.20]);
     box([side*1.9,1.6,6],[.85,.75,.85],[.15,.38,.27]);
    }
   }
   // The same simple box-rig rotates as a unit for third-person views.
   const gait=steps?Math.sin(steps*1.7)*.11:0;
   if(mode==='third'){
    actorBox([0,1.14+Math.abs(gait)*.2,0],[.62,.72,.32],shirt);
    actorBox([0,1.80+Math.abs(gait)*.2,0],[.52,.49,.50],skull);
    actorBox([0,1.57,.06],[.32,.16,.40],skull);
    // Eye sockets and jaw turn with the head; unlike the previous static cube,
    // token outfit and recognizable skull features rotate together.
    for(const side of [-1,1]){
     actorBox([side*.16,1.86,.259],[.115,.14,.024],dark);
     actorBox([side*.39,1.12+gait*side,0],[.2,.69,.25],shirt);
     actorBox([side*.19,.43-gait*side,0],[.24,.72,.29],[.2,.26,.34]);
     actorBox([side*.19,.09-gait*side,.08],[.27,.16,.44],dark);
     actorBox([side*.07,1.56,.27],[.055,.10,.025],teeth);
    }
    actorBox([0,1.67,.26],[.24,.08,.025],dark);
    actorBox([0,1.2,-.169],[.34,.34,.01],[.15,.23,.31]);
    actorBox([.58,1.14,.48],[.13,.16,.9],[.37,.42,.49]);
   }else{
    // Local arm/tool proxy near camera. This is still a 3D preview, not combat.
    for(const side of [-1,1])actorBox([side*.37,1.04,.95],[.21,.32,.48],shirt);
    actorBox([.39,1.1,1.3],[.18,.22,.8],stone);
   }
   gl.flush();return true;
  }
  function destroy(){
   if(disposed)return;disposed=true;
   gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  }
  return Object.freeze({
   supported:true,draw,destroy,
   snapshot:stage.snapshot,
   turn:radians=>!disposed&&stage.turn(radians),
   step:distance=>!disposed&&stage.step(distance),
   reset:()=>{if(disposed)return false;stage.reset();return true;}
  });
 }
 root.CityGraphics=Object.freeze({KEY,ZOOM,QUALITY,createSettings,createWorldScene,createStage,cameraAvoid,createPreview,perspective,lookAt,multiply});
})(typeof window==='undefined'?globalThis:window);
