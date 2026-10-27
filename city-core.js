/* Shared simulation: the browser runs solo; the room server owns online state. */
'use strict';
(function(root){
 const WORLD={width:2240,height:1660,spawn:{x:1120,y:900},buildings:[
  {id:'launch',x:120,y:160,w:420,h:260,hue:'#605293',label:'LAUNCH HOUSE',sub:'YOUR MEME STARTS HERE'},
  {id:'arcade',x:850,y:150,w:420,h:260,hue:'#39797d',label:'CHAOS ARCADE',sub:'PLAY. LEVEL. REPEAT.'},
  {id:'club',x:1590,y:160,w:400,h:260,hue:'#7d3a75',label:'THE UNFILTERED',sub:'MEME SOCIAL CLUB'},
  {id:'shop',x:130,y:1090,w:400,h:280,hue:'#6f7c37',label:'BAD TASTE SUPPLY',sub:'GEAR / PLAY CREDITS'},
  {id:'market',x:850,y:1120,w:420,h:240,hue:'#95713f',label:'NIGHT MARKET',sub:'PLAYER TRADES / ONLINE'},
  {id:'garage',x:1610,y:1100,w:390,h:270,hue:'#3e638d',label:'MEME MOTORS',sub:'VEHICLES / NEXT BUILD'}
 ],stations:[
  {id:'launch',x:330,y:465,name:'Launch House',hint:'Meet the launch guide',kind:'mission'},
  {id:'shop',x:335,y:1040,name:'Bad Taste Supply',hint:'Browse equipment',kind:'shop'},
  {id:'market',x:1060,y:1070,name:'Night Market',hint:'Open player market',kind:'market'},
  {id:'arcade',x:1060,y:455,name:'Chaos Arcade',hint:'Get a daily route',kind:'mission'},
  {id:'garage',x:1800,y:1050,name:'Meme Motors',hint:'See the development plan',kind:'roadmap'}
 ],route:[{x:330,y:510,name:'Launch House'},{x:1800,y:520,name:'Creator Alley'},{x:1060,y:1000,name:'Night Market'}]};
 const ITEMS=[{id:'jacket',name:'Founder bomber jacket',price:60,slot:'outfit',color:'#bdff56',description:'A tailored bomber with contrast panels, zip seams, and meme graphics.'},{id:'visor',name:'Purple chaos visor',price:90,slot:'head',color:'#ca91ff',description:'A little extra attitude. Cosmetic only.'},{id:'blaster',name:'Chaos meme blaster',price:120,slot:'hand',color:'#ffb65d',description:'Upgraded arcade blaster: 36 damage to hostile bots. No player-versus-player damage.'},{id:'boots',name:'Street runner boots',price:150,slot:'feet',color:'#63dae9',description:'Run faster through the city: +25 movement speed.'}];
 const validIds=['offensive','you-missed','maduro','redacted','congress','exit'];
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const level=xp=>1+Math.floor(Math.sqrt(Math.max(0,xp)/50));
 WORLD.obstacles=[{x:978,y:677,w:135,h:110},...[[820,820],[1210,820],[1650,850],[430,850]].map(([x,y])=>({x,y,w:55,h:20}))];
 function blocked(x,y){return WORLD.obstacles.some(o=>x>o.x-10&&x<o.x+o.w+10&&y>o.y-8&&y<o.y+o.h+8)|| x<28||y<35||x>WORLD.width-28||y>WORLD.height-28||WORLD.buildings.some(b=>x>b.x-15&&x<b.x+b.w+15&&y>b.y-12&&y<b.y+b.h+22);}
 function nearest(p){return WORLD.stations.find(s=>dist(p,s)<105)||null;}
 function cleanName(name){return String(name||'Guest').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,22)||'Guest';}
 class Engine{
  constructor(){this.players=new Map();this.listings=new Map();this.chat=[];this.serial=0;}
  join(id,name,avatar){if(this.players.size>=32)throw Error('Room is full.');if(!validIds.includes(avatar))throw Error('Unknown beta avatar.');const p={id,name:cleanName(name),avatar,x:WORLD.spawn.x,y:WORLD.spawn.y,xp:0,credits:180,inventory:[],equipped:{},route:0,completed:false,input:{x:0,y:0},lastChat:0,style:{skin:0,hair:0,pants:0,print:0}};this.players.set(id,p);return p;}
  player(id){const p=this.players.get(id);if(!p)throw Error('Session expired. Rejoin the room.');return p;}
  input(id,x,y){const p=this.player(id);if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Invalid movement.');const n=Math.max(1,Math.hypot(x,y));p.input={x:x/n,y:y/n};}
  tick(dt){dt=Math.max(0,Math.min(.1,dt));for(const p of this.players.values()){const nx=p.x+p.input.x*205*dt,ny=p.y+p.input.y*205*dt;if(!blocked(nx,p.y))p.x=nx;if(!blocked(p.x,ny))p.y=ny;}}
  action(id,a){const p=this.player(id);if(!a||typeof a.type!=='string')throw Error('Invalid action.');
   if(a.type==='style'){
    if(!a.style||typeof a.style!=='object'||Array.isArray(a.style))throw Error('Invalid outfit style.');
    for(const [key,max]of [['skin',5],['hair',3],['pants',3]])if(!Number.isInteger(a.style[key])||a.style[key]<0||a.style[key]>max)throw Error('Invalid outfit style.');
    if(!Number.isInteger(a.style.print??0)||(a.style.print??0)<0||(a.style.print??0)>2)throw Error('Invalid clothing print.');
    p.style={skin:a.style.skin,hair:a.style.hair,pants:a.style.pants,print:a.style.print??0};return 'Streetwear updated.';
   }
   if(a.type==='avatar'){if(!validIds.includes(a.avatar))throw Error('Unknown beta avatar.');p.avatar=a.avatar;return 'Meme identity changed. No token holdings are implied.';}
   if(a.type==='checkpoint'){const target=WORLD.route[p.route];if(!target||p.completed)throw Error('Route already completed.');if(dist(p,target)>110)throw Error('Walk closer to the mission beacon.');p.xp+=50;p.credits+=40;p.route++;if(p.route===WORLD.route.length){p.completed=true;p.xp+=100;p.credits+=60;}return p.completed?'City orientation complete! +100 XP / +60 credits bonus.':`Checkpoint reached: ${target.name}. +50 XP / +40 play credits.`;}
   if(a.type==='buy'){if(nearest(p)?.id!=='shop')throw Error('Visit Bad Taste Supply to buy gear.');const item=ITEMS.find(i=>i.id===a.item);if(!item)throw Error('Unknown item.');if(p.credits<item.price)throw Error('Not enough play credits. Complete your city route.');p.credits-=item.price;const owned={uid:`gear-${++this.serial}`,item:item.id};p.inventory.push(owned);p.equipped[item.slot]=owned.uid;return `${item.name} purchased and equipped.`;}
   if(a.type==='equip'){const owned=p.inventory.find(i=>i.uid===a.uid);if(!owned)throw Error('Item is not in your inventory.');const item=ITEMS.find(i=>i.id===owned.item);p.equipped[item.slot]=owned.uid;return `${item.name} equipped.`;}
   if(a.type==='list'){if(nearest(p)?.id!=='market')throw Error('Visit Night Market to list items.');const i=p.inventory.findIndex(i=>i.uid===a.uid);if(i<0)throw Error('You do not own this item.');if(!Number.isSafeInteger(a.price)||a.price<1||a.price>10000)throw Error('Price must be 1–10,000 play credits.');if([...this.listings.values()].filter(l=>l.seller===id).length>=5)throw Error('Maximum five listings.');const [owned]=p.inventory.splice(i,1);for(const slot in p.equipped)if(p.equipped[slot]===owned.uid)delete p.equipped[slot];const lid=`listing-${++this.serial}`;this.listings.set(lid,{id:lid,seller:id,sellerName:p.name,owned,price:a.price});return 'Item placed in market escrow.';}
   if(a.type==='cancel'){const l=this.listings.get(a.listing);if(!l||l.seller!==id)throw Error('Listing is unavailable.');p.inventory.push(l.owned);this.listings.delete(l.id);return 'Listing cancelled. Item returned.';}
   if(a.type==='purchase'){if(nearest(p)?.id!=='market')throw Error('Visit Night Market to trade.');const l=this.listings.get(a.listing);if(!l||l.seller===id)throw Error('Listing is unavailable.');const seller=this.players.get(l.seller);if(!seller)throw Error('Seller left the room.');if(p.credits<l.price)throw Error('Not enough play credits.');p.credits-=l.price;seller.credits+=l.price;p.inventory.push(l.owned);this.listings.delete(l.id);return 'Trade complete. Item added to inventory.';}
   if(a.type==='chat'){const now=Date.now();if(now-p.lastChat<1500)throw Error('Wait a moment before sending another message.');const text=String(a.text||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,180);if(!text)throw Error('Enter a message.');p.lastChat=now;this.chat.push({id:++this.serial,name:p.name,text});this.chat=this.chat.slice(-30);return 'Message sent.';}
   throw Error('Unknown action.');
  }
  leave(id){for(const [lid,l]of this.listings)if(l.seller===id)this.listings.delete(lid);this.players.delete(id);}
  snapshot(id){const p=this.player(id);return {self:{...p,input:undefined,lastChat:undefined},players:[...this.players.values()].map(x=>({id:x.id,name:x.name,avatar:x.avatar,x:x.x,y:x.y,level:level(x.xp),style:{...x.style},equipped:Object.fromEntries(Object.entries(x.equipped).map(([slot,uid])=>[slot,x.inventory.find(i=>i.uid===uid)?.item]))})),listings:[...this.listings.values()].map(l=>({id:l.id,seller:l.seller,sellerName:l.sellerName,item:l.owned.item,price:l.price})),chat:this.chat};}
 }
 root.MemeCityCore=Object.freeze({WORLD,ITEMS,Engine,level,nearest,blocked,validIds});
})(typeof window==='undefined'?globalThis:window);
