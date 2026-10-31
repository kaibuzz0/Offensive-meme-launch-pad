import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import net from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';

async function freePort(){
 const server=net.createServer();
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const port=server.address().port;
 await new Promise(resolve=>server.close(resolve));
 return port;
}

test('actual existing Render startup command boots public World V2 without circular top-level await',async()=>{
 const port=await freePort();
 let stderr='';
 const proc=spawn(process.execPath,['server/city-server.mjs'],{
  cwd:new URL('../',import.meta.url).pathname,
  env:{...process.env,PORT:String(port),CITY_ALLOWED_ORIGINS:'https://kaibuzz0.github.io'},
  stdio:['ignore','pipe','pipe']
 });
 proc.stderr.setEncoding('utf8');proc.stderr.on('data',chunk=>{stderr+=chunk;});
 let ready=false;
 try{
  for(let i=0;i<90;i++){
   if(proc.exitCode!==null||proc.signalCode!==null)throw Error('Production Node entry exited '+proc.exitCode+' / '+stderr);
   try{
    const res=await fetch('http://127.0.0.1:'+port+'/api/world2/health',{signal:AbortSignal.timeout(500)});
    if(res.ok){
     const health=await res.json();
     assert.equal(health.worldVersion,2);
     assert.equal(health.persistence,false);
     ready=true;break;
    }
   }catch{}
   await delay(100);
  }
  assert.equal(ready,true,'Actual Render entrypoint must expose V2 API. '+stderr);
  const old=await fetch('http://127.0.0.1:'+port+'/api/city/health');
  assert.equal(old.status,200);
 }finally{
  proc.kill('SIGTERM');
  await Promise.race([new Promise(resolve=>proc.once('exit',resolve)),delay(1500)]);
  if(proc.exitCode===null&&proc.signalCode===null)proc.kill('SIGKILL');
 }
});
