/* Block Wars: shared, bounded clan jobs. Tokens never become spendable game credits. */
'use strict';
(function(root){
 const C=root.MemeCityCore,P=C.Engine.prototype,base={join:P.join,tick:P.tick,action:P.action,snapshot:P.snapshot};
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function restore(p,s){p.outpostStyles=Object.fromEntries(C.NEIGHBORHOODS.map(n=>[n.id,['neon','holo'].includes(s?.outpostStyles?.[n.id])?s.outpostStyles[n.id]:'classic']));const seen=new Set();p.outposts=(Array.isArray(s?.outposts)?s.outposts:[]).slice(0,54).filter(o=>o&&C.outpostLot(o.clan)&&['wall','tower','banner','floor','lamp'].includes(o.kind)&&Number.isInteger(o.col)&&o.col>=0&&o.col<3&&Number.isInteger(o.row)&&o.row>=0&&o.row<3&&!seen.has(o.clan+o.col+o.row)&&seen.add(o.clan+o.col+o.row)).map(o=>({clan:o.clan,kind:o.kind,col:o.col,row:o.row,rotation:0}));p.clan=C.validIds.includes(s?.clan)?s.clan:null;p.reputation=Object.fromEntries(C.validIds.map(id=>[id,Number.isSafeInteger(s?.reputation?.[id])?Math.max(0,Math.min(10000,s.reputation[id])):0]));p.blockJob=null;p.blockCooldown=0;}
 function save(p){return {clan:p.clan,reputation:{...p.reputation},outposts:p.outposts.map(o=>({...o})),outpostStyles:{...p.outpostStyles}};}
 function outpostStyle(p,clan){const style=p.outpostStyles?.[clan]||'classic',tier=rank(p,clan);return style==='neon'&&tier>=1||style==='holo'&&tier>=2?style:'classic';}
 function rank(p,id=p.clan){return Math.min(3,Math.floor((p.reputation?.[id]||0)/3));}
 function notice(p,s){p.notice=s;p.noticeSeq=(p.noticeSeq||0)+1;}
 P.join=function(...args){const p=base.join.apply(this,args);restore(p);return p;};
 P.action=function(id,a){const p=this.player(id);
  if(a.type==='outpostStyle'){if(!C.outpostLot(a.clan)||!['classic','neon','holo'].includes(a.style))throw Error('Unknown outpost style.');const tier=rank(p,a.clan);if(a.style!=='classic'&&tier<(a.style==='holo'?2:1))throw Error('Earn the matching clan reputation rank first.');p.outpostStyles[a.clan]=a.style;return 'Outpost style selected. This appearance is earned through clan reputation.';}
  if(['outpostBuild','outpostRemove'].includes(a.type)){
   const lot=C.outpostLot(a.clan);if(!lot||p.room||C.areaAt(p.x,p.y)!==a.clan||dist(p,{x:lot.x+96,y:lot.y+96})>350)throw Error('Walk to the district outpost lot first.');
   if(!Number.isInteger(a.col)||a.col<0||a.col>2||!Number.isInteger(a.row)||a.row<0||a.row>2)throw Error('Choose a tile in the 3 by 3 lot.');
   const i=p.outposts.findIndex(o=>o.clan===a.clan&&o.col===a.col&&o.row===a.row);
   if(a.type==='outpostRemove'){if(i<0)throw Error('Empty tile.');p.credits+=C.BUILD_KIT.find(k=>k.id===p.outposts[i].kind).cost;p.outposts.splice(i,1);return 'Outpost piece removed; play credits refunded.';}
   if(!['wall','tower','banner','floor','lamp'].includes(a.kind))throw Error('Unknown outpost piece.');const k=C.BUILD_KIT.find(k=>k.id===a.kind);
   if(i>=0)throw Error('Remove this piece first.');if(p.credits<k.cost)throw Error('Not enough play credits.');if(k.solid&&Math.abs(p.x-(lot.x+a.col*64+28))<46&&Math.abs(p.y-(lot.y+a.row*64+28))<46)throw Error('Step off the tile before building.');
   p.outposts.push({clan:a.clan,kind:k.id,col:a.col,row:a.row,rotation:0});p.credits-=k.cost;return k.name+' built in your private district lot.';
  }
  if(a.type==='joinClan'){if(this.conflict?.participants.has(id)&&['announced','gathering','active'].includes(this.conflict.phase))throw Error('Finish the conflict before changing clans.');const n=C.NEIGHBORHOODS.find(n=>n.id===a.clan);if(!n)throw Error('Unknown clan.');if(p.blockJob)throw Error('Finish your block job before changing clans.');if(p.heat>=22||p.fireHeld||p.contract||p.defense||p.rising?.arena)throw Error('Leave combat and finish your challenge before changing clans.');p.clan=n.id;return `Joined ${n.clan}. Complete block jobs to earn your clan stripes.`;}
  if(a.type==='blockJob'){
   const n=C.NEIGHBORHOODS.find(n=>n.id===p.clan);if(!n)throw Error('Join a clan first.');if(p.room||dist(p,n)>150)throw Error('Walk to your clan terminal to start.');if(p.contract||p.defense||p.rising?.arena||p.blockJob)throw Error('Finish your active challenge first.');if(p.heat>=22)throw Error('Lose your wanted level first.');if(p.blockCooldown>0)throw Error('The terminal is recharging.');if(!['circuit','delivery','hold','salvage'].includes(a.job))throw Error('Unknown block job.');
   const points=a.job==='salvage'?[{x:n.x-320,y:n.y-100},{x:n.x+320,y:n.y-100},{x:n.x+320,y:n.y+110},{x:n.x-320,y:n.y+110},n]:a.job==='circuit'?[{x:n.x,y:n.y-720},{x:n.x+950,y:n.y},{x:n.x,y:n.y+710},{x:n.x-950,y:n.y},n]:a.job==='delivery'?[{x:n.x+900,y:n.y},n]:[n];
   p.blockJob={type:a.job,clan:n.id,points:points.map(({x,y})=>({x,y})),index:0,remaining:a.job==='hold'?50:100,held:0,startDeaths:p.deaths};return a.job==='hold'?'Hold the terminal for 25 seconds. Leaving its ring pauses progress.':a.job==='salvage'?'Collect four salvage crates and return to the clan terminal. Stay beside each crate for two seconds.':'Follow the cyan checkpoints. Hoverboards allowed.';
  }
  if(a.type==='abandonBlock'){p.blockJob=null;p.blockCooldown=5;return 'Block job abandoned.';}
  if(p.blockJob&&['contract','defenseDrill','startSurvival','enterBuilding'].includes(a.type))throw Error('Finish or abandon your block job first.');
  return base.action.call(this,id,a);
 };
 P.tick=function(dt){base.tick.call(this,dt);dt=Math.max(0,Math.min(.1,dt));for(const p of this.players.values()){
  p.blockCooldown=Math.max(0,(p.blockCooldown||0)-dt);const j=p.blockJob;if(!j)continue;j.remaining-=dt;
  if(j.remaining<=0||p.deaths!==j.startDeaths||p.room){p.blockJob=null;p.blockCooldown=10;notice(p,'Block job ended. Your earned reputation is safe.');continue;}
  const target=j.points[j.index];if(dist(p,target)<95){if(j.type==='hold'){j.held+=dt;if(j.held>=25)j.index++;}else if(j.type==='salvage'){j.held+=dt;if(j.held>=2){j.index++;j.held=0;}}else j.index++;}else if(j.type==='salvage')j.held=0;
  if(j.index>=j.points.length){p.credits+=45;p.xp+=35;p.reputation[j.clan]++;p.blockJob=null;p.blockCooldown=20;notice(p,'BLOCK COMPLETE / +45 play credits · +35 XP · +1 clan reputation.');}
 }};
 P.snapshot=function(id){const s=base.snapshot.call(this,id);for(const p of s.players){const actual=this.player(p.id);p.clan=actual.clan;p.clanRank=rank(actual);p.holderTier=actual.holder?.expires>Date.now()?actual.holder.tier:0;}s.self.outposts=this.player(id).outposts.map(o=>({...o}));s.self.outpostStyles={...this.player(id).outpostStyles};return s;};
 root.CityClans=Object.freeze({restore,save,rank,outpostStyle});
})(typeof window==='undefined'?globalThis:window);
