import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import fs from 'node:fs';
import vm from 'node:vm';
import {createWorld2PublicServer} from '../server/city-world2-production.mjs';
const src=fs.readFileSync(new URL('../city-world2-online-transport.js',import.meta.url),'utf8');
test('public world2 fails closed without approved durable storage and official frontend',async()=>{
 const r={saveDir:'/var/data/world2',allowedOrigin:'https://kaibuzz0.github.io'};
 await assert.rejects(createWorld2PublicServer({...r,durableConfirmed:'no'}),/durable volume/);
 await assert.rejects(createWorld2PublicServer({...r,durableConfirmed:'yes',allowedOrigin:'https://evil.example'}),/official HTTPS/);
 await assert.rejects(createWorld2PublicServer({...r,durableConfirmed:'yes',saveDir:'/tmp/world2'}),/durable absolute/);
 await assert.rejects(createWorld2PublicServer({...r,durableConfirmed:'yes',saveDir:'/var/data/world2-not-found'}),/provision durable/);
});
test('production server refuses missing durability marker; accepts explicit marker and restricts origins',async t=>{
 // Render build containers can have /var/tmp mounted read-only. Use the checked-out
 // workspace for the ephemeral test fixture; do not loosen production disk guards.
 let dir;
 try{dir=await mkdtemp(path.join(process.cwd(),'.world2-prod-test-'));}
 catch(e){if(['EROFS','EACCES'].includes(e?.code)){t.skip('Read-only Render builder; writable CI runs full disk test');return;}throw e;}
 try{
  // Only the controlled test call can opt out of rejecting ephemeral checkout paths.
  const opts={saveDir:dir,durableConfirmed:'yes',allowedOrigin:'https://kaibuzz0.github.io',bindHost:'127.0.0.1',testOnlyAllowEphemeralSaveDir:true};
  await assert.rejects(createWorld2PublicServer({...opts,testOnlyAllowEphemeralSaveDir:false}),/durable absolute/);
  await assert.rejects(createWorld2PublicServer(opts),/marker missing/);
  await writeFile(path.join(dir,'.durable-world2-volume'),'world2-persistent-volume-approved-v1\n');
  const service=await createWorld2PublicServer(opts);
  try{
   const address=await service.listen(0);
   const url='http://127.0.0.1:'+address.port+'/api/world2/health';
   const ok=await fetch(url,{headers:{Origin:'https://kaibuzz0.github.io'}});
   assert.equal(ok.status,200);
   const health=await ok.json();assert.equal(health.persistence,true);
   assert.equal(health.preview,false);assert.equal(health.releaseReady,false);
   const legacy=await fetch('http://127.0.0.1:'+address.port+'/api/city/health');
   assert.equal(legacy.status,200);
   assert.equal((await legacy.json()).protocol,2);
   const html=await fetch('http://127.0.0.1:'+address.port+'/city.html');
   assert.equal(html.status,200);
   assert.match(await html.text(),/Meme City/);
   const no=await fetch(url,{headers:{Origin:'https://evil.example'}});
   assert.equal(no.status,403);
  }finally{await service.close();}
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('pinned public frontend can only call official HTTPS API from verified official origin',()=>{
 const make=(origin,flag)=>{
  const ctx={location:{origin,protocol:'https:'},fetch:async()=>{},MEME_CITY_WORLD2_PUBLIC:flag};
  ctx.window=ctx;vm.runInNewContext(src,ctx);return ctx.CityWorld2OnlineTransport;
 };
 assert.doesNotThrow(()=>make('https://kaibuzz0.github.io',true).create({
  base:'https://offensive-meme-city-rooms.onrender.com/api/world2'}));
 assert.throws(()=>make('https://evil.example',true).create({
  base:'https://offensive-meme-city-rooms.onrender.com/api/world2'}),/approved/);
 assert.throws(()=>make('https://kaibuzz0.github.io',false).create({
  base:'https://offensive-meme-city-rooms.onrender.com/api/world2'}),/approved/);
 assert.throws(()=>make('https://kaibuzz0.github.io',true).create({
  base:'https://evil.example/api/world2'}),/approved/);
});
