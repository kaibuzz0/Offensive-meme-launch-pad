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
 function model(position,size,yaw=0,pitch=0){
  const c=Math.cos(yaw),s=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  // Local pitch articulation before parent yaw: Rx(pitch), then Ry(yaw).
  return new Float32Array([c*size[0],0,-s*size[0],0,
   s*sp*size[1],cp*size[1],c*sp*size[1],0,
   s*cp*size[2],-sp*size[2],c*cp*size[2],0,
   position[0],position[1],position[2],1]);
 }
 function avatarPose(steps){
  const safe=Number.isFinite(steps)?clamp(steps,0,1000000):0;
  const swing=Math.sin(safe*1.7)*.5,bob=Math.abs(swing)*.045;
  return Object.freeze({
   bob,
   leftLeg:swing,rightLeg:-swing,
   leftKnee:Math.max(0,-swing)*.65,rightKnee:Math.max(0,swing)*.65,
   leftArm:-swing*.7,rightArm:.48+swing*.17,
   leftElbow:.2,rightElbow:.86
  });
 }
 // Compact terrain swatch derived from the SAME region queries used by
 // the canonical 2D game. These shallow tiles are visual only: no 3D mining,
 // world-height simulation, navmesh or game collision is modified.
 function hslHex(h,s,l){
  if(![h,s,l].every(Number.isFinite))return '#263d3c';
  const hue=((h%360)+360)%360,ss=clamp(s,0,100)/100,ll=clamp(l,0,100)/100;
  const k=n=>(n+hue/30)%12,a=ss*Math.min(ll,1-ll);
  const channel=n=>Math.round(255*(ll-a*Math.max(-1,Math.min(k(n)-3,9-k(n),1))));
  return '#'+[channel(0),channel(8),channel(4)].map(n=>n.toString(16).padStart(2,'0')).join('');
 }
 function createTerrainPatch(originX,originY,biomes,frontier){
  const local=typeof biomes?.terrainAt==='function'?biomes:null;
  const outer=typeof frontier?.terrainAt==='function'?frontier:null;
  if(!local&&!outer)return null;
  const scale=120,side=3,count=8,cells=[];
  for(let z=0;z<count;z++)for(let x=0;x<count;x++){
   const lx=(x-(count-1)/2)*side,lz=(z-(count-1)/2)*side;
   const wx=originX+lx*scale,wy=originY-lz*scale;
   const reg=outer?.regionAt?.(wx,wy)||local?.regionAt?.(wx,wy)||null;
   const material=outer?.terrainAt(wx,wy)||local?.terrainAt(wx,wy)||null;
   const hex=reg&&Number.isFinite(reg.hue)?hslHex(reg.hue,reg.sat,reg.light):
    /^#[0-9a-f]{6}$/i.test(reg?.color||'')?reg.color:
    local?.materials?.[material?.material]?.color||'#263d3c';
   const rough=Number.isFinite(material?.roughness)?clamp(material.roughness,-1,1):0;
   cells.push(Object.freeze({x:lx,z:lz,w:side,d:side,color:hex,relief:Math.round(rough*30)/1000,
    material:String(material?.material||'urban').slice(0,45)}));
  }
  const focus=outer?.regionAt?.(originX,originY)||local?.regionAt?.(originX,originY)||null;
  const name=String(focus?.name||'Center City pavement').slice(0,72);
  return Object.freeze({name,cells:Object.freeze(cells)});
 }
 // Read-only miniature of actual authored building footprints in World V1.
 // The nearest entrance becomes the subject of a separate preview camera.
 // All numbers are validated and capped; no player movement or save keys are read.
 function createWorldScene(buildings,location,biomes=null,frontier=null){
  if(!Array.isArray(buildings)||!location||!Number.isFinite(location.x)||!Number.isFinite(location.y))return null;
  const valid=buildings.slice(0,128).filter(b=>b&&Number.isFinite(b.x)&&Number.isFinite(b.y)&&
   Number.isFinite(b.w)&&Number.isFinite(b.h)&&b.w>0&&b.h>0&&b.w<=1600&&b.h<=1600&&
   b.x>=0&&b.y>=0&&b.x<1e6&&b.y<1e6);
  if(!valid.length)return null;
  const distance=b=>Math.hypot(location.x-(b.x+b.w/2),location.y-(b.y+b.h+37));
  const nearest=valid.reduce((best,b)=>distance(b)<distance(best)?b:best);
  // When the player is far outside the authored city, sample the actual
  // frontier region instead of pretending a distant city building is nearby.
  const sampleFrontier=distance(nearest)>850&&!!(frontier?.regionAt?.(location.x,location.y)||biomes?.regionAt?.(location.x,location.y));
  const originX=sampleFrontier?location.x:nearest.x+nearest.w/2;
  const originY=sampleFrontier?location.y:nearest.y+nearest.h+37+420,scale=120;
  const terrain=createTerrainPatch(originX,originY,biomes,frontier);
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
   name:sampleFrontier?terrain?.name||'Frontier preview':String(nearest.name||nearest.label||nearest.id||'Meme City landmark').slice(0,72),
   world:Object.freeze({x:originX,y:originY}),
   buildings:Object.freeze(solid.map(b=>Object.freeze(b))),
   terrain
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
 // One-time CPU mesh build: all static terrain/buildings share ONE
 // position+RGB WebGL buffer. The moving avatar remains on its own box rig.
 const STATIC_BOX_LIMIT=240;
 function createStaticBoxes(scene){
  const boxes=[];
  const add=(pos,size,color)=>{
   if(boxes.length>=STATIC_BOX_LIMIT||!Array.isArray(pos)||!Array.isArray(size)||
    pos.length!==3||size.length!==3||![...pos,...size].every(Number.isFinite)||
    size.some(v=>v<=0||v>1000)||pos.some(v=>Math.abs(v)>100000))return;
   const tint=Array.isArray(color)&&color.length===3&&color.every(v=>Number.isFinite(v)&&v>=0&&v<=1)?color:
    rgb(color);
   boxes.push(Object.freeze({pos:Object.freeze(pos.slice()),size:Object.freeze(size.slice()),color:Object.freeze(tint.slice())}));
  };
  add([0,-.25,2],[26,.3,26],[.16,.26,.24]);
  for(const tile of (Array.isArray(scene?.terrain?.cells)?scene.terrain.cells:[]).slice(0,64))
   if(tile&&[tile.x,tile.z,tile.w,tile.d,tile.relief].every(Number.isFinite))
    add([tile.x,-.09+tile.relief,tile.z],[tile.w,.15,tile.d],tile.color);
  add([0,-.005,2],[3,.04,19],[.22,.29,.32]);
  if(scene?.buildings?.length){
   for(const b of scene.buildings.slice(0,16)){
    if(!b||![b.x,b.z,b.w,b.d,b.height].every(Number.isFinite))continue;
    const height=b.height,facade=b.z-b.d/2-.035;
    add([b.x,height/2,b.z],[b.w,height,b.d],b.color);
    add([b.x,height+.09,b.z],[b.w+.15,.18,b.d+.15],[.13,.19,.24]);
    const front=[.12,.20,.27],glass=[.31,.63,.69],doorW=Math.min(.6,Math.max(.22,b.w*.26));
    add([b.x,.48,facade],[doorW,.96,.045],front);
    add([b.x,1.0,facade-.014],[doorW*.6,.06,.05],[.83,.79,.61]);
    if(b.w>=1.3){
     const offset=Math.min(b.w*.32,.95);
     for(const side of [-1,1]){
      add([b.x+side*offset,Math.min(height-.35,1.38),facade],[.35,.45,.046],glass);
      add([b.x+side*offset,Math.min(height-.35,1.38),facade-.027],[.025,.45,.045],front);
     }
    }
   }
  }else{
   for(const side of [-1,1]){
    add([side*3.4,.8,3.8],[2.3,1.6,2.2],[.28,.37,.42]);
    add([side*3.4,.9,8],[2.8,1.8,2.9],[.35,.36,.39]);
    add([side*1.9,.7,6],[.25,1.4,.25],[.29,.25,.20]);
    add([side*1.9,1.6,6],[.85,.75,.85],[.15,.38,.27]);
   }
  }
  return Object.freeze(boxes);
 }
 function createStaticMesh(scene){
  const boxes=createStaticBoxes(scene),data=new Float32Array(boxes.length*36*6);
  let index=0;
  for(const b of boxes)for(let v=0;v<vertices.length;v+=3){
   data[index++]=vertices[v]*b.size[0]+b.pos[0];
   data[index++]=vertices[v+1]*b.size[1]+b.pos[1];
   data[index++]=vertices[v+2]*b.size[2]+b.pos[2];
   data[index++]=b.color[0];data[index++]=b.color[1];data[index++]=b.color[2];
  }
  return Object.freeze({data,boxes:boxes.length,vertices:data.length/6,bytes:data.byteLength});
 }
 // Reusable, stateless character rig. Both viewpoints derive from the same
 // validated pose. Returning immutable local-space parts allows future NPCs,
 // alternative skins and renderers to share one geometry definition.
 function createAvatarRig(phase=0,mode='third',outfit='#b6e87a'){
  if(!['first','third'].includes(mode))return Object.freeze([]);
  const shirt=rgb(outfit),dark=[.12,.17,.23],skull=[.9,.87,.78],
   teeth=[.70,.70,.63],trousers=[.2,.26,.34],gun=[.37,.42,.49];
  const parts=[],pose=avatarPose(phase);
  const add=(name,pos,size,color,pitch=0)=>{
   if(parts.length>=56||![...pos,...size,pitch].every(Number.isFinite))return;
   parts.push(Object.freeze({name,pos:Object.freeze(pos.slice()),size:Object.freeze(size.slice()),
    color:Object.freeze(color.slice()),pitch}));
  };
  const limbSegment=(name,pivot,length,angle,width,depth,color)=>{
   const end=[pivot[0],pivot[1]-Math.cos(angle)*length,pivot[2]+Math.sin(angle)*length];
   add(name,[pivot[0],(pivot[1]+end[1])/2,(pivot[2]+end[2])/2],
    [width,length,depth],color,angle);
   return end;
  };
  if(mode==='first'){
   for(const side of [-1,1])add('first-arm-'+side,[side*.37,1.04,.95],[.21,.32,.48],shirt);
   add('first-tool',[.39,1.1,1.3],[.18,.22,.8],gun);
  }else{
   add('torso',[0,1.14+pose.bob,0],[.62,.72,.32],shirt);
   add('skull',[0,1.80+pose.bob,0],[.52,.49,.50],skull);
   add('jaw',[0,1.57+pose.bob,.06],[.32,.16,.40],skull);
   for(const side of [-1,1]){
    add('eye-'+side,[side*.16,1.86+pose.bob,.259],[.115,.14,.024],dark);
    add('teeth-'+side,[side*.07,1.56+pose.bob,.27],[.055,.10,.025],teeth);
    const armAngle=side<0?pose.leftArm:pose.rightArm;
    const elbowAngle=side<0?pose.leftElbow:pose.rightElbow;
    const elbow=limbSegment('upper-arm-'+side,[side*.40,1.43+pose.bob,0],.36,armAngle,.2,.25,shirt);
    const wrist=limbSegment('forearm-'+side,elbow,.33,armAngle+elbowAngle,.18,.22,skull);
    add('hand-'+side,[wrist[0],wrist[1]-.04,wrist[2]],[.17,.13,.20],skull);
    const legAngle=side<0?pose.leftLeg:pose.rightLeg;
    const kneeAngle=side<0?pose.leftKnee:pose.rightKnee;
    const knee=limbSegment('thigh-'+side,[side*.19,.83+pose.bob,0],.40,legAngle,.23,.30,trousers);
    const foot=limbSegment('shin-'+side,knee,.37,legAngle-kneeAngle,.22,.28,trousers);
    add('boot-'+side,[foot[0],Math.max(.075,foot[1]-.035),foot[2]+.07],[.27,.15,.39],dark);
    if(side===1)add('blaster',[wrist[0]+.11,wrist[1]+.025,wrist[2]+.40],
     [.13,.15,.76],gun,armAngle+elbowAngle);
   }
   add('mouth',[0,1.67+pose.bob,.26],[.24,.08,.025],dark);
   add('back-panel',[0,1.2+pose.bob,-.169],[.34,.34,.01],[.15,.23,.31]);
  }
  return Object.freeze(parts);
 }
 function createAvatarMesh(snapshot,mode='third',outfit='#b6e87a'){
  if(!snapshot||![snapshot.x,snapshot.z,snapshot.yaw,snapshot.steps].every(Number.isFinite))
   return null;
  const parts=createAvatarRig(snapshot.steps,mode,outfit);
  const data=new Float32Array(parts.length*36*6);
  const {x,z,yaw}=snapshot,sin=Math.sin(yaw),cos=Math.cos(yaw);
  let index=0;
  for(const part of parts){
   const [lx,ly,lz]=part.pos;
   const world=[x+lx*cos+lz*sin,ly,z-lx*sin+lz*cos];
   const m=model(world,part.size,yaw,-part.pitch);
   for(let v=0;v<vertices.length;v+=3){
    const px=vertices[v],py=vertices[v+1],pz=vertices[v+2];
    data[index++]=m[0]*px+m[4]*py+m[8]*pz+m[12];
    data[index++]=m[1]*px+m[5]*py+m[9]*pz+m[13];
    data[index++]=m[2]*px+m[6]*py+m[10]*pz+m[14];
    data[index++]=part.color[0];data[index++]=part.color[1];data[index++]=part.color[2];
   }
  }
  return Object.freeze({data,parts:parts.length,vertices:data.length/6,bytes:data.byteLength});
 }
 function createPreview(canvas,color='#b6e87a',scene=null){
  const sample=scene&&Array.isArray(scene.buildings)?scene:null;
  const stage=createStage(sample);
  const unavailable=()=>Object.freeze({supported:false,draw:()=>false,destroy:()=>{},turn:()=>false,step:()=>false,reset:()=>false,stats:()=>null,snapshot:stage.snapshot});
  const staticMesh=createStaticMesh(sample);
  let gl,program,buffer,staticBuffer,vs,fs,staticUploads=0,staticDrawCalls=0,dynamicDrawCalls=0;
  try{gl=canvas?.getContext?.('webgl',{antialias:false,preserveDrawingBuffer:true,alpha:false});}catch{return unavailable();}
  if(!gl)return unavailable();
  try{
   function shader(type,text){
    const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Shader failed');
    return s;
   }
   vs=shader(gl.VERTEX_SHADER,'attribute vec3 p;attribute vec3 vertexColor;uniform mat4 matrix;uniform vec3 tint;uniform float useVertexColor;varying vec3 vColor;void main(){vColor=useVertexColor>0.5?vertexColor:tint;gl_Position=matrix*vec4(p,1.0);}');
   fs=shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 vColor;void main(){gl_FragColor=vec4(vColor,1.0);}');
   program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Shader link failed');
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Shader program failed');
   buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
   staticBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,staticMesh.data,gl.STATIC_DRAW);
   staticUploads=1;
  }catch{
   if(buffer)gl.deleteBuffer(buffer);if(staticBuffer)gl.deleteBuffer(staticBuffer);if(program)gl.deleteProgram(program);if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);
   return unavailable();
  }
  let disposed=false;
  const matrix=gl.getUniformLocation(program,'matrix'),tint=gl.getUniformLocation(program,'tint'),useVertexColor=gl.getUniformLocation(program,'useVertexColor'),attr=gl.getAttribLocation(program,'p'),colorAttr=gl.getAttribLocation(program,'vertexColor');
  function draw(mode='third',nextColor=color){
   if(disposed||!['first','third'].includes(mode)||gl.isContextLost?.())return false;
   staticDrawCalls=0;dynamicDrawCalls=0;
   const w=clamp(Math.round(canvas.clientWidth||640),220,640),h=Math.round(w*9/16);
   canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);
   gl.enable(gl.DEPTH_TEST);gl.clearColor(.055,.09,.14,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.useProgram(program);gl.enableVertexAttribArray(attr);
   const {x,z,yaw,steps}=stage.snapshot(),sin=Math.sin(yaw),cos=Math.cos(yaw);
   const desiredEye=mode==='first'?[x,1.68,z]:[x-sin*5.4+cos*1.4,2.75,z-cos*5.4-sin*1.4];
   const target=mode==='first'?[x+sin*5,1.60,z+cos*5]:[x+sin*.35,1.12,z+cos*.35];
   const eye=mode==='third'?(cameraAvoid(sample,desiredEye,target)?.eye||desiredEye):desiredEye;
   const vp=multiply(perspective(w/h),lookAt(eye,target));
   // Static geometry uploads only once at preview creation and renders in
   // exactly one draw call, regardless of the number of terrain tiles.
   gl.bindBuffer(gl.ARRAY_BUFFER,staticBuffer);
   gl.vertexAttribPointer(attr,3,gl.FLOAT,false,24,0);
   gl.enableVertexAttribArray(colorAttr);
   gl.vertexAttribPointer(colorAttr,3,gl.FLOAT,false,24,12);
   gl.uniform1f(useVertexColor,1);gl.uniformMatrix4fv(matrix,false,vp);
   gl.drawArrays(gl.TRIANGLES,0,staticMesh.vertices);staticDrawCalls++;
   gl.disableVertexAttribArray(colorAttr);
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.vertexAttribPointer(attr,3,gl.FLOAT,false,0,0);
   gl.uniform1f(useVertexColor,0);
   function box(pos,sz,c,angle=0,pitch=0){
    gl.uniformMatrix4fv(matrix,false,multiply(vp,model(pos,sz,angle,pitch)));
    gl.uniform3fv(tint,c);gl.drawArrays(gl.TRIANGLES,0,36);dynamicDrawCalls++;
   }
   function actorBox(local,sz,c,pitch=0){
    const [lx,ly,lz]=local;
    box([x+lx*cos+lz*sin,ly,z-lx*sin+lz*cos],sz,c,yaw,-pitch);
   }
   function limbSegment(pivot,length,angle,width,depth,color){
    // Hierarchical upper/lower box limbs: each next joint starts at the
    // previous segment endpoint. All coordinates are avatar-local.
    const end=[pivot[0],pivot[1]-Math.cos(angle)*length,pivot[2]+Math.sin(angle)*length];
    actorBox([pivot[0],(pivot[1]+end[1])/2,(pivot[2]+end[2])/2],
     [width,length,depth],color,angle);
    return end;
   }
   const shirt=rgb(nextColor),dark=[.12,.17,.23],stone=[.28,.37,.42],road=[.22,.29,.32];
   const skull=[.9,.87,.78],teeth=[.70,.70,.63];
   // One simple hierarchical box-rig shared by the avatar's body parts.
   // This is procedural articulation, NOT a skinned glTF skeleton or animation.
   const pose=avatarPose(steps);
   if(mode==='third'){
    actorBox([0,1.14+pose.bob,0],[.62,.72,.32],shirt);
    actorBox([0,1.80+pose.bob,0],[.52,.49,.50],skull);
    actorBox([0,1.57+pose.bob,.06],[.32,.16,.40],skull);
    for(const side of [-1,1]){
     actorBox([side*.16,1.86+pose.bob,.259],[.115,.14,.024],dark);
     actorBox([side*.07,1.56+pose.bob,.27],[.055,.10,.025],teeth);
     const armAngle=side<0?pose.leftArm:pose.rightArm;
     const elbowAngle=side<0?pose.leftElbow:pose.rightElbow;
     const elbow=limbSegment([side*.40,1.43+pose.bob,0],.36,armAngle,.2,.25,shirt);
     const wrist=limbSegment(elbow,.33,armAngle+elbowAngle,.18,.22,skull);
     actorBox([wrist[0],wrist[1]-.04,wrist[2]],[.17,.13,.20],skull);
     const legAngle=side<0?pose.leftLeg:pose.rightLeg;
     const kneeAngle=side<0?pose.leftKnee:pose.rightKnee;
     const knee=limbSegment([side*.19,.83+pose.bob,0],.40,legAngle,.23,.30,[.2,.26,.34]);
     const foot=limbSegment(knee,.37,legAngle-kneeAngle,.22,.28,[.2,.26,.34]);
     actorBox([foot[0],Math.max(.075,foot[1]-.035),foot[2]+.07],[.27,.15,.39],dark);
     if(side===1)actorBox([wrist[0]+.11,wrist[1]+.025,wrist[2]+.40],
      [.13,.15,.76],[.37,.42,.49],armAngle+elbowAngle);
    }
    actorBox([0,1.67+pose.bob,.26],[.24,.08,.025],dark);
    actorBox([0,1.2+pose.bob,-.169],[.34,.34,.01],[.15,.23,.31]);
   }else{
    // Local arm/tool proxy near camera. This is still a 3D preview, not combat.
    for(const side of [-1,1])actorBox([side*.37,1.04,.95],[.21,.32,.48],shirt);
    actorBox([.39,1.1,1.3],[.18,.22,.8],stone);
   }
   gl.flush();return true;
  }
  function destroy(){
   if(disposed)return;disposed=true;
   gl.deleteBuffer(buffer);gl.deleteBuffer(staticBuffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  }
  return Object.freeze({
   supported:true,draw,destroy,
   stats:()=>Object.freeze({staticBoxes:staticMesh.boxes,staticVertices:staticMesh.vertices,
    staticBytes:staticMesh.bytes,staticUploads,staticDrawCalls,dynamicDrawCalls}),
   snapshot:stage.snapshot,
   turn:radians=>!disposed&&stage.turn(radians),
   step:distance=>!disposed&&stage.step(distance),
   reset:()=>{if(disposed)return false;stage.reset();return true;}
  });
 }
 root.CityGraphics=Object.freeze({KEY,ZOOM,QUALITY,createSettings,createTerrainPatch,createWorldScene,createStaticMesh,createAvatarRig,createAvatarMesh,createStage,avatarPose,cameraAvoid,createPreview,perspective,lookAt,multiply});
})(typeof window==='undefined'?globalThis:window);
