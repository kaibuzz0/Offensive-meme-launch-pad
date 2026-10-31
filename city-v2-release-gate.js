/* World-v2 production cutover gate.
 * An unavailable or ineligible server leaves the existing world1 game untouched.
 * Existing world1 localStorage is NEVER read, changed, migrated or removed here.
 * Use ?legacy=1 to skip the gate and access the original version on demand.
 */
'use strict';
(function(root){
 const api='https://offensive-meme-city-rooms.onrender.com/api/world2/health';
 function eligible(s){return !!s&&s.worldVersion===2&&s.preview===false&&
  s.persistence===true&&s.releaseReady===true;}
 function enabled(){
  return root.location?.origin==='https://kaibuzz0.github.io'&&
   root.location?.protocol==='https:'&&
   root.location?.pathname?.endsWith('/city.html')&&
   !/(?:^|[?&])legacy=1(?:&|$)/.test(root.location.search||'');
 }
 if(enabled()&&typeof root.fetch==='function'){
  root.fetch(api,{cache:'no-store',redirect:'error'}).then(async response=>{
   if(!response.ok)return;
   const info=await response.json();
   if(eligible(info))root.location.replace('./city-world2-production.html');
  }).catch(()=>{/* retain working world1 fallback */});
 }
 root.CityWorld2ReleaseGate=Object.freeze({eligible,enabled});
})(window);
