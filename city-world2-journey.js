/* Four-stop world2 city orientation. Preview credits only.
 * Server alone owns the step order, location validation, payouts and completion state.
 * Never reads browser saves, a wallet, or client-supplied balance/position.
 */
'use strict';
(function(root){
 function create(registry,nav){
  if(!registry?.resolve||!nav?.plan)throw Error('Canonical world2 mission registry/navigation required.');
  const ids=Object.freeze(['checkpoint:0','district:arena','checkpoint:1','checkpoint:2']);
  const targets=Object.freeze(ids.map(id=>{
   const point=registry.resolve(id);
   if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))
    throw Error('Missing world2 orientation destination: '+id);
   return Object.freeze({id:point.id,name:point.name,x:point.x,y:point.y});
  }));
  const cap=Object.freeze({xp:1000000000,credits:1000000});
  function session(){
   let index=0;
   function snapshot(){return {index,total:targets.length,completed:index===targets.length,
    target:index<targets.length?targets[index]:null};}
   function claim(player){
    if(index>=targets.length)throw Error('City orientation already complete.');
    if(!player||player.room||!(player.hp>0))throw Error('Return alive to world2 streets first.');
    const target=targets[index];
    if(!Number.isFinite(player.x)||!Number.isFinite(player.y)||
      Math.hypot(player.x-target.x,player.y-target.y)>135)
     throw Error('Move within 135 units of your next city objective: '+target.name+'.');
    const final=index===targets.length-1;
    const xp=final?135:45,credits=final?100:35;
    if(!Number.isSafeInteger(player.xp)||player.xp<0||player.xp>cap.xp-xp||
      !Number.isSafeInteger(player.credits)||player.credits<0||player.credits>cap.credits-credits)
     throw Error('Orientation rewards exceed the safe play-credit or XP limit.');
    player.xp+=xp;player.credits+=credits;
    index++;return 'City objective '+index+'/'+targets.length+' completed: '+target.name+
      '. +'+xp+' preview XP, +'+credits+' preview credits.'+
      (final?' Orientation complete.':'');
   }
   return Object.freeze({claim,snapshot});
  }
  return Object.freeze({session,targets});
 }
 root.CityWorld2Journey=Object.freeze({create});
})(typeof window==='undefined'?globalThis:window);
