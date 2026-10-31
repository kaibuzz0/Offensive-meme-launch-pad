/* Public world-v2 early-access rooms on the existing Render Free host.
 * Operator explicitly chose v2-only gameplay before durable storage is available.
 * NO durable saves, account recovery, wallet transactions or real reward balances.
 * The original /api/city/* host remains for compatibility and an emergency rollback.
 */
import http from 'node:http';
import {createCityServer} from './city-server.mjs';
import {createLocalWorld2Server} from './city-world2-local.mjs';

const ORIGIN='https://kaibuzz0.github.io';
export function createWorld2EphemeralPublicServer({origins=[ORIGIN]}={}){
 const legacy=createCityServer({origins});
 const v2=createLocalWorld2Server({
  origins,saveDir:null,bindHost:'127.0.0.1',productionMode:false,releaseReady:false
 });
 const server=http.createServer({requestTimeout:15000,headersTimeout:10000,maxHeaderSize:8192},(req,res)=>{
  if(String(req.url||'').split('?')[0].startsWith('/api/world2/'))v2.server.emit('request',req,res);
  else legacy.server.emit('request',req,res);
 });
 let running=false;
 server.on('listening',()=>{if(!running){running=true;v2.server.emit('listening');}});
 server.on('close',()=>{running=false;v2.server.emit('close');legacy.server.emit('close');});
 server.maxConnections=256;
 return {server,v2,legacy,mode:'world2-ephemeral-public',close:()=>new Promise((resolve,reject)=>{
  if(!server.listening)return resolve();
  server.close(e=>e?reject(e):resolve());
 })};
}
