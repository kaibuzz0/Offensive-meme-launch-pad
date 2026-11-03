import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function game(){
 const c={};c.window=c;
 for(const file of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-clans.js','city-center-save.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),c);
 const C=c.MemeCityCore,e=new C.Engine(),p=e.join('siege','Fortress QA','offensive');
 for(const b of e.arcade.bots){b.hp=0;b.respawn=10000;}
 e.arcade.zombieNext=1000;
 Object.assign(p,{x:C.WORLD.spawn.x,y:C.WORLD.spawn.y,invulnerable:1000});
 return {C,e,p,root:c};
}
function site(C,col=8,row=8){return {x:C.PLOT.x+col*64+32,y:C.PLOT.y+row*64+32};}
function tick(e,t){for(let i=0;i<Math.ceil(t/.05);i++)e.tick(.05);}
const raids=e=>e.arcade.bots.filter(b=>b.raid&&b.hp>0);
function anchor(e,p,C,b,part){
 const pt=part?site(C,part.col,part.row):site(C,8,5);
 Object.assign(b,{x:pt.x+70,y:pt.y+70,cooldown:100,siegeCooldown:0,hp:70,maxHp:70});
 p.invulnerable=1000;return pt;
}
test('the same original defense drill creates damageable tiles and a command core, not a separate world or saved plot schema',()=>{
 const {C,e,p,root}=game();p.credits=500;e.action(p.id,{type:'build',kind:'wall',col:8,row:8});
 const original=JSON.stringify(p.plot),save=JSON.stringify(root.CityRising.save(p));
 e.action(p.id,{type:'defenseDrill'});
 assert.equal(raids(e).length,4);
 assert.equal(p.defense.coreHP,200);
 assert.equal(p.defense.coreMaxHP,200);
 assert.equal(p.defense.pieces.length,1);
 assert.equal(p.defense.pieces[0].maxHp,70);
 assert.equal(C.blocked(site(C).x,site(C).y,p),true);
 assert.equal(JSON.stringify(p.plot),original);
 assert.equal(JSON.stringify(root.CityRising.save(p)),save);
 assert.equal(root.CityCenterSave.SAVE_VERSION,6);
 assert.throws(()=>e.action(p.id,{type:'demolish',col:8,row:8}),/Finish the fortress siege/);
 assert.throws(()=>e.action(p.id,{type:'build',kind:'wall',col:9,row:8}),/Finish the fortress siege/);
});
test('raiders create actual passable breaches; proximity-checked paid repair restores collision and leaves save untouched',()=>{
 const {C,e,p}=game();p.credits=500;e.action(p.id,{type:'build',kind:'wall',col:8,row:8});
 const pt=site(C),original=JSON.stringify(p.plot);
 e.action(p.id,{type:'defenseDrill'});p.defense.countdown=0;
 const b=raids(e)[0];anchor(e,p,C,b,p.defense.pieces[0]);
 for(const extra of raids(e).slice(1))extra.siegeCooldown=999;
 for(let i=0;i<4;i++){b.siegeCooldown=.00001;e.tick(.05);}
 assert.equal(p.defense.pieces[0].hp,0,'wall is physically breached');
 assert.ok(p.defense.breaches>=1);
 assert.equal(C.blocked(pt.x,pt.y,p),false,'breach is walkable, not just visual damage');
 assert.equal(C.blocked(pt.x,pt.y,b),false,'raider also crosses the breach');
 assert.equal(JSON.stringify(p.plot),original,'saved plot tile never deleted');
 assert.throws(()=>e.action(p.id,{type:'repairDefense',target:'piece',col:18,row:99}),/valid damaged structure/);
 assert.throws(()=>e.action(p.id,{type:'repairDefense',target:'piece',col:1,row:1}),/does not belong/);
 const credits=p.credits;
 assert.throws(()=>e.action(p.id,{type:'repairDefense',target:'piece',col:8,row:8}),/Walk next/);
 // Move the character to the open adjacent tile, not into the breached wall.
 Object.assign(p,{x:pt.x+105,y:pt.y});
 assert.throws(()=>e.action(p.id,{type:'repairDefense',target:'piece',col:8,row:8}),/Clear the breached tile/,'raider must be displaced before wall becomes solid');
 Object.assign(b,{x:pt.x+200,y:pt.y+200});
 assert.match(e.action(p.id,{type:'repairDefense',target:'piece',col:8,row:8}),/34 integrity/);
 assert.equal(p.credits,credits-8);
 assert.equal(p.defense.pieces[0].hp,34);
 assert.equal(C.blocked(pt.x,pt.y,p),true,'repaired wall stops movement');
 assert.equal(JSON.stringify(p.plot),original);
});
test('command core loses HP under actual enemy assault and can be repaired only nearby with correct cost',()=>{
 const {C,e,p}=game();e.action(p.id,{type:'defenseDrill'});p.defense.countdown=0;
 const b=raids(e)[0];for(const extra of raids(e).slice(1))extra.siegeCooldown=999;
 anchor(e,p,C,b,null);
 e.tick(.05);
 assert.equal(p.defense.coreHP,190);
 const before=p.credits;
 assert.throws(()=>e.action(p.id,{type:'repairDefense',target:'core'}),/Walk closer/);
 Object.assign(p,{x:site(C,8,5).x,y:site(C,8,5).y});
 assert.match(e.action(p.id,{type:'repairDefense',target:'core'}),/48 integrity/);
 assert.equal(p.defense.coreHP,200);
 assert.equal(p.credits,before-18);
 assert.throws(()=>e.action(p.id,{type:'repairDefense',target:'core'}),/already at full integrity/);
});
test('core destruction loses siege once, cleans all raiders and never charges a real token or deletes plot/crew',()=>{
 const {C,e,p}=game();e.action(p.id,{type:'defenseDrill'});p.defense.countdown=0;
 const original=JSON.stringify({plot:p.plot,crew:p.crew});
 const startCredits=p.credits;
 for(let i=0;i<8&&p.defense;i++){
  for(const b of raids(e)){b.siegeCooldown=.00001;b.hp=70;}
  e.tick(.05);
 }
 assert.equal(p.defense,null);
 assert.equal(p.defenseResult.status,'breached');
 assert.equal(p.defenseResult.reward,0);
 assert.equal(p.credits,startCredits);
 assert.equal(p.xp,0);
 assert.equal(raids(e).length,0);
 assert.equal(JSON.stringify({plot:p.plot,crew:p.crew}),original);
 tick(e,1);
 assert.equal(p.credits,startCredits,'failed siege cannot reward on later ticks');
 assert.throws(()=>e.action(p.id,{type:'defenseDrill'}),/recharging/);
});
test('siege victory is paid exactly once; cancellation, timeout and player defeat do not pay',()=>{
 for(const status of ['won','abandoned','expired','busted']){
  const {e,p}=game(),credits=p.credits;
  e.action(p.id,{type:'defenseDrill'});
  if(status==='won'){for(const b of raids(e))b.hp=0;e.tick(.05);}
  if(status==='abandoned')e.action(p.id,{type:'endDefense'});
  if(status==='expired'){p.defense.countdown=0;p.defense.timeLeft=.01;e.tick(.05);}
  if(status==='busted'){p.hp=0;p.defense.countdown=0;e.tick(.05);if(p.defense)throw Error('Bust state did not interrupt the siege');}
  assert.equal(p.defense,null,status+' should close');
  assert.equal(p.defenseResult.status,status);
  assert.equal(p.credits,status==='won'?credits+60:credits);
  assert.equal(p.xp,status==='won'?40:0);
  assert.equal(raids(e).length,0);
  tick(e,1);
  assert.equal(p.credits,status==='won'?credits+60:credits,'no later payout');
 }
});
test('fortress attack remains solo-only and repair commands cannot be passed through room authority',()=>{
 const {C}=game();assert.equal(C.CAPABILITIES.online.actions.includes('defenseDrill'),false);
 assert.equal(C.CAPABILITIES.online.actions.includes('repairDefense'),false);
 const client=fs.readFileSync(new URL('../city.js',import.meta.url),'utf8');
 const districts=fs.readFileSync(new URL('../city-districts.js',import.meta.url),'utf8');
 assert.ok(client.includes("type:'repairDefense'"),'Squad UI has repair buttons');
 assert.ok(client.includes('Command Core:'),'siege status visible in Squad UI');
 assert.ok(districts.includes('BREACHED'),'world paint shows physical breaches');
 assert.ok(client.includes('offensive-meme-city-v1-center'),'original save key unchanged');
});
