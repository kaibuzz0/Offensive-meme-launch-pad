/* INACTIVE world2 server authority test harness, deliberately unmounted from the public API. */
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createRooms} from './city-rooms.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
export function createWorld2PrototypeRooms(options={}){
 const scope={};
 for(const file of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js',
  'city-topology.js','city-nav.js','city-world2.js','city-world2-registry.js',
  'city-world2-territory.js','city-world2-contracts.js','city-world2-services.js','city-world2-defense.js','city-world2-journey.js','city-world2-authority.js']){
  vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),scope,{filename:file});
 }
 const C=scope.MemeCityCore,I=scope.CityInteriors,T=scope.CityTopology,W=scope.CityWorld2.create(C,I,T);
 const R=scope.CityWorld2Registry.create(C,I,scope.CityRising,T,W);
 const Engine=scope.CityWorld2Authority.createClass(C,I,W,R,scope.CityNav,scope.CityWorld2Territory,scope.CityWorld2Contracts,scope.CityWorld2Services,scope.CityWorld2Defense,scope.CityWorld2Journey);
 return {rooms:createRooms(Engine,options),Engine,W,R,C,I};
}
