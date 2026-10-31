/* World-v2-only public entry.
 * The owner explicitly selected v2 gameplay on temporary free-tier rooms
 * before persistence is available. Never read or change world1 local saves.
 * Do not load a second gameplay world as an automatic fallback.
 */
'use strict';
(function(root){
 function enabled(){
  return root.location?.origin==='https://kaibuzz0.github.io'&&
   root.location?.protocol==='https:'&&
   root.location?.pathname?.endsWith('/city.html');
 }
 // This transition is unconditional: no health-dependent fallback to world1.
 if(enabled())root.location.replace('./city-world2-production.html');
 root.CityWorld2ReleaseGate=Object.freeze({enabled});
})(window);
