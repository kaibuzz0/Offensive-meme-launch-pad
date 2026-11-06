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
 // AO-like local terrain occlusion and a sun-facing heightfield shadow cue.
 // Reuses already-sampled neighbor columns; no new sampling or GPU pass.
 function surfaceLight(tile,neighbors){
  const h=tile.height;
  const delta=neighbors.map(n=>Math.max(0,(n?.height??h)-h));
  const ambient=clamp(1-(delta[0]+delta[1]+delta[2]+delta[3])*.018,.46,1);
  // Sun direction has positive X and Z components: raised neighbors in
  // these directions darken the lower ground's top face.
  const directional=clamp(1-(delta[1]*.035+delta[3]*.020),.54,1);
  return clamp(ambient*directional,.30,1);
 }
 // Deterministic baked relief shadow: trace a few heightfield samples
 // toward the fixed simulated sun. Unlike contact AO, a ridge may shade a
 // distant valley cell; no extra WebGL depth framebuffer is allocated.
 function terrainCastShade(world,x,z,height,stride=1){
  if(!world?.surfaceAt)return 1;
  let occlusion=0;
  for(let step=1;step<=5;step++){
   const dx=step*stride*2,dz=step*stride;
   const ahead=world.surfaceAt(x+dx,z+dz);
   if(!ahead)continue;
   const ray=height+step*stride*4.0;
   const barrier=ahead.height-ray;
   if(barrier>0)occlusion=Math.max(occlusion,Math.min(1,barrier/22));
  }
  return 1-occlusion*.42;
 }
 function waterColor(depth){
  const t=clamp(depth/45,0,1);
  return [.08-.035*t,.48-.16*t,.64-.12*t];
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
   const sides=[
    {n:world.surfaceAt(x-stride,z),axis:'left'},
    {n:world.surfaceAt(x+stride,z),axis:'right'},
    {n:world.surfaceAt(x,z-stride),axis:'front'},
    {n:world.surfaceAt(x,z+stride),axis:'back'}
   ];
   const topShade=(tile.slope>13?.86:tile.material==='shore'?.96:1)*surfaceLight(tile,sides.map(s=>s.n))*terrainCastShade(world,x,z,y,stride);
   const groundTint=color.map(v=>v*topShade);
   quad(data,[x,y+1,z],[x+stride,y+1,z],[x+stride,y+1,z+stride],[x,y+1,z+stride],groundTint,[0,1,0]);
   const shade=color.map(v=>v*(tile.material==='cave-rock'?.45:tile.material==='cliff'?.72:.79));
   for(const side of sides){
    const low=side.n?.height??y;
    if(low>=y)continue;
    const a=low+1,b=y+1;
    // The taller external heightfield normally draws one continuous cliff
    // face against its lower neighbor. Remove the gallery-height portion of
    // that face at a cave entrance so a real passage is visible and traversable.
    const neighbor=side.axis==='left'?[x-1,z]:
     side.axis==='right'?[x+1,z]:
     side.axis==='front'?[x,z-1]:[x,z+1];
    const opening=stride===1?world.caveRoomAt?.(...neighbor):null;
    const spans=opening&&opening.floor<b&&opening.ceiling>a?
      [[a,Math.min(b,opening.floor)],[Math.max(a,opening.ceiling),b]]:[[a,b]];
    for(const [bottom,top] of spans){
     if(top-bottom<.01)continue;
     if(side.axis==='left')quad(data,[x,bottom,z],[x,top,z],[x,top,z+stride],[x,bottom,z+stride],shade,[-1,0,0]);
     if(side.axis==='right')quad(data,[x+stride,bottom,z],[x+stride,bottom,z+stride],[x+stride,top,z+stride],[x+stride,top,z],shade,[1,0,0]);
     if(side.axis==='front')quad(data,[x,bottom,z],[x+stride,bottom,z],[x+stride,top,z],[x,top,z],shade,[0,0,-1]);
     if(side.axis==='back')quad(data,[x,bottom,z+stride],[x,top,z+stride],[x+stride,top,z+stride],[x+stride,bottom,z+stride],shade,[0,0,1]);
    }
   }
   if(tile.water){
    const water=waterColor(world.SEA_LEVEL-y);
    const yy=world.SEA_LEVEL+1.15;
    // Normal.y = -2 is a reserved water-only marker for shader routing.
    quad(data,[x,yy,z],[x+stride,yy,z],[x+stride,yy,z+stride],[x,yy,z+stride],water,[0,-2,0]);
    // Narrow bright shore strips. A separate high-altitude foam surface
    // avoids blending/sorting glitches on WebGL1 mobile GPUs.
    if(stride===1){
     const foam=[.60,.73,.69],fy=yy+.035,t=.17;
     if(sides[0].n?.height>=world.SEA_LEVEL)quad(data,[x,fy,z],[x+t,fy,z],[x+t,fy,z+1],[x,fy,z+1],foam,[0,1,0]);
     if(sides[1].n?.height>=world.SEA_LEVEL)quad(data,[x+1-t,fy,z],[x+1,fy,z],[x+1,fy,z+1],[x+1-t,fy,z+1],foam,[0,1,0]);
     if(sides[2].n?.height>=world.SEA_LEVEL)quad(data,[x,fy,z],[x+1,fy,z],[x+1,fy,z+t],[x,fy,z+t],foam,[0,1,0]);
     if(sides[3].n?.height>=world.SEA_LEVEL)quad(data,[x,fy,z+1-t],[x+1,fy,z+1-t],[x+1,fy,z+1],[x,fy,z+1],foam,[0,1,0]);
    }
   }
  }
  // Actual enclosed gallery geometry lives *below* the external heightfield.
  // Build it only for high-detail nearby chunks, not the distant 4x LOD.
  // Same x/y/z as outside: entering a shaft never switches to another world.
  if(stride===1&&typeof world.caveRoomAt==='function'){
   for(const tile of chunk.tiles){
    const r=world.caveRoomAt(tile.x,tile.z);
    if(!r)continue;
    const x=tile.x,z=tile.z,floor=r.floor,ceil=r.ceiling;
    const chamber=r.kind==='chamber-a'||r.kind==='chamber-b';
    const rock=chamber?[.25,.28,.30]:[.21,.24,.27];
    const base=chamber?[.30,.30,.29]:[.27,.29,.29];
    const vault=chamber?[.19,.21,.23]:[.16,.18,.23];
    if(!r.exposed||floor<tile.height+.85){
     quad(data,[x,floor,z],[x+1,floor,z],[x+1,floor,z+1],[x,floor,z+1],base,[0,1,0]);
    }
    // Cave roof is hollow below the solid world. At entrance the roof is
    // deliberately omitted so the opening is visible from the surface.
    if(!r.exposed){
     quad(data,[x,ceil,z+1],[x+1,ceil,z+1],[x+1,ceil,z],[x,ceil,z],vault,[0,-1,0]);
    }
    const side=[
     {dx:-1,dz:0,n:[1,0,0]},
     {dx:1,dz:0,n:[-1,0,0]},
     {dx:0,dz:-1,n:[0,0,1]},
     {dx:0,dz:1,n:[0,0,-1]}
    ];
    for(const face of side){
     const n=world.caveRoomAt(x+face.dx,z+face.dz);
     if(n&&n.floor<=ceil-2&&n.ceiling>=floor+2)continue;
     if(face.dx===-1)quad(data,[x,floor,z],[x,floor,z+1],[x,ceil,z+1],[x,ceil,z],rock,face.n);
     if(face.dx===1)quad(data,[x+1,floor,z+1],[x+1,floor,z],[x+1,ceil,z],[x+1,ceil,z+1],rock,face.n);
     if(face.dz===-1)quad(data,[x+1,floor,z],[x,floor,z],[x,ceil,z],[x+1,ceil,z],rock,face.n);
     if(face.dz===1)quad(data,[x,floor,z+1],[x+1,floor,z+1],[x+1,ceil,z+1],[x,ceil,z+1],rock,face.n);
    }
    if(!r.exposed&&r.t>6&&((x*7+z*11)&15)===0){
     const height=1.6+((x^z)&3),tint=((x*3+z*5)&3)===0?[.36,.56,.65]:[.31,.34,.36];
     canopy(data,x+.5,ceil-.3,z+.5,.37,height,.37,tint,.2);
    }
    // Small subterranean mineral clusters give chambers a readable
    // silhouette at lantern range without requiring bulky texture assets.
    if(chamber&&!r.exposed&&((x*31+z*17)&31)===0){
     const pale=((x^z)&3)===0?[.40,.56,.62]:[.29,.42,.48];
     canopy(data,x+.5,floor+.45,z+.5,.28,.65,.28,pale,.6);
    }
   }
  }
  for(const plant of chunk.plants){
   if(['pine','palm','tree'].includes(plant.type)){
    const {x,z,y}=plant,shadow=[.13,.19,.13];
    quad(data,[x-.35,y+.012,z-.35],[x+1.35,y+.012,z-.35],
      [x+1.35,y+.012,z+1.35],[x-.35,y+.012,z+1.35],shadow,[0,1,0]);
   }
   foliage(data,plant);
  }
  return {data:new Float32Array(data),tiles:chunk.tiles.length,plants:chunk.plants.length,
   vertices:data.length/9};
 }
 // Procedural material grain, atmosphere and water. No external textures.
 // Small-scale rock grain, strata, crevice shading and water highlights are
 // generated in WebGL1, avoiding large downloaded textures for low-data phones.
 const vertexSource='attribute vec3 aPos;attribute vec3 aColor;attribute vec3 aNormal;'+
  'uniform mat4 uMatrix;uniform vec3 uEye;uniform float uTime;'+
  'varying vec3 vColor;varying float vDist;'+
  'varying vec3 vPosition;varying vec3 vNormal;varying float vWater;'+
  'void main(){vWater=aNormal.y< -1.5?1.0:0.0;'+
  // World-space coordinates guarantee identical displacement on shared chunk edges.
  'float wave=sin(aPos.x*.81+uTime*.8)*sin(aPos.z*.62-uTime*.7);'+
  'vec3 surface=aPos+vec3(0.0,vWater*.065*wave,0.0);'+
  'gl_Position=uMatrix*vec4(surface,1.0);'+
  'vColor=aColor;vDist=distance(surface,uEye);vPosition=surface;vNormal=aNormal;}';
 const fragmentSource='precision mediump float;varying vec3 vColor;varying float vDist;'+
  'varying vec3 vPosition;varying vec3 vNormal;varying float vWater;uniform float uTime;'+
  'uniform vec3 uLampEye;uniform float uUnderground;'+
  'float grit(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}'+
  'float gravel(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);'+
  'return mix(mix(grit(i),grit(i+vec2(1,0)),f.x),mix(grit(i+vec2(0,1)),grit(i+vec2(1,1)),f.x),f.y);}'+
  'void main(){vec3 unitNormal=vWater>.5?vec3(0.0,1.0,0.0):normalize(vNormal);'+
  'vec3 n=abs(unitNormal);'+
  'vec2 uv=n.y>.5?vPosition.xz:(n.x>n.z?vPosition.zy:vPosition.xy);'+
  'float fine=gravel(uv*2.6),coarse=gravel(uv*.45);'+
  'vec2 relief=vec2(sin(uv.x*9.4+coarse*3.0),cos(uv.y*8.1+fine*4.0))*.075;'+
  'vec3 tangent=n.y>.5?vec3(relief.x,0.0,relief.y):'+
  '(n.x>n.z?vec3(0.0,relief.x,relief.y):vec3(relief.x,relief.y,0.0));'+
  'vec3 litNormal=normalize(unitNormal+tangent);'+
  'vec3 sunDir=normalize(vec3(.40,.87,.22));'+
  'float sunDiffuse=max(0.0,dot(litNormal,sunDir));'+
  'vec3 color=vColor*(.30+.65*sunDiffuse);'+
  'float seams=sin(vPosition.y*.51+coarse*3.1)*.045;'+
  'float mineral=(fine-.5)*.24+(coarse-.5)*.16+seams;'+
  'color*=clamp(1.0+mineral,.68,1.2);'+
  'color+=vec3(.035,.047,.036)*pow(max(0.0,coarse-.68),2.0)*3.5;'+
  'if(vWater>.5){'+
  'float phaseX=vPosition.x*.81+uTime*.8,phaseZ=vPosition.z*.62-uTime*.7;'+
  'float slopeX=.065*.81*cos(phaseX)*sin(phaseZ);'+
  'float slopeZ=.065*.62*sin(phaseX)*cos(phaseZ);'+
  'vec3 waterNormal=normalize(vec3(-slopeX,1.0,-slopeZ));'+
  'float wave=sin(phaseX)*sin(phaseZ);'+
  'float gleam=pow(max(0.0,sin((vPosition.x+vPosition.z)*1.7+uTime*1.5)),16.0);'+
  'vec3 toEye=normalize(uLampEye-vPosition+vec3(0.0001));'+
  'float sunGlint=pow(max(0.0,dot(reflect(-sunDir,waterNormal),toEye)),24.0);'+
  'float fresnel=pow(1.0-clamp(dot(toEye,vec3(0.0,1.0,0.0)),0.0,1.0),3.0);'+
  'color=vColor*(.62+.18*wave)+vec3(.18,.22,.23)*gleam+vec3(.07,.13,.16)*fresnel+vec3(.22,.20,.16)*sunGlint;}'+
  'float torch=1.0/(1.0+.009*pow(distance(vPosition,uLampEye),2.0));'+
  'vec3 cavern=color*(.10+.84*torch)+vec3(.22,.145,.075)*torch;'+
  'color=mix(color,cavern,uUnderground);'+
  'float fog=mix(smoothstep(55.0,235.0,vDist),smoothstep(24.0,75.0,vDist),uUnderground);'+
  'vec3 haze=mix(vec3(.63,.77,.88),vec3(.017,.025,.030),uUnderground);'+
  'gl_FragColor=vec4(mix(color,haze,fog),1.0);}';
 const skyVertex='attribute vec2 aXY;varying vec2 vUV;'+
  'void main(){gl_Position=vec4(aXY,0.9999,1.0);vUV=aXY*.5+.5;}';
 const skyFragment='precision mediump float;varying vec2 vUV;uniform vec2 uLook;uniform float uTime;'+
  'void main(){float y=clamp(vUV.y,0.0,1.0);'+
  'vec3 sky=mix(vec3(.75,.83,.85),vec3(.12,.35,.63),smoothstep(.1,1.0,y));'+
  'float drift=uTime*.003+uLook.x*.22;'+
  'float structure=sin((vUV.x+drift)*26.0+sin(vUV.y*39.0)*1.6)*.34+'+
  'sin((vUV.x+drift)*43.0-vUV.y*18.0)*.20;'+
  'float clouds=smoothstep(.17,.52,structure)*smoothstep(.40,.62,y)*(1.0-smoothstep(.88,.98,y));'+
  'sky=mix(sky,vec3(.89,.91,.91),clouds*.58);'+
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
 function createRenderer(canvas,world,biomeDefinitions){
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
   eye:gl.getUniformLocation(program,'uEye'),
   lampEye:gl.getUniformLocation(program,'uLampEye'),
   underground:gl.getUniformLocation(program,'uUnderground')
  };
  const skyProgram=gl.createProgram();
  gl.attachShader(skyProgram,shader(gl,gl.VERTEX_SHADER,skyVertex));
  gl.attachShader(skyProgram,shader(gl,gl.FRAGMENT_SHADER,skyFragment));
  gl.linkProgram(skyProgram);
  if(!gl.getProgramParameter(skyProgram,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(skyProgram));
  const skyBuffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const skyPos=gl.getAttribLocation(skyProgram,'aXY'),skyLook=gl.getUniformLocation(skyProgram,'uLook'),
   skyTime=gl.getUniformLocation(skyProgram,'uTime');
  const timeUniform=gl.getUniformLocation(program,'uTime');
  const chunks=new Map(),MAX_CHUNKS=176,MAX_GPU_BYTES=24*1024*1024,RADIUS=7,NEAR_RADIUS=3;
  let adaptiveRadius=RADIUS,frameAverage=16.7,lastFrameTime=null,slowFrames=0,fastFrames=0,renderScale=1;
  let allocated=0,disposed=false,worker=null,workerReady=false,workerStatus='unavailable';
  const inFlight=new Map(),MAX_IN_FLIGHT=2;
  let nextRequestId=1,viewCX=0,viewCZ=0;
  function disableWorker(){
   if(worker){worker.onmessage=null;worker.onerror=null;worker.terminate();worker=null;}
   workerReady=false;inFlight.clear();workerStatus='fallback';
  }
  // Terrain is generated in the worker from the SAME original biome catalog
  // and world seed; never send shuffled anchors or independently mutate maps.
  if(typeof Worker==='function'&&Array.isArray(biomeDefinitions)&&biomeDefinitions.length===132){
   try{
    worker=new Worker('city-voxel-mesh-worker.js',{name:'meme-city-voxel-mesher'});
    workerStatus='starting';
    worker.onmessage=(event)=>{
     if(disposed)return;
     const m=event?.data||{};
     if(m.type==='ready'){
      if(m.seedHash!==world.seed||m.biomeCount!==132){disableWorker();return;}
      workerReady=true;workerStatus='ready';return;
     }
     if(m.type==='error'){disableWorker();return;}
     if(m.type!=='mesh')return;
     const req=inFlight.get(m.id);
     if(!req)return;
     inFlight.delete(m.id);
     if(m.cx!==req.cx||m.cz!==req.cz||m.stride!==req.stride||
        m.seedHash!==world.seed||!(m.buffer instanceof ArrayBuffer)){
      disableWorker();return;
     }
     const distance=(m.cx-viewCX)**2+(m.cz-viewCZ)**2;
     if(distance>(adaptiveRadius+1)**2+1)return; // stale view
     if(!Number.isSafeInteger(m.vertices)||m.vertices<0||
        m.buffer.byteLength!==m.vertices*36||m.buffer.byteLength>MAX_GPU_BYTES){
      disableWorker();return;
     }
     const key=m.cx+':'+m.cz,existing=chunks.get(key);
     if(existing&&existing.stride<=m.stride)return;
     if(existing)release(key);
     upload(m.cx,m.cz,m.stride,new Float32Array(m.buffer),m.vertices);
    };
    worker.onerror=()=>disableWorker();
    const definitions=biomeDefinitions.map(b=>({id:b.id,name:b.name,group:b.group,
     material:b.material,hue:b.hue,sat:b.sat,light:b.light}));
    worker.postMessage({type:'init',seed:world.atlas.seed,definitions});
   }catch{disableWorker();}
  }
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  function release(key){
   const c=chunks.get(key);if(c){gl.deleteBuffer(c.buffer);allocated=Math.max(0,allocated-c.bytes);chunks.delete(key);}
  }
  function dispose(){
   disposed=true;disableWorker();
   for(const key of chunks.keys())release(key);
   gl.deleteBuffer(skyBuffer);gl.deleteProgram(skyProgram);gl.deleteProgram(program);
  }
  function upload(cx,cz,stride,data,vertices){
   if(disposed||data.byteLength>MAX_GPU_BYTES)return;
   const key=cx+':'+cz;
   // Hard cap even between animation frames: an asynchronous worker callback
   // cannot briefly oversubscribe the GPU memory budget.
   while(allocated+data.byteLength>MAX_GPU_BYTES&&chunks.size){
    let victim=null,farthest=-1;
    for(const [id,c] of chunks){
     const distance=(c.cx-viewCX)**2+(c.cz-viewCZ)**2;
     if(distance>farthest){farthest=distance;victim=id;}
    }
    if(victim===null)break;
    release(victim);
   }
   const buffer=gl.createBuffer();if(!buffer)return;
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
   chunks.set(key,{cx,cz,stride,buffer,vertices,bytes:data.byteLength});
   allocated+=data.byteLength;
  }
  function load(cx,cz,stride){
   const key=cx+':'+cz;
   const existing=chunks.get(key);if(existing&&existing.stride<=stride)return;
   if(workerReady){
    if(inFlight.size>=MAX_IN_FLIGHT||[...inFlight.values()].some(r=>r.cx===cx&&r.cz===cz))return;
    const id=nextRequestId++;
    inFlight.set(id,{cx,cz,stride});
    try{worker.postMessage({type:'mesh',id,cx,cz,stride});}
    catch{disableWorker();}
    return;
   }
   if(worker){return;} // Worker initializing: no blocking terrain generation.
   const mesh=generateMesh(world,cx,cz,stride);
   if(!mesh||mesh.data.byteLength>MAX_GPU_BYTES)return;
   if(existing)release(key);
   upload(cx,cz,stride,mesh.data,mesh.vertices);
  }
  function render(player){
   const clock=typeof performance!=='undefined'?performance.now():null;
   if(clock!==null&&lastFrameTime!==null){
    const elapsed=Math.min(120,Math.max(1,clock-lastFrameTime));
    frameAverage=frameAverage*.95+elapsed*.05;
    if(frameAverage>33){slowFrames++;fastFrames=0;}
    else if(frameAverage<20){fastFrames++;slowFrames=0;}
    else{slowFrames=0;fastFrames=0;}
    if(slowFrames>90){adaptiveRadius=5;renderScale=.76;slowFrames=0;}
    if(fastFrames>210){adaptiveRadius=RADIUS;renderScale=1;fastFrames=0;}
   }
   lastFrameTime=clock;
   const rect=canvas.getBoundingClientRect();
   const dpr=Math.min(window.devicePixelRatio||1,1.5)*renderScale;
   const width=Math.max(2,Math.round(rect.width*dpr)),height=Math.max(2,Math.round(rect.height*dpr));
   if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
   gl.viewport(0,0,width,height);
   gl.clearColor(.63,.77,.88,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.disable(gl.DEPTH_TEST);
   gl.useProgram(skyProgram);
   gl.uniform2f(skyLook,player.yaw,player.pitch);
   gl.uniform1f(skyTime,(typeof performance!=='undefined'?performance.now():0)/1000);
   gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);
   gl.enableVertexAttribArray(skyPos);
   gl.vertexAttribPointer(skyPos,2,gl.FLOAT,false,0,0);
   gl.drawArrays(gl.TRIANGLES,0,3);
   gl.disableVertexAttribArray(skyPos);
   gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);
   const px=Math.floor(player.x/16),pz=Math.floor(player.z/16),wanted=[];
   for(let dz=-adaptiveRadius;dz<=adaptiveRadius;dz++)for(let dx=-adaptiveRadius;dx<=adaptiveRadius;dx++){
    if(dx*dx+dz*dz>adaptiveRadius*adaptiveRadius+1)continue;
    wanted.push({cx:px+dx,cz:pz+dz,d:dx*dx+dz*dz,stride:dx*dx+dz*dz<=NEAR_RADIUS*NEAR_RADIUS+1?1:4});
   }
   wanted.sort((a,b)=>a.d-b.d);
   const targets=new Set(wanted.map(c=>c.cx+':'+c.cz));
   for(const k of chunks.keys())if(!targets.has(k))release(k);
   // Only one heavy mesh generation/upload per frame, so Android movement
   // remains interactive even when new mountain chunks enter the viewport.
   const missing=wanted.find(c=>{
    const existing=chunks.get(c.cx+':'+c.cz);
    if(existing&&existing.stride<=c.stride)return false;
    return ![...inFlight.values()].some(req=>req.cx===c.cx&&req.cz===c.cz);
   });
   viewCX=px;viewCZ=pz;
   if(missing)load(missing.cx,missing.cz,missing.stride);
   while(chunks.size>MAX_CHUNKS||allocated>MAX_GPU_BYTES){
    // Evict the farthest rather than the oldest, so near caves and trees
    // stay loaded while a phone is moving through a high-detail valley.
    let victim=null,dist=-1;
    for(const [key,c] of chunks){
     const d=(c.cx-px)**2+(c.cz-pz)**2;
     if(d>dist){dist=d;victim=key;}
    }
    if(!victim)break;
    release(victim);
   }
   const eye=[player.x,player.y+world.EYE_HEIGHT,player.z];
   gl.useProgram(program);
   gl.uniform1f(timeUniform,(typeof performance!=='undefined'?performance.now():0)/1000);
   gl.uniformMatrix4fv(loc.matrix,false,multiply(perspective(width/height),view(eye,player.yaw,player.pitch)));
   gl.uniform3fv(loc.eye,eye);
   const surface=world.surfaceAt(Math.floor(player.x),Math.floor(player.z));
   const chamber=world.caveRoomAt?.(Math.floor(player.x),Math.floor(player.z));
   const underground=!!chamber&&!chamber.exposed&&!!surface&&eye[1]<surface.height+1;
   gl.uniform3fv(loc.lampEye,eye);
   gl.uniform1f(loc.underground,underground?1:0);
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
   return {loaded:chunks.size,wanted:wanted.length,vertices:verts,bytes,gpuBytes:allocated,
    viewRadius:adaptiveRadius,renderScale,frameAverage,underground,
    workerStatus,pendingMeshes:inFlight.size,glError:gl.getError()};
  }
  return Object.freeze({gl,render,dispose,chunkCount:()=>chunks.size,
   meshAt:(cx,cz)=>generateMesh(world,cx,cz),workerStatus:()=>workerStatus});
 }
 root.CityVoxelRenderer=Object.freeze({createRenderer,generateMesh,rgb,surfaceLight,terrainCastShade,waterColor,
  VOXEL_METERS:.25,MAX_GPU_CHUNKS:176,MAX_GPU_BYTES:24*1024*1024});
})(typeof window==='undefined'?globalThis:window);
