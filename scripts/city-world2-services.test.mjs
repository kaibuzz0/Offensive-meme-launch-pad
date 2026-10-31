import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx={};
for(const f of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-world2-services.js'])
 vm.runInNewContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),ctx);
const C=ctx.MemeCityCore,I=ctx.CityInteriors,services=ctx.CityWorld2Services.create(C,I);
const person=()=>({hp:55,maxHp:100,credits:250,inventory:[],equipped:{},rising:{medkits:0}});
const room=id=>({id:'door:'+id,...I.ROOM.activity});
test('world2 services require a matching interior activity terminal',()=>{
 const p=person(),shop=room('shop'),market=room('market');
 assert.equal(services.buyGear(p,C.ITEMS[0].id,null).status,'location');
 assert.equal(services.buyGear(p,C.ITEMS[0].id,market).status,'location');
 assert.equal(services.buyGear(p,C.ITEMS[0].id,{...shop,x:0,y:0}).status,'location');
 assert.equal(services.sell(p,'gear-1',shop).status,'location');
 assert.equal(services.buyMedkit(p,market).status,'location');
 assert.equal(p.credits,250);assert.equal(p.inventory.length,0);
});
test('preview shop purchases debit once, equip actual inventory, then market salvage un-equips',()=>{
 const p=person(),item=C.ITEMS[0];
 const r=services.buyGear(p,item.id,room('shop'));assert.equal(r.status,'bought');
 assert.equal(p.credits,250-item.price);assert.equal(p.inventory[0].uid,r.uid);
 assert.equal(services.equip(p,'gear-999',room('shop')).status,'not-owned');
 assert.equal(services.equip(p,r.uid,room('shop')).status,'equipped');assert.equal(p.equipped[item.slot],r.uid);
 assert.equal(services.sell(p,r.uid,room('shop')).status,'location');
 const sale=services.sell(p,r.uid,room('market'));assert.equal(sale.status,'sold');
 assert.equal(sale.value,Math.floor(item.price/2));
 assert.equal(p.credits,250-item.price+Math.floor(item.price/2));
 assert.equal(p.inventory.length,0);assert.equal(p.equipped[item.slot],undefined);
 assert.equal(services.sell(p,r.uid,room('market')).status,'not-owned');
});
test('medkits have bounded capacity and heal only a damaged living character',()=>{
 const p=person();
 assert.equal(services.buyMedkit(p,room('shop')).status,'bought');
 assert.equal(p.credits,225);assert.equal(p.rising.medkits,1);
 assert.equal(services.useMedkit(p).status,'healed');assert.equal(p.hp,100);assert.equal(p.rising.medkits,0);
 assert.equal(services.useMedkit(p).status,'full');
 p.hp=0;assert.equal(services.useMedkit(p).status,'down');
 p.hp=25;p.credits=999;for(let i=0;i<9;i++)assert.equal(services.buyMedkit(p,room('shop')).status,'bought');
 assert.equal(services.buyMedkit(p,room('shop')).status,'limit');
});
test('malformed gear IDs and insufficient credits cannot mint items or credits',()=>{
 const p=person();p.credits=1;
 assert.equal(services.buyGear(p,'bogus',room('shop')).status,'invalid');
 assert.equal(services.buyGear(p,C.ITEMS[0].id,room('shop')).status,'funds');
 assert.equal(services.buyMedkit(p,room('shop')).status,'funds');
 assert.equal(services.sell(p,'bogus',room('market')).status,'not-owned');
 p.credits=1000;p.inventory=[{uid:'gear-59',item:C.ITEMS[0].id}];
 assert.equal(services.buyGear(p,C.ITEMS[0].id,room('shop')).uid,'gear-60');
});
