/* Guarded entry for the existing public room service.
 * The legacy server is the default. A production v2 backend is activated only by
 * an explicit operator flag AND the existing durable-volume fail-closed checks.
 * Never silently fall back to V1 after an explicit V2 request fails validation:
 * a deployment must fail visibly rather than quietly discard player progress.
 */
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCityServer} from './city-server.mjs';
import {createWorld2PublicServer} from './city-world2-production.mjs';

export async function createGuardedWorld2Server({env=process.env}={}){
 const origins=String(env.CITY_ALLOWED_ORIGINS||'https://kaibuzz0.github.io').split(',').filter(Boolean);
 if(env.WORLD2_PRODUCTION_BACKEND==='yes'){
  const service=await createWorld2PublicServer({
   saveDir:env.WORLD2_PROD_SAVE_DIR,allowedOrigin:env.WORLD2_PROD_ORIGIN,
   durableConfirmed:env.WORLD2_DURABLE_VOLUME_CONFIRMED});
  return {server:service.server,mode:'world2-staged',close:()=>service.close()};
 }
 if(env.WORLD2_PUBLIC_RELEASE_APPROVED==='yes')
  throw Error('Cannot approve world2 public cutover while its production backend is disabled.');
 const legacy=createCityServer({origins});
 return {server:legacy.server,mode:'world1-rollback',close:()=>new Promise((resolve,reject)=>{
  legacy.server.close(e=>e?reject(e):resolve());
 })};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let service;
 try{
  service=await createGuardedWorld2Server();
  const port=Number(process.env.PORT||10000);
  if(!Number.isSafeInteger(port)||port<1||port>65535)throw Error('Invalid public port.');
  await new Promise((resolve,reject)=>{
   service.server.once('error',reject);
   service.server.listen(port,'0.0.0.0',()=>{
    service.server.off('error',reject);resolve();
   });
  });
  console.log('Meme City guarded production server listening on '+port+' in '+service.mode+' mode.');
  let stopping=false;
  const stop=async()=>{
   if(stopping)return;stopping=true;
   try{await service.close();process.exitCode=0;}
   catch(e){console.error('Meme City graceful shutdown failed: '+String(e.message));process.exitCode=1;}
  };
  process.once('SIGTERM',()=>{void stop();});
  process.once('SIGINT',()=>{void stop();});
 }catch(e){
  console.error('Meme City refused startup: '+String(e.message));
  process.exitCode=1;
  if(service)await service.close().catch(()=>{});
 }
}
