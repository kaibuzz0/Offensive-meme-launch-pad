import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createCityServer} from '../server/city-server.mjs';
import {holdingsService} from '../server/city-holdings.mjs';

const mint='A4gTwKUpL64nVTFDMSfDZxKcQRJNwwZ95X1MgoZPpump';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58(bytes){
 let value=0n;for(const b of bytes)value=value*256n+BigInt(b);
 let text='';while(value){text=alphabet[Number(value%58n)]+text;value/=58n;}
 for(const b of bytes){if(b!==0)break;text='1'+text;}
 return text;
}
const keys=generateKeyPairSync('ed25519');
const wallet=base58(keys.publicKey.export({format:'der',type:'spki'}).subarray(-32));

test('solo wallet ownership unlocks the skin without joining, refreshes and revokes',async()=>{
 let clock=Date.now(),calls=0;
 const holdings=holdingsService({mints:{offensive:mint},now:()=>clock,fetcher:async()=>{
  calls++;
  return {ok:true,json:async()=>({result:{value:[{account:{data:{parsed:{info:{owner:wallet,mint,tokenAmount:{amount:'3000000',decimals:6}}}}}}]}})};
 }});
 const app=createCityServer({origins:['https://kaibuzz0.github.io'],now:()=>clock,holdingsReader:holdings,themeReader:{lookup:async()=>({themeId:null})}});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 const api='http://127.0.0.1:'+app.server.address().port+'/api/city';
 const post=async(path,data,origin='https://kaibuzz0.github.io')=>{
  const response=await fetch(api+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(data)});
  return {status:response.status,body:await response.json()};
 };
 try{
  assert.equal((await post('/solo-wallet/check',{proofId:'missing',clan:'offensive'})).status,401);
  assert.equal((await post('/solo-wallet/challenge',{address:wallet},'https://evil.example')).status,403);
  const challenge=await post('/solo-wallet/challenge',{address:wallet});
  assert.equal(challenge.status,200);assert.ok(challenge.body.message.includes(wallet));
  const {proofId,message}=challenge.body;
  assert.equal((await post('/solo-wallet/check',{proofId,clan:'offensive'})).status,401);
  const signature=sign(null,Buffer.from(message),keys.privateKey).toString('base64');
  const checked=await post('/solo-wallet/check',{proofId,clan:'offensive',signature});
  assert.equal(checked.status,200);assert.equal(checked.body.tier,1);assert.equal(checked.body.verifiedOwnership,true);
  assert.equal((await post('/solo-wallet/check',{proofId,clan:'offensive',signature})).status,400,'signature replay is rejected');
  clock+=60000;
  assert.equal((await post('/solo-wallet/check',{proofId,clan:'offensive'})).body.tier,1);
  assert.equal(calls,2);
  clock+=11*60*1000;
  assert.equal((await post('/solo-wallet/check',{proofId,clan:'offensive'})).body.tier,1,'active session renews near its idle expiry');
  clock+=11*60*1000;
  assert.equal((await post('/solo-wallet/check',{proofId,clan:'offensive'})).body.tier,1,'signed proof stays usable beyond its original 12-minute TTL');
  assert.equal(calls,4);
  clock+=13*60*1000;
  assert.equal((await post('/solo-wallet/check',{proofId,clan:'offensive'})).status,401,'idle proof expires instead of granting permanent access');
  assert.equal((await post('/solo-wallet/revoke',{proofId})).status,200);
  assert.equal((await post('/solo-wallet/check',{proofId,clan:'offensive'})).status,401);
 }finally{
  app.server.closeAllConnections();
  await new Promise(resolve=>app.server.close(resolve));
 }
});
test('expired proof cannot unlock holder cosmetics even with a valid signature',async()=>{
 let clock=Date.now();
 const holdings=holdingsService({mints:{offensive:mint},now:()=>clock,fetcher:async()=>{throw Error('RPC must not run on an expired proof');}});
 const app=createCityServer({origins:['https://kaibuzz0.github.io'],now:()=>clock,holdingsReader:holdings,themeReader:{lookup:async()=>({themeId:null})}});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 const api='http://127.0.0.1:'+app.server.address().port+'/api/city';
 const post=async(path,body)=>{
  const res=await fetch(api+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://kaibuzz0.github.io'},body:JSON.stringify(body)});
  return {status:res.status,data:await res.json()};
 };
 try{
  const created=await post('/solo-wallet/challenge',{address:wallet});assert.equal(created.status,200);
  clock+=13*60*1000;
  const signature=sign(null,Buffer.from(created.data.message),keys.privateKey).toString('base64');
  assert.equal((await post('/solo-wallet/check',{proofId:created.data.proofId,clan:'offensive',signature})).status,401);
 }finally{
  app.server.closeAllConnections();await new Promise(resolve=>app.server.close(resolve));
 }
});
