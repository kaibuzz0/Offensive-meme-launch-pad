import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const scope={window:{}};
for(const f of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-clans.js','city-visuals.js'])
 vm.runInNewContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),scope);
vm.runInNewContext(fs.readFileSync(new URL('../tokens.js',import.meta.url),'utf8'),scope);
const C=scope.window.MemeCityCore,V=scope.window.CityVisuals,tokens=scope.window.MEME_TOKENS;
const skins=['you-missed','maduro','redacted','congress','exit','rug'];
const distinctive={
 'you-missed':'#d12834',maduro:'#786443',redacted:'#ebebe9',
 congress:'#5dbd74',exit:'#8a6b4c',rug:'#a52755'
};
test('all six submitted token identities have genuinely distinct in-engine skins on the same 360 rig',()=>{
 assert.equal(C.CLAN_SKINS.length,6);
 for(const id of skins){
  assert.ok(tokens.some(t=>t.id===id&&t.art==='assets/coins/'+id+'.webp'),id+' uses its supplied coin icon');
  for(const armed of [true,false])for(let angle=0;angle<360;angle+=15){
   const surfaces=V.rigSurfaces({role:'player',clanSkin:id,style:{skin:0,hair:0,pants:0},armed,stridePose:3},angle*Math.PI/180);
   assert.ok(surfaces.some(f=>f.color===distinctive[id]),id+' has its own geometry, not just a recolored badge');
   assert.ok(surfaces.some(f=>f.print==='clan-'+id),id+' has its own clan print');
   assert.equal(surfaces.some(f=>f.color==='#829aa4'),armed,id+' retains original armed/idle rig');
   for(let j=1;j<surfaces.length;j++)assert.ok(surfaces[j-1].depth<=surfaces[j].depth,id+' keeps painter depth at '+angle);
  }
 }
});
test('saved or action-selected token skins stay locked without current positive signed proof',()=>{
 const e=new C.Engine(),p=e.join('holder-test','Player','offensive');
 for(const id of skins)assert.throws(()=>e.action(p.id,{type:'clanSkin',skin:id}),/Verify a positive balance/);
 p.clanSkin='redacted'; // simulated legacy save or tampered browser state
 assert.equal(C.verifiedSkin(p),null);
 assert.equal(e.snapshot(p.id).self.clanSkin,null);
 assert.equal(e.snapshot(p.id).players[0].clanSkin,null);
 p.holder={clan:'maduro',tier:1,expires:Date.now()+120000};
 assert.equal(C.verifiedSkin(p),null,'ownership of a different coin never unlocks another skin');
 assert.throws(()=>e.action(p.id,{type:'clanSkin',skin:'rug'}),/Verify a positive balance/);
 assert.equal(e.action(p.id,{type:'clanSkin',skin:'maduro'}).includes('equipped'),true);
 assert.equal(C.verifiedSkin(p),'maduro');
 assert.equal(e.snapshot(p.id).players[0].clanSkin,'maduro');
 p.holder.expires=Date.now()-1000;
 assert.equal(C.verifiedSkin(p),null,'expired ownership immediately removes appearance');
 assert.equal(e.snapshot(p.id).self.clanSkin,null,'server snapshot cannot leak expired outfit');
 p.holder=null;
 assert.equal(C.verifiedSkin(p),null);
 assert.doesNotThrow(()=>e.action(p.id,{type:'clanSkin',skin:null}));
});
test('mintless Rug Me Harder stays unavailable until a real on-chain mint exists',()=>{
 const rug=tokens.find(t=>t.id==='rug');
 assert.equal(rug.mint,null);
 const html=fs.readFileSync(new URL('../city.js',import.meta.url),'utf8');
 assert.ok(html.includes("if(!t.mint){status='COMING SOON"));
 assert.ok(html.includes('verifyHoldings(t.id)'),'checks exactly the selected token, not the wallet theme');
 assert.ok(html.includes("image:art.get(wearing||p.avatar)"),'in-world body uses the unlocked coin art');
 assert.ok(html.includes('clanSkin:wearing'),'verified skin goes to the existing player renderer');
 assert.ok(html.includes("clanSkin:skinId"),'wardrobe preview matches the real world');
});
