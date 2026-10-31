/* World2 indoor services: local play credits only. No network, wallets or chain transfers.
 * Location checks provide preview gameplay parity, not multiplayer authority.
 */
'use strict';
(function(root){
 function create(C,I){
  if(!C?.ITEMS||!I?.ROOM?.activity)throw Error('City item and interior definitions are required');
  const catalog=new Map(C.ITEMS.map(item=>[item.id,item]));
  const MEDKIT_COST=25,MEDKIT_LIMIT=9,GEAR_LIMIT=100,REWARD_RATE=.5;
  const fail=(status,message)=>({status,message});
  function at(room,id){
   return !!room&&room.id==='door:'+id&&Number.isFinite(room.x)&&Number.isFinite(room.y)&&
    Math.hypot(room.x-I.ROOM.activity.x,room.y-I.ROOM.activity.y)<=110;
  }
  function funds(player,cost){
   return Number.isSafeInteger(player?.credits)&&player.credits>=cost&&player.credits<=1000000;
  }
  function buyGear(player,id,room){
   if(!at(room,'shop'))return fail('location','Use the back equipment counter inside Bad Taste Supply.');
   const item=catalog.get(id);if(!item)return fail('invalid','Unknown equipment.');
   if(!Array.isArray(player?.inventory)||player.inventory.length>=GEAR_LIMIT)return fail('limit','Inventory full.');
   if(!funds(player,item.price))return fail('funds','Not enough preview credits.');
   const serials=player.inventory.map(o=>/^gear-\d+$/.test(o?.uid||'')?Number(o.uid.slice(5)):0);
   const next=Math.max(0,...serials)+1;
   if(!Number.isSafeInteger(next)||next>1000000)return fail('limit','Gear serial limit reached.');
   const uid='gear-'+next;
   if(player.inventory.some(o=>o.uid===uid))return fail('invalid','Duplicate gear reference.');
   player.inventory.push({uid,item:item.id});
   player.credits-=item.price;
   return {status:'bought',uid,message:'Purchased '+item.name+' for '+item.price+' preview credits.'};
  }
  function equip(player,uid,room){
   if(!at(room,'shop'))return fail('location','Equip gear at the back of Bad Taste Supply.');
   const owned=player?.inventory?.find(o=>o?.uid===uid),item=catalog.get(owned?.item);
   if(!item)return fail('not-owned','This item is not in your inventory.');
   if(!player.equipped||typeof player.equipped!=='object')player.equipped={};
   player.equipped[item.slot]=uid;
   return {status:'equipped',slot:item.slot,message:'Equipped '+item.name+'.'};
  }
  function sell(player,uid,room){
   if(!at(room,'market'))return fail('location','Use the Night Market terminal to salvage owned gear.');
   const index=player?.inventory?.findIndex(o=>o?.uid===uid)??-1;
   if(index<0)return fail('not-owned','Only owned gear can be salvaged.');
   const owned=player.inventory[index],item=catalog.get(owned.item);
   if(!item)return fail('invalid','Unrecognized gear cannot be sold.');
   const value=Math.floor(item.price*REWARD_RATE);
   if(!Number.isSafeInteger(player.credits)||player.credits<0||player.credits+value>1000000)return fail('limit','Preview credit limit reached.');
   player.inventory.splice(index,1);player.credits+=value;
   if(player.equipped?.[item.slot]===uid)delete player.equipped[item.slot];
   return {status:'sold',value,message:'Salvaged '+item.name+' for '+value+' preview credits.'};
  }
  function buyMedkit(player,room){
   if(!at(room,'shop'))return fail('location','Visit the back counter inside Bad Taste Supply.');
   if(!player||!player.rising||typeof player.rising!=='object')return fail('invalid','Character medical inventory unavailable.');
   const n=player.rising.medkits??0;
   if(!Number.isSafeInteger(n)||n<0||n>=MEDKIT_LIMIT)return fail('limit','Medkit capacity reached.');
   if(!funds(player,MEDKIT_COST))return fail('funds','Not enough preview credits for a medkit.');
   player.credits-=MEDKIT_COST;player.rising.medkits=n+1;
   return {status:'bought',message:'Bought one preview medkit for 25 play credits.'};
  }
  function useMedkit(player){
   if(!player||!(player.hp>0))return fail('down','Respawn before healing.');
   if(player.hp>=player.maxHp)return fail('full','Health already full.');
   const n=player.rising?.medkits??0;if(!Number.isSafeInteger(n)||n<=0)return fail('empty','No preview medkits available.');
   player.rising.medkits=n-1;player.hp=Math.min(player.maxHp,player.hp+45);
   return {status:'healed',message:'Used one medkit. HP now '+Math.ceil(player.hp)+'/'+player.maxHp+'.'};
  }
  return Object.freeze({buyGear,equip,sell,buyMedkit,useMedkit,items:Object.freeze(C.ITEMS),MEDKIT_COST,MEDKIT_LIMIT});
 }
 root.CityWorld2Services=Object.freeze({create});
})(typeof window==='undefined'?globalThis:window);
