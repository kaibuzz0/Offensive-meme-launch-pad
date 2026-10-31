import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx={};
for(const f of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-topology.js','city-nav.js','city-world2.js','city-world2-registry.js','city-world2-territory.js','city-world2-contracts.js','city-world2-simulation.js','city-world2-session.js'])
 vm.runInNewContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),ctx);
const C=ctx.MemeCityCore,I=ctx.CityInteriors,T=ctx.CityTopology,W=ctx.CityWorld2.create(C,I,T),R=ctx.CityWorld2Registry.create(C,I,ctx.CityRising,T,W);
const key='offensive-meme-city-world2-preview-v1',world1='offensive-meme-city-v1';
const sim=()=>ctx.CityWorld2Simulation.create(C,W,R,ctx.CityNav);
function storage(entries={}){const values=new Map(Object.entries(entries));return {values,getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,v)};}
test('explicit opt-in world2 preview can save while leaving original world1 byte-for-byte untouched',()=>{
 const old='{"version":5,"worldVersion":1,"credits":125}',s=storage({[world1]:old}),engine=sim();
 const session=ctx.CityWorld2Session.create(s,key,engine);assert.equal(session.inspect().status,'empty');
 engine.player.credits=350;engine.player.plot.push({col:3,row:3,kind:'wall',rotation:0});
 assert.equal(session.save().status,'saved');assert.equal(s.getItem(world1),old);
 const saved=JSON.parse(s.getItem(key));assert.equal(saved.save.credits,350);assert.equal(saved.save.worldVersion,2);
 assert.equal(saved.save.plot[0].kind,'wall');assert.equal(saved.revision,1);
 assert.equal(session.save().status,'saved');assert.equal(JSON.parse(s.getItem(key)).revision,2);
});
test('load restores independent character progress and territory owner without granting new rewards',()=>{
 const s=storage(),first=sim(),clan=C.NEIGHBORHOODS[1].id,z=first.territory.zones[0];
 first.player.clan=clan;first.player.credits=890;first.player.xp=222;
 first.territory.restore([{id:z.id,owner:clan}]);
 const a=ctx.CityWorld2Session.create(s,key,first);assert.equal(a.save().status,'saved');
 const second=sim(),b=ctx.CityWorld2Session.create(s,key,second);
 assert.equal(b.inspect().status,'ready');assert.equal(b.save().status,'review');
 assert.equal(b.load().status,'loaded');
 assert.equal(second.player.xp,222);assert.equal(second.player.credits,890);
 assert.equal(second.player.clan,clan);assert.equal(second.territory.zones[0].owner,clan);
 assert.equal(b.save().status,'saved');
});
test('two tabs with stale revision cannot overwrite newer sandbox data',()=>{
 const s=storage(),one=ctx.CityWorld2Session.create(s,key,sim()),two=ctx.CityWorld2Session.create(s,key,sim());
 assert.equal(one.inspect().status,'empty');assert.equal(two.inspect().status,'empty');
 assert.equal(one.save().status,'saved');const exact=s.getItem(key);
 assert.equal(two.save().status,'conflict');assert.equal(s.getItem(key),exact);
});
test('corrupt or future preview records fail closed and never mutate old saves',()=>{
 const old='{"version":5}',s=storage({[world1]:old,[key]:'{broken'});
 const p=ctx.CityWorld2Session.create(s,key,sim());
 assert.equal(p.load().status,'invalid');assert.equal(p.save().status,'invalid');
 assert.equal(s.getItem(key),'{broken');assert.equal(s.getItem(world1),old);
 s.setItem(key,JSON.stringify({kind:'world2-private-preview',revision:5,save:{worldVersion:3}}));
 assert.equal(p.load().status,'invalid');assert.equal(s.getItem(world1),old);
});
test('invalid persisted territory cannot silently change control ownership',()=>{
 const engine=sim(),s=storage();
 const a=ctx.CityWorld2Session.create(s,key,engine);a.save();
 const payload=JSON.parse(s.getItem(key));payload.territory=[{id:'control:fake',owner:C.NEIGHBORHOODS[0].id}];
 s.setItem(key,JSON.stringify(payload));
 const other=sim();const b=ctx.CityWorld2Session.create(s,key,other);
 assert.equal(b.load().status,'invalid');
 assert.ok(other.territory.zones.every(z=>z.owner===z.homeClan));
});
