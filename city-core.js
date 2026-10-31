/* Shared simulation: the browser runs solo; the room server owns online state. */
'use strict';
(function(root){
 // V1 Center City: preserve all original district dimensions, local building
 // offsets, private plot tile coordinates and in-game features, but relocate
 // complete districts around a central private fortress.
 const CELL=2240,LAYOUT_VERSION=2;
 const REGION_CELLS=Object.freeze({
  fortress:[2,2],hub:[2,1],creator:[3,1],arena:[1,2],social:[3,2],
  offensive:[1,1],congress:[3,0],exit:[3,3],
  'you-missed':[0,2],maduro:[1,3],redacted:[4,2]
 });
 const origin=id=>({x:REGION_CELLS[id][0]*CELL,y:REGION_CELLS[id][1]*CELL});
 const HUB={...origin('hub'),width:2240,height:1660};
 const WORLD={width:CELL*5,height:CELL*5,spawn:{x:1120,y:900},buildings:[
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
 ],route:[{x:330,y:510,name:'Launch House'},{x:1800,y:900,name:'Creator Alley'},{x:1060,y:1000,name:'Night Market'}]};
 const NEIGHBORHOODS=[
  ['offensive','OFFENDED COMMONS','Offensive Union','#b6e87a'],
  ['congress','INSIDER HEIGHTS','Insider Cunts','#83b8ed'],
  ['exit','RUG INDUSTRIAL','Rugmasters','#f184a2'],
  ['you-missed','SHOOTER ROW','Shooter Crew','#ee9c70'],
  ['maduro','TAKEN DOCKS','Special Delivery','#79d7c6'],
  ['redacted','FINEPRINT QUARTER','Redacted Society','#c4a0ed']
 ].map(([id,name,clan,color])=>({id,name,clan,color,
  ox:origin(id).x,oy:origin(id).y,
  x:origin(id).x+1120,y:origin(id).y+870}));
 const FACTIONS={
  offensive:{allies:['maduro'],enemies:['exit'],role:'Union wardens'},
  congress:{allies:['you-missed'],enemies:['exit','redacted'],role:'Insider security'},
  exit:{allies:['redacted'],enemies:['congress','you-missed','offensive','maduro'],role:'Rugmasters'},
  'you-missed':{allies:['congress'],enemies:['exit'],role:'Shooter patrol'},
  maduro:{allies:['offensive'],enemies:['exit'],role:'Delivery escort'},
  redacted:{allies:['exit'],enemies:['congress'],role:'Redacted agents'}
 };
 const factionOf=b=>b.faction||(b.kind==='cop'?'congress':'exit');
 const rivals=(a,b)=>!!FACTIONS[a]?.enemies.includes(b)||!!FACTIONS[b]?.enemies.includes(a);
 function npcHostile(b,p){if(!b||!p||b.hp<=0)return false;if(b.owner)return b.owner===(p.ally?p.owner:p.id);if(b.kind==='cop'&&p.heat>=22)return true;return p.clan?rivals(factionOf(b),p.clan):factionOf(b)==='exit';}
 const outpostLot=id=>{const n=NEIGHBORHOODS.find(n=>n.id===id);return n?{x:n.ox+800,y:n.oy+1150,cols:3,rows:3,tile:64}:null;};
 const DISTRICTS=[
  ['fortress','Fortress Heights','BUILD & DEFEND YOUR MEME CITY','#b6cd8c','Fortress home', 'build',1160],
  ['creator','Creator Quarter','MAKE A MEME. MAKE A SCENE.','#c5a2e2','Creator road east','collections',1080],
  ['arena','Arena District','PROVE IT ON THE STREETS','#e2a177','Arena road west','arena',900],
  ['social','Social Boardwalk','FIND YOUR PEOPLE','#83c4ce','Boardwalk road east','social',1120]
 ].map(([id,name,tag,color,hint,kind,localY])=>{
  const at=origin(id),gates={fortress:{x:1120,y:1460},
   creator:{x:2070,y:720},arena:{x:170,y:900},social:{x:1790,y:1360}};
  return {id,name,tag,color,ox:at.x,oy:at.y,
    x:at.x+1120,y:at.y+localY,gate:gates[id],hint,kind};
 });
 function region(id){return id==='hub'?HUB:DISTRICTS.find(d=>d.id===id)||null;}
 function areaAt(x,y){const n=NEIGHBORHOODS.find(d=>x>=d.ox&&x<d.ox+2240&&y>=d.oy&&y<d.oy+1660);if(n)return n.id;if(x>=HUB.x&&x<HUB.x+2240&&y>=HUB.y&&y<HUB.y+1660)return 'hub';return DISTRICTS.find(d=>x>=d.ox&&x<d.ox+2240&&y>=d.oy&&y<d.oy+1660)?.id||'greenbelt';}
 function oldPosition(area,x,y){const r=region(area)||HUB;return {x:x+(r.ox??r.x),y:y+(r.oy??r.y)};}
 const CREW_TYPES=[
  {id:'sentry',name:'Block Sentry',cost:20,hp:110,damage:12,range:340,speed:145,cooldown:.7,color:'#a6c18d'},
  {id:'ranger',name:'Street Ranger',cost:55,hp:95,damage:20,range:460,speed:180,cooldown:.65,color:'#8db7cb'},
  {id:'heavy',name:'Heavy Defender',cost:90,hp:180,damage:28,range:390,speed:120,cooldown:.9,color:'#d0af89'}
 ];
 function restoreCrew(value){return Array.isArray(value)?value.slice(0,4).filter(o=>o&&CREW_TYPES.some(t=>t.id===o.role)).map((o,i)=>({id:`crew-${i+1}`,role:o.role,mode:['guard','patrol','follow'].includes(o.mode)?o.mode:'guard',...(o.post&&Number.isFinite(o.post.x)&&Number.isFinite(o.post.y)&&o.post.x>=28&&o.post.y>=35&&o.post.x<WORLD.width-28&&o.post.y<WORLD.height-28?{post:{x:Math.round(o.post.x),y:Math.round(o.post.y)}}:{})})):[];}
 const BUILD_KIT=[
  {id:'wall',name:'Concrete wall',cost:8,solid:true,color:'#85939c'},
  {id:'tower',name:'Watchtower',cost:22,solid:true,color:'#91a8b1'},
  {id:'home',name:'Meme HQ',cost:35,solid:true,color:'#b2c896'},
  {id:'banner',name:'Meme banner',cost:6,solid:false,color:'#c8a6dd'},
  {id:'tree',name:'Cypress tree',cost:5,solid:true,color:'#76a485'},
  {id:'lamp',name:'Street lamp',cost:4,solid:true,color:'#e7c593'},
  {id:'floor',name:'Stone paving',cost:2,solid:false,color:'#909ca5'}
 ];
 const PLOT={x:origin('fortress').x+600,y:origin('fortress').y+450,cols:16,rows:10,tile:64};
 const districtBlocks=id=>id==='creator'?[
  {x:380,y:350,w:420,h:270,label:'THE MEME GALLERY',hue:'#635975'},
  {x:1370,y:350,w:420,h:270,label:'THE PRINT STUDIO',hue:'#647976'}
 ]:id==='arena'?[
  {x:420,y:320,w:1400,h:320,label:'THE PROVING GROUND',hue:'#806957'}
 ]:id==='social'?[
  {x:380,y:330,w:400,h:250,label:'THE COMMON ROOM',hue:'#60798a'},
  {x:1440,y:330,w:360,h:250,label:'BOARDWALK CAFE',hue:'#7c7766'}
 ]:[];
 function restorePlot(value){
  if(!Array.isArray(value))return [];
  const used=new Set();return value.slice(0,PLOT.cols*PLOT.rows).filter(o=>o&&BUILD_KIT.some(k=>k.id===o.kind)&&Number.isInteger(o.col)&&o.col>=0&&o.col<PLOT.cols&&Number.isInteger(o.row)&&o.row>=0&&o.row<PLOT.rows&&!used.has(o.row*PLOT.cols+o.col)&&used.add(o.row*PLOT.cols+o.col)).map(o=>({col:o.col,row:o.row,kind:o.kind,rotation:Number.isInteger(o.rotation)?((o.rotation%4)+4)%4:0}));
 }
 // Different destinations occupy different quarters; there is no giant
 // single strip of shops in the central public commons.
 const businessAreas={launch:'hub',arcade:'hub',club:'social',
  shop:'arena',market:'creator',garage:'social'};
 for(const b of WORLD.buildings){const at=origin(businessAreas[b.id]);b.x+=at.x;b.y+=at.y;
  if(b.id==='club'){b.x=at.x+1020;b.y=at.y+690;}
 }
 for(const p of WORLD.stations){
  const at=origin(businessAreas[p.id]);p.x+=at.x;p.y+=at.y;
 }
 for(const p of WORLD.route){
  const at=origin(p.name==='Launch House'?'hub':p.name==='Creator Alley'?'creator':'creator');
  p.x+=at.x;p.y+=at.y;
 }
 WORLD.spawn={x:origin('fortress').x+1120,y:origin('fortress').y+1460};
 WORLD.stations.push(...DISTRICTS.map(d=>({...d})),
  ...DISTRICTS.map(d=>({id:'road-'+d.id,x:d.x,y:d.y,name:d.name,
    hint:d.hint,kind:'directions',district:d.id})));

 for(const n of NEIGHBORHOODS){
  for(const [i,label]of [n.clan+' HQ','STREETWEAR EXCHANGE','COMMUNITY ARCADE','BLOCK WORKSHOP'].entries()){
   WORLD.buildings.push({id:n.id+'-'+i,token:n.id,x:n.ox+(i%2?1430:290),y:n.oy+(i<2?290:1110),w:450,h:260,hue:n.color,label,sub:n.name});
  }
  for(const [i,label]of ['TOKEN OUTFITTERS','STREET MEDIC'].entries())WORLD.buildings.push({id:n.id+'-annex-'+i,token:n.id,x:n.ox+(i?1570:390),y:n.oy+630,w:280,h:125,hue:n.color,label,sub:n.clan,activity:i?'supplies':'tokens',theme:i?'cafe':'shop'});
  WORLD.stations.push({id:'clan-'+n.id,x:n.x,y:n.y,name:n.clan,hint:'Clan jobs and neighborhood routes',kind:'clans'});
 }
 const SCENERY=[];
 for(const n of NEIGHBORHOODS)for(let i=0;i<10;i++)SCENERY.push({id:n.id+'-tree-'+i,kind:i%3?'tree':'lamp',x:n.ox+180+i*208,y:n.oy+(i%2?1000:720),scale:.85});
 const prop=(kind,x,y,scale=1)=>SCENERY.push({id:`${kind}-${SCENERY.length}`,kind,x,y,scale});
 for(const [x,y]of [[775,640],[1303,640],[775,830],[1303,830]])prop('tree',HUB.x+x,HUB.y+y,.62);
 for(const [x,y]of [[330,760],[1600,750],[1930,750],[90,650],[2160,840]])prop('tree',HUB.x+x,HUB.y+y,.85);
 for(const [x,y]of [[590,570],[1370,570],[590,1080],[1370,1080],[760,870],[1320,870],[1550,880]])prop('lamp',HUB.x+x,HUB.y+y);
 for(const [x,y]of [[820,820],[1210,820],[1650,850],[430,850]])prop('bench',HUB.x+x,HUB.y+y+14);
 for(let x=2350;x<4300;x+=260){prop('tree',x,1900,.9);prop('tree',x,3070,1.1);prop('lamp',x,2400);}
 for(let y=1740;y<3270;y+=230){prop('tree',3010,y,.8);prop('tree',3720,y,.8);}
 for(const d of DISTRICTS){
  for(const [x,y]of [[280,690],[1950,690],[280,1180],[1950,1180],[830,1160],[1400,1160]])prop('tree',d.ox+x,d.oy+y,1.1);
  for(const [x,y]of [[900,980],[1340,980],[900,1280],[1340,1280],[460,750],[1790,750]])prop('lamp',d.ox+x,d.oy+y);
  for(let i=0;i<5;i++)prop('bench',d.ox+600+i*210,d.oy+1395);
 }
 const ITEMS=[{id:'jacket',name:'Founder bomber jacket',price:60,slot:'outfit',color:'#bdff56',description:'A tailored bomber with contrast panels, zip seams, and meme graphics.'},{id:'visor',name:'Purple chaos visor',price:90,slot:'head',color:'#ca91ff',description:'A little extra attitude. Cosmetic only.'},{id:'blaster',name:'Chaos meme blaster',price:120,slot:'hand',color:'#ffb65d',description:'Upgraded arcade blaster: 36 damage to hostile bots. No player-versus-player damage.'},{id:'boots',name:'Street runner boots',price:150,slot:'feet',color:'#63dae9',description:'Run faster through the city: +25 movement speed.'}];
 const validIds=['offensive','you-missed','maduro','redacted','congress','exit'];
  // Cosmetic avatar outfits: Rug Me Harder is a second Rugmasters design, not a seventh clan.
  const CLAN_SKINS=Object.freeze(['redacted','congress','exit','you-missed','maduro','rug']);
  // Empty corners of Center City reserved as optional social/creative expansions.
  // They have no missions, item rewards or combat bonuses. Public roads remain open.
  const TOKEN_PLOTS=Object.freeze([
   ['offensive','OFFENDED / Founder Reserve',0,0,'#bdff56'],
   ['redacted','FINEPRINT / Vault Lot',4,0,'#be69ec'],
   ['exit','RUGGEDAF / Exit Lot',4,1,'#38dcbf'],
   ['you-missed','SHOOTER / Rally Lot',0,4,'#ee9c70'],
   ['maduro','TAKEN / Drop Lot',2,4,'#d7575e'],
   ['congress','CUNTS / Insider Lot',4,4,'#f2c94c']
  ].map(([id,name,col,row,color])=>Object.freeze({id,name,x:col*CELL+630,y:row*CELL+500,w:980,h:750,color})));
  function plotAccess(p,id){return !!(p?.holder?.clan===id&&p.holder.tier>=1&&p.holder.expires>Date.now());}
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const level=xp=>1+Math.floor(Math.sqrt(Math.max(0,xp)/50));
 WORLD.obstacles=[{x:978,y:677,w:135,h:110},...[[820,820],[1210,820],[1650,850],[430,850]].map(([x,y])=>({x,y,w:55,h:20}))];
 for(const o of WORLD.obstacles){o.x+=HUB.x;o.y+=HUB.y;}
 for(const o of SCENERY.filter(o=>o.kind==='tree'))WORLD.obstacles.push({x:o.x-6,y:o.y-7,w:12,h:12});
 const districtSolids=DISTRICTS.flatMap(d=>districtBlocks(d.id).map(b=>({...b,x:b.x+d.ox,y:b.y+d.oy})));
 function blocked(x,y,p){
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<28||y<35||x>WORLD.width-28||y>WORLD.height-28)return true;
  if(TOKEN_PLOTS.some(o=>x>o.x&&x<o.x+o.w&&y>o.y&&y<o.y+o.h&&!plotAccess(p,o.id)))return true;
   if(WORLD.obstacles.some(o=>x>o.x-10&&x<o.x+o.w+10&&y>o.y-8&&y<o.y+o.h+8))return true;
  if([...WORLD.buildings,...districtSolids].some(b=>x>b.x-15&&x<b.x+b.w+15&&y>b.y-12&&y<b.y+b.h+22))return true;
  const social=DISTRICTS.find(d=>d.id==='social');if(x>social.ox+180&&x<social.ox+925&&y>social.oy+1260&&y<social.oy+1525)return true;
  if((p?.outposts||[]).some(o=>{const lot=outpostLot(o.clan);return lot&&BUILD_KIT.find(k=>k.id===o.kind)?.solid&&x>lot.x+o.col*64-4&&x<lot.x+o.col*64+60&&y>lot.y+o.row*64-4&&y<lot.y+o.row*64+60;}))return true;
  return (p?.plot||[]).some(o=>BUILD_KIT.find(k=>k.id===o.kind)?.solid&&x>PLOT.x+o.col*64-4&&x<PLOT.x+o.col*64+60&&y>PLOT.y+o.row*64-4&&y<PLOT.y+o.row*64+60);
 }
 function nearest(p){return WORLD.stations.find(s=>dist(p,s)<105)||null;}
 function cleanName(name){return String(name||'Guest').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,22)||'Guest';}
 class Engine{
  constructor(){this.players=new Map();this.listings=new Map();this.chat=[];this.serial=0;}
  join(id,name,avatar){if(this.players.size>=32)throw Error('Room is full.');if(!validIds.includes(avatar))throw Error('Unknown beta avatar.');const p={id,name:cleanName(name),avatar,clanSkin:null,x:WORLD.spawn.x,y:WORLD.spawn.y,xp:0,credits:180,inventory:[],equipped:{},route:0,completed:false,input:{x:0,y:0},lastChat:0,area:areaAt(WORLD.spawn.x,WORLD.spawn.y),plot:[],crew:[],crewKills:0,style:{skin:0,hair:0,pants:0,print:0}};this.players.set(id,p);return p;}
  player(id){const p=this.players.get(id);if(!p)throw Error('Session expired. Rejoin the room.');return p;}
  input(id,x,y){const p=this.player(id);if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Invalid movement.');const n=Math.max(1,Math.hypot(x,y));p.input={x:x/n,y:y/n};}
  tick(dt){dt=Math.max(0,Math.min(.1,dt));for(const p of this.players.values()){const nx=p.x+p.input.x*205*dt,ny=p.y+p.input.y*205*dt;if(!blocked(nx,p.y,p))p.x=nx;if(!blocked(p.x,ny,p))p.y=ny;p.area=areaAt(p.x,p.y);}}
  action(id,a){const p=this.player(id);if(!a||typeof a.type!=='string')throw Error('Invalid action.');
   p.area=areaAt(p.x,p.y);
   if(a.type==='travel')throw Error('Districts are connected by roads now. Walk to your destination.');
   if(a.type==='starterfort'){
    if(p.area!=='fortress'||p.plot.length)throw Error('Starter layout needs an empty fortress plot.');
    const plan=[{col:4,row:2,kind:'tower'},{col:11,row:2,kind:'tower'},...Array.from({length:6},(_,i)=>({col:i+5,row:2,kind:'wall'})),{col:7,row:5,kind:'home'},{col:5,row:6,kind:'banner'},{col:10,row:6,kind:'banner'},{col:3,row:7,kind:'tree'},{col:12,row:7,kind:'tree'},{col:6,row:8,kind:'lamp'},{col:9,row:8,kind:'lamp'}];
    const cost=plan.reduce((sum,o)=>sum+BUILD_KIT.find(k=>k.id===o.kind).cost,0);
    if(p.credits<cost)throw Error(`Starter layout costs ${cost} play credits. Earn more with city jobs.`);
    if(plan.some(o=>BUILD_KIT.find(k=>k.id===o.kind).solid&&Math.abs(p.x-(PLOT.x+o.col*64+28))<46&&Math.abs(p.y-(PLOT.y+o.row*64+28))<46))throw Error('Step outside the plot before adding the starter layout.');
    p.credits-=cost;p.plot=plan.map(o=>({...o,rotation:0}));return `Starter fortress built for ${cost} play credits.`;
   }
   if(a.type==='build'||a.type==='demolish'){
    if(p.area!=='fortress')throw Error('Visit your fortress to build.');
    if(!Number.isInteger(a.col)||a.col<0||a.col>=PLOT.cols||!Number.isInteger(a.row)||a.row<0||a.row>=PLOT.rows)throw Error('Choose a tile inside your plot.');
    const index=p.plot.findIndex(o=>o.col===a.col&&o.row===a.row);
    if(a.type==='demolish'){
     if(index<0)throw Error('That tile is empty.');
     const item=p.plot[index];p.credits+=BUILD_KIT.find(k=>k.id===item.kind).cost;p.plot.splice(index,1);return 'Removed. All play credits refunded.';
    }
    const item=BUILD_KIT.find(k=>k.id===a.kind);if(!item)throw Error('Unknown building piece.');
    if(index>=0)throw Error('Remove the existing piece first.');
    if(p.credits<item.cost)throw Error('Not enough play credits. Complete jobs in the main city.');
    if(item.solid&&Math.abs(p.x-(PLOT.x+a.col*64+28))<46&&Math.abs(p.y-(PLOT.y+a.row*64+28))<46)throw Error('Move off this tile before building.');
    const access=buildAccess([...p.plot,{col:a.col,row:a.row,kind:item.id}],PLOT.cols,PLOT.rows);if(access)throw Error(access);
    p.plot.push({col:a.col,row:a.row,kind:item.id,rotation:Number.isInteger(a.rotation)?((a.rotation%4)+4)%4:0});p.credits-=item.cost;return `${item.name} built.`;
   }
   if(['checkpoint','buy','list','purchase'].includes(a.type)&&!['hub','creator','arena','social'].includes(p.area))throw Error('Visit a city shop, market or checkpoint district for this action.');
   if(a.type==='style'){
    if(!a.style||typeof a.style!=='object'||Array.isArray(a.style))throw Error('Invalid outfit style.');
    for(const [key,max]of [['skin',5],['hair',3],['pants',3]])if(!Number.isInteger(a.style[key])||a.style[key]<0||a.style[key]>max)throw Error('Invalid outfit style.');
    if(!Number.isInteger(a.style.print??0)||(a.style.print??0)<0||(a.style.print??0)>2)throw Error('Invalid clothing print.');
    p.style={skin:a.style.skin,hair:a.style.hair,pants:a.style.pants,print:a.style.print??0};return 'Streetwear updated.';
   }
   if(a.type==='clanSkin'){if(a.skin!==null&&!CLAN_SKINS.includes(a.skin))throw Error('Unknown clan avatar skin.');p.clanSkin=a.skin;return a.skin?'Clan skin equipped. Your movement and weapons are unchanged.':'Classic streetwear equipped.';}
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
  snapshot(id){const p=this.player(id);return {self:{...p,plot:p.plot.map(o=>({...o})),crew:p.crew.map(o=>({...o,...(o.post?{post:{...o.post}}:{})})),input:undefined,lastChat:undefined},players:[...this.players.values()].map(x=>({id:x.id,name:x.name,avatar:x.avatar,clanSkin:x.clanSkin||null,x:x.x,y:x.y,level:level(x.xp),area:x.area,style:{...x.style},equipped:Object.fromEntries(Object.entries(x.equipped).map(([slot,uid])=>[slot,x.inventory.find(i=>i.uid===uid)?.item]))})),listings:[...this.listings.values()].map(l=>({id:l.id,seller:l.seller,sellerName:l.sellerName,item:l.owned.item,price:l.price})),chat:this.chat};}
 }
 // Ground-plane combat coordinates never include visual body height.
 const WEAPON=Object.freeze({barrel:50,height:58,recoil:2,shotInterval:.25});
 function weaponAnchor(angle,recoil=0){const reach=WEAPON.barrel-Math.max(0,Math.min(1,recoil))*WEAPON.recoil;return {x:Math.cos(angle)*reach,y:Math.sin(angle)*reach,height:WEAPON.height};}
 // Conservative tile access: every walkable cell must connect to the outside.
 function buildAccess(pieces,cols,rows){
  const solid=new Set(pieces.filter(o=>BUILD_KIT.find(k=>k.id===o.kind)?.solid).map(o=>o.row*cols+o.col)),seen=new Set(),queue=[];
  const add=(x,y)=>{const key=y*cols+x;if(x<0||y<0||x>=cols||y>=rows||solid.has(key)||seen.has(key))return;seen.add(key);queue.push([x,y]);};
  for(let x=0;x<cols;x++){add(x,0);add(x,rows-1);}for(let y=0;y<rows;y++){add(0,y);add(cols-1,y);}
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];add(x-1,y);add(x+1,y);add(x,y-1);add(x,y+1);}
  if(seen.size!==cols*rows-solid.size)return 'Keep an open path from every empty tile to the outside.';
  for(const o of pieces)if(o.kind==='home'&&o.row+1<rows&&solid.has((o.row+1)*cols+o.col))return 'Keep the Meme HQ front entrance clear.';
  return '';
 }
 const CAPABILITIES=Object.freeze({online:Object.freeze({actions:Object.freeze(['joinConflict','deliver','joinClan','clanSkin','blockJob','abandonBlock','avatar','style','checkpoint','buy','equip','list','purchase','cancel','chat','fire','dash','contract','abandon','ride','medkit','restock','claimChapter','enterBuilding','exitBuilding']),soloPanels:Object.freeze(['build','outposts','crew','fortress','survival'])}),solo:Object.freeze({persistent:'browser-local'})});
 Engine.CAPABILITIES=CAPABILITIES;
 Engine.LAYOUT_VERSION=LAYOUT_VERSION;
 const RELEASE=Object.freeze({name:'Living Blocks',version:'Alpha 12'});
 root.MemeCityCore=Object.freeze({LAYOUT_VERSION,buildAccess,WEAPON,weaponAnchor,CAPABILITIES,RELEASE,WORLD,HUB,SCENERY,ITEMS,DISTRICTS,NEIGHBORHOODS,FACTIONS,CLAN_SKINS,TOKEN_PLOTS,plotAccess,factionOf,rivals,npcHostile,outpostLot,BUILD_KIT,PLOT,CREW_TYPES,restoreCrew,areaAt,region,oldPosition,districtBlocks,restorePlot,Engine,level,nearest,blocked,validIds});
})(typeof window==='undefined'?globalThis:window);
