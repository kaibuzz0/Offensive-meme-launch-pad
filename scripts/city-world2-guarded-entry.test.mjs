import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardedWorld2Server} from '../server/city-world2-guarded-entry.mjs';

test('paid Render blueprint stages durable volume but keeps world-v1 default',()=>{
 const file=fs.readFileSync(new URL('../render.yaml',import.meta.url),'utf8');
 assert.match(file,/plan: starter/);
 assert.match(file,/mountPath: \/var\/data/);
 assert.match(file,/sizeGB: 1/);
 assert.match(file,/startCommand: node server\/city-world2-guarded-entry.mjs/);
 assert.match(file,/WORLD2_DURABLE_VOLUME_CONFIRMED\s*\n\s*value: "no"/);
 assert.match(file,/WORLD2_PRODUCTION_BACKEND\s*\n\s*value: "no"/);
 assert.match(file,/WORLD2_PUBLIC_RELEASE_APPROVED\s*\n\s*value: "no"/);
});
test('guarded Render start keeps existing V1 API while production disk is unapproved',async()=>{
 const setup=await createGuardedWorld2Server({env:{
  CITY_ALLOWED_ORIGINS:'https://kaibuzz0.github.io',WORLD2_PRODUCTION_BACKEND:'no',
  WORLD2_PUBLIC_RELEASE_APPROVED:'no',WORLD2_DURABLE_VOLUME_CONFIRMED:'no'}});
 assert.equal(setup.mode,'world1-rollback');
 try{
  await new Promise((resolve,reject)=>{setup.server.once('error',reject);setup.server.listen(0,'127.0.0.1',resolve);});
  const address=setup.server.address();
  const health=await fetch('http://127.0.0.1:'+address.port+'/api/city/health');
  assert.equal(health.status,200);
  const game=await fetch('http://127.0.0.1:'+address.port+'/city.html?legacy=1');
  assert.equal(game.status,200);
  const v2=await fetch('http://127.0.0.1:'+address.port+'/api/world2/health');
  assert.notEqual(v2.status,200,'production V2 cannot be used until operator enables its server');
 }finally{await setup.close();}
});
test('guarded Render start refuses unsafe manual production flags without changing legacy data',async()=>{
 await assert.rejects(createGuardedWorld2Server({env:{
  WORLD2_PUBLIC_RELEASE_APPROVED:'yes',WORLD2_PRODUCTION_BACKEND:'no'}}),/Cannot approve world2/);
 await assert.rejects(createGuardedWorld2Server({env:{
  WORLD2_PUBLIC_RELEASE_APPROVED:'no',WORLD2_PRODUCTION_BACKEND:'yes',
  WORLD2_DURABLE_VOLUME_CONFIRMED:'no',
  WORLD2_PROD_SAVE_DIR:'/var/data/world2',
  WORLD2_PROD_ORIGIN:'https://kaibuzz0.github.io'}}),/durable volume/);
});
