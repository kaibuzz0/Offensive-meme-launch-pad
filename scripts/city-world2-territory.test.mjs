import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={};
for(const f of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-topology.js','city-world2.js','city-world2-registry.js','city-nav.js','city-world2-territory.js','city-world2-simulation.js'])
 vm.runInNewContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),context);
const C=context.MemeCityCore,I=context.CityInteriors,T=context.CityTopology,W=context.CityWorld2.create(C,I,T);
const registry=context.CityWorld2Registry.create(C,I,context.CityRising,T,W),create=()=>context.CityWorld2Territory.create(C,W,registry);
const mkPlayer=(zone,clan)=>({x:zone.x,y:zone.y,hp:100,clan,xp:0,credits:180,reputation:{}});
test('all six control points are stable, reachable, and cannot alter protected services',()=>{
 const t=create(),before=JSON.stringify(W.buildings);
 assert.equal(t.zones.length,C.NEIGHBORHOODS.length);assert.equal(new Set(t.zones.map(z=>z.id)).size,t.zones.length);
 for(const zone of t.zones){assert.ok(registry.resolve('neighborhood:'+zone.homeClan));assert.equal(W.blocked(zone.x,zone.y),false);}
 assert.equal(JSON.stringify(W.buildings),before);
});
test('capturing requires a valid faction, near point, health, and rejects repeated payout',()=>{
 const t=create(),z=t.zones[0],other=C.NEIGHBORHOODS.find(n=>n.id!==z.homeClan).id,p=mkPlayer(z,null);
 assert.equal(t.start(p,z.id).status,'no-clan');
 assert.equal(t.join(p,'invalid').status,'invalid');assert.equal(t.join(p,other).status,'joined');
 p.x+=600;assert.equal(t.start(p,z.id).status,'far');p.x=z.x;
 assert.equal(t.start(p,'control:not-real').status,'invalid');
 assert.equal(t.start(p,z.id).status,'capturing');
 for(let i=0;i<80;i++)t.tick(.1,p,[]);
 assert.equal(z.owner,other);assert.equal(z.state,'captured');assert.equal(p.xp,80);assert.equal(p.credits,230);assert.equal(p.reputation[other],1);
 assert.equal(t.start(p,z.id).status,'friendly');
 for(let i=0;i<90;i++)t.tick(.1,p,[]);
 assert.equal(p.xp,80,'no repeated reward for already owned node');
});
test('hostile defenders contest, leaving the point or taking damage cancels capture',()=>{
 const t=create(),z=t.zones[0],clan=C.NEIGHBORHOODS.find(n=>n.id!==z.homeClan).id,p=mkPlayer(z,clan);
 const hostile=[{x:z.x+75,y:z.y,hp:60,alive:true,clan:z.homeClan,kind:'gang'}];
 assert.equal(t.start(p,z.id,hostile).status,'contested');
 for(let i=0;i<25;i++)t.tick(.1,p,hostile);
 assert.equal(z.progress,0);
 hostile[0].alive=false;for(let i=0;i<20;i++)t.tick(.1,p,hostile);assert.ok(z.progress>1);
 p.hp=94;assert.equal(t.tick(.1,p,hostile).status,'interrupted');assert.equal(z.progress,0);
 assert.equal(t.start(p,z.id,hostile).status,'capturing');
 for(let i=0;i<10;i++)t.tick(.1,p,hostile);
 p.y+=300;assert.equal(t.tick(.1,p,hostile).status,'interrupted');assert.equal(z.progress,0);
});
test('reset and faction switch clear capture without corrupting owner snapshots',()=>{
 const t=create(),z=t.zones[0],ids=C.NEIGHBORHOODS.filter(n=>n.id!==z.homeClan);
 const p=mkPlayer(z,ids[0].id),original=t.snapshot();
 t.start(p,z.id);t.tick(.1,p,[]);
 t.join(p,ids[1].id);assert.equal(t.active(),null);assert.equal(z.progress,0);
 t.start(p,z.id);for(let i=0;i<80;i++)t.tick(.1,p,[]);
 assert.equal(z.owner,ids[1].id);
 t.reset();assert.equal(z.owner,z.homeClan);assert.equal(t.active(),null);
 assert.equal(JSON.stringify(t.snapshot()),JSON.stringify(original));
});

test('territory control is integrated into the isolated world2 simulation and reset lifecycle',()=>{
 const simulation=context.CityWorld2Simulation.create(C,W,registry,context.CityNav);
 assert.ok(simulation.territory,'gameplay preview must have faction state');
 const zone=simulation.territory.zones[0],clan=C.NEIGHBORHOODS.find(n=>n.id!==zone.owner).id;
 assert.equal(simulation.joinFaction(clan).status,'joined');
 simulation.player.x=zone.x;simulation.player.y=zone.y;
 assert.equal(simulation.captureControl(zone.id).status,'capturing');
 for(let i=0;i<82;i++)simulation.tick(.1);
 assert.equal(zone.owner,clan);assert.equal(simulation.player.xp,80);assert.equal(simulation.player.credits,230);
 assert.ok(simulation.events.some(x=>x.includes('Control point secured')));
 simulation.reset();assert.equal(zone.owner,zone.homeClan);assert.equal(simulation.player.clan,null);
});
