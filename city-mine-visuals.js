/* Original Canvas2D mine visuals. Generated underground slices share native
 * CityMining geology and journal; the server still owns all online actions.
 */
'use strict';
(function(root){
 const M=root.CityMining;
 if(!M?.createExplorer)throw Error('CityMining must load before CityMineVisuals');
 function diamond(ctx,x,y,hw,hh){
  ctx.beginPath();ctx.moveTo(x,y-hh);ctx.lineTo(x+hw,y);ctx.lineTo(x,y+hh);ctx.lineTo(x-hw,y);ctx.closePath();
 }
 function surface(ctx,openings){
  if(!Array.isArray(openings))return 0;
  for(const hole of openings){
   if(!hole||!Number.isFinite(hole.x)||!Number.isFinite(hole.y)||
    hole.w!==M.TILE||hole.h!==M.TILE||!M.validZ(hole.depth)||hole.depth>=0)continue;
   const {x,y,w,h}=hole;
   ctx.save();
   // Painted dirt/stone lip and recessed void, not collidable. The original
   // world physics remains authoritative, so a player cannot fall accidentally.
   ctx.fillStyle='#d0b99c88';ctx.fillRect(x-4,y-4,w+8,h+8);
   ctx.fillStyle='#26353d';ctx.fillRect(x-2,y-2,w+4,h+4);
   const depth=hole.shaft?Math.min(1,Math.abs(hole.depth)/64):.18;
   ctx.fillStyle='#060f19';ctx.fillRect(x+2,y+2,w-4,h-4);
   ctx.fillStyle=hole.shaft?'#6b92a4':'#658b72';
   ctx.fillRect(x+3,y+3,w-6,2);
   ctx.fillStyle='#3c6078';ctx.fillRect(x+2,y+2,Math.max(2,(w-4)*(1-depth)),2);
   if(hole.shaft){
    // A short railing and rope visibly identify the enterable shaft.
    ctx.strokeStyle='#c7a779';ctx.lineWidth=2;ctx.beginPath();
    ctx.moveTo(x+w/2,y-6);ctx.lineTo(x+w/2,y+17);
    ctx.moveTo(x+w/2-5,y+9);ctx.lineTo(x+w/2+5,y+9);ctx.stroke();
    ctx.fillStyle='#cbe7da';ctx.font='bold 7px monospace';ctx.textAlign='center';
    ctx.fillText('MINE',x+w/2,y-9);
   }
   ctx.restore();
  }
  return openings.length;
 }
 function slice(ctx,store,entry,player,drawAvatar){
  const at=M.location(entry);
  if(!ctx||!at||!store||!player||!Number.isInteger(player.layer)||
   player.layer<0||player.layer>=M.STRATA.length)return false;
  const canvas=ctx.canvas,width=canvas?.width||640,height=canvas?.height||360,
    layer=M.STRATA[player.layer],upper=player.z;
  ctx.save();ctx.clearRect(0,0,width,height);
  const bg=ctx.createLinearGradient(0,0,0,height);
  bg.addColorStop(0,'#111e2d');bg.addColorStop(1,'#071019');
  ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
  // Tunnel cross-section reads as a recessed structure, not as an extra
  // world, with subtle seeded rock fractures around the viewport.
  for(let i=0;i<42;i++){
   const x=(Math.imul(i+1,14713)%width),y=(Math.imul(i+7,3917)%height);
   ctx.fillStyle=i%3===0?'#bfd5cd18':'#bfd5cd0e';ctx.fillRect(x,y,2+(i%5),1);
  }
  ctx.fillStyle='#d6e9dc';ctx.font='bold 12px monospace';ctx.textAlign='left';
  ctx.fillText(at.region.name.toUpperCase()+' / '+layer.name.toUpperCase(),18,23);
  ctx.fillStyle='#9fbcba';ctx.font='11px monospace';
  ctx.fillText('PLAYER z '+upper+'   •   EXCAVATION z '+layer.z,18,42);
  const stepX=Math.max(27,Math.min(46,width/13.8)),stepY=Math.max(14,Math.min(21,height/18)),
   centerX=width*.5,top=height*.19;
  function cell(cx,cy){
   return{x:centerX+(cx-cy)*stepX,y:top+(cx+cy)*stepY};
  }
  for(let row=0;row<5;row++)for(let col=0;col<5;col++){
   const dx=col-2,dy=row-2,sample=store.inspect(entry,dx,dy,player.layer);
   if(!sample)continue;
   const {x,y}=cell(col,row),h=sample.mined?4:Math.max(10,14+sample.hardness*2);
   // Lower faces are geometry; mined cells show open dark floor and chamfered
   // walls, with ore glints only if geology truly contains an ore.
   ctx.fillStyle=sample.mined?'#192d37':'#263943';
   diamond(ctx,x,y+6,stepX-2,stepY-1);ctx.fill();
   ctx.fillStyle=sample.mined?'#08141e':'#334956';
   ctx.beginPath();ctx.moveTo(x-stepX+2,y+5);
   ctx.lineTo(x,y+stepY+6);ctx.lineTo(x,y+stepY+6+h);
   ctx.lineTo(x-stepX+2,y+5+h);ctx.closePath();ctx.fill();
   ctx.fillStyle=sample.mined?'#0b1823':'#1b303b';
   ctx.beginPath();ctx.moveTo(x+stepX-2,y+5);
   ctx.lineTo(x,y+stepY+6);ctx.lineTo(x,y+stepY+6+h);
   ctx.lineTo(x+stepX-2,y+5+h);ctx.closePath();ctx.fill();
   ctx.fillStyle=sample.mined?'#0b1d28':sample.color;
   diamond(ctx,x,y-h+6,stepX-2,stepY-1);ctx.fill();
   ctx.strokeStyle=sample.mined?'#355765':'#b9c4b02a';
   ctx.lineWidth=1;ctx.stroke();
   if(!sample.mined&&sample.material!=='soil'&&sample.material!=='stone'&&sample.material!=='bedrock'){
    ctx.fillStyle='#ffffffa6';ctx.beginPath();ctx.arc(x-6,y-h+5,2.4,0,Math.PI*2);ctx.fill();
   }
   if(dx===0&&dy===0){
    ctx.strokeStyle='#e9d681';ctx.lineWidth=2;
    diamond(ctx,x,y-h+6,stepX-1,stepY);ctx.stroke();
   }
  }
  const px=player.dx+2,py=player.dy+2;
  if(px>=0&&px<5&&py>=0&&py<5){
   const {x,y}=cell(px,py);
   // Caller supplies the *existing* unified World V1 avatar renderer with
   // verified cosmetics. Keep the cave renderer independent of the wardrobe
   // and wallet services; never fork a second human/skeleton/gear drawing.
   ctx.save();
   ctx.fillStyle='#030c16a8';ctx.beginPath();ctx.ellipse(x,y+7,15,5,0,0,Math.PI*2);ctx.fill();
   if(typeof drawAvatar==='function')drawAvatar(ctx,x,y+7,player);
   else{
    // Noninteractive/documentation consumers without an avatar renderer still
    // see the local player marker. No separate fake "miner avatar" is made.
    ctx.strokeStyle='#e5f2c2';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(x,y+7,12,0,Math.PI*2);ctx.stroke();
   }
   ctx.restore();
  }
  ctx.textAlign='left';ctx.font='10px monospace';ctx.fillStyle='#a9c0c4';
  ctx.fillText('DIG SOLID ROCK  •  WALK ONLY THROUGH CLEARED TUNNELS',14,height-13);
  ctx.restore();
  return true;
 }
 root.CityMineVisuals=Object.freeze({surface,slice});
})(typeof window==='undefined'?globalThis:window);
