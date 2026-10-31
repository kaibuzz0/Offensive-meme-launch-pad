/* Standalone production-v2 API. It will not start without operator-confirmed
 * durable storage. Not activated by the current free-tier world1 deployment.
 */
import path from 'node:path';
import http from 'node:http';
import {createCityServer} from './city-server.mjs';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createLocalWorld2Server} from './city-world2-local.mjs';
export async function createWorld2PublicServer({saveDir=process.env.WORLD2_PROD_SAVE_DIR,
 allowedOrigin=process.env.WORLD2_PROD_ORIGIN,
 durableConfirmed=process.env.WORLD2_DURABLE_VOLUME_CONFIRMED,
 bindHost='0.0.0.0',testOnlyAllowEphemeralSaveDir=false}={}){
 if(durableConfirmed!=='yes')throw Error('Production v2 disabled: durable volume approval required.');
 if(allowedOrigin!=='https://kaibuzz0.github.io')
  throw Error('Production v2 disabled: official HTTPS frontend origin required.');
 if(typeof saveDir!=='string'||!path.isAbsolute(saveDir)||saveDir==='/'||
  (!testOnlyAllowEphemeralSaveDir&&(saveDir.startsWith('/tmp/')||saveDir==='/tmp'||
  saveDir.startsWith('/mnt/data/')||saveDir.startsWith('/home/runner/'))))
  throw Error('Production v2 disabled: explicit durable absolute save directory required.');
 const resolved=path.resolve(saveDir),stat=await fs.stat(resolved).catch(()=>null);
 if(!stat?.isDirectory())throw Error('Production v2 disabled: provision durable save directory first.');
 const proof=await fs.readFile(path.join(resolved,'.durable-world2-volume'),'utf8').catch(()=>null);
 if(proof?.trim()!=='world2-persistent-volume-approved-v1')
  throw Error('Production v2 disabled: durable volume marker missing.');
 // Both API generations remain live on one Render listener, so rollback never
 // destroys the existing world1 multiplayer endpoint while v2 is being introduced.
 const legacy=createCityServer({origins:[allowedOrigin]});
 const v2=createLocalWorld2Server({origins:[allowedOrigin],saveDir:resolved,bindHost:'127.0.0.1',
  productionMode:true,releaseReady:process.env.WORLD2_PUBLIC_RELEASE_APPROVED==='yes'});
 const server=http.createServer((req,res)=>{
  const name=String(req.url||'').split('?')[0];
  if(name.startsWith('/api/world2/'))v2.server.emit('request',req,res);
  else legacy.server.emit('request',req,res);
 });
 server.on('listening',()=>v2.server.emit('listening'));
 server.on('close',()=>{v2.server.emit('close');legacy.server.emit('close');});
 let closing=false;
 return {server,rooms:v2.rooms,legacy:legacy.service,listen:port=>new Promise((resolve,reject)=>{
  server.once('error',reject);server.listen(port,bindHost,()=>{
   server.removeListener('error',reject);resolve(server.address());
  });
 }),close:async()=>{
  if(closing)return;closing=true;
  await v2.flush();
  await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
 }};

}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const service=await createWorld2PublicServer();
  const port=Number(process.env.PORT||8788);
  if(!Number.isSafeInteger(port)||port<1||port>65535)throw Error('Invalid public port.');
  await service.listen(port);
  console.log('World2 HTTPS API started behind TLS proxy on port '+port);
 }catch(e){console.error(String(e.message));process.exitCode=1;}
}
