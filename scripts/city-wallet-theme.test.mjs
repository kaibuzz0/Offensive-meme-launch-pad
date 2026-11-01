import assert from 'node:assert/strict';
import test from 'node:test';
import {createThemeLookup} from '../server/city-wallet-theme.mjs';
import {createCityServer} from '../server/city-server.mjs';

const wallet='11111111111111111111111111111111',otherWallet='11111111111111111111111111111112';
const tokens=[{id:'offensive',mint:'A4gTwKUpL64nVTFDMSfDZxKcQRJNwwZ95X1MgoZPpump'}, {id:'congress',mint:'HFvDeiqwF5Tr3gMAHcbqoBMoSwoVgsbB342mfZV9pump'}];
const row=(mint,amount,decimals=6,owner=wallet)=>({account:{data:{parsed:{info:{owner,mint,tokenAmount:{amount,decimals}}}}}});
const json=value=>({ok:true,json:async()=>({result:{value}})});

test('backend theme detects largest real token quantity and caches same address',async()=>{
 let calls=0;const fetcher=async(_endpoint,req)=>{
  calls++;
  const parsed=JSON.parse(req.body);
  assert.equal(parsed.method,'getTokenAccountsByOwner');
  assert.equal(parsed.params[0],wallet);
  assert.equal(parsed.params[1].programId,'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  return json([row(tokens[0].mint,'950000000',6),row(tokens[1].mint,'20000000',6),
   row(tokens[1].mint,'980000000',6),row('OTHER','99999999999999999',6),
   row(tokens[1].mint,'999900000000',6,otherWallet)]);
 };
 const theme=createThemeLookup({tokens,fetcher});
 const results=await Promise.all([theme.lookup(wallet),theme.lookup(wallet)]);
 assert.deepEqual(results.map(x=>x.themeId),['congress','congress'],'1000 congress > 950 OFFENDED');
 assert.equal(results[0].verifiedOwnership,false,'address-only read is not holder proof');
 assert.equal(calls,1,'duplicate wallet checks share one cached RPC call');
});
test('theme supports fractional decimals, no token balance, and rejects invalid addresses',async()=>{
 const reader=createThemeLookup({tokens,fetcher:async()=>json([row(tokens[0].mint,'1',0),row(tokens[1].mint,'999',3)])});
 const result=await reader.lookup(wallet);assert.equal(result.themeId,'offensive','1 > 0.999 whole tokens');
 const empty=createThemeLookup({tokens,fetcher:async()=>json([row('UNKNOWN','4000000')])});
 assert.equal((await empty.lookup(wallet)).themeId,null);
 await assert.rejects(reader.lookup('not-a-wallet'),/Invalid public Solana address/);
});
test('provider errors fail visibly instead of pretending default theme means zero holdings',async()=>{
 const down=createThemeLookup({tokens,fetcher:async()=>({ok:false,status:429})});
 await assert.rejects(down.lookup(wallet),/busy.*429/);
 const corrupt=createThemeLookup({tokens,fetcher:async()=>({ok:true,json:async()=>({error:{message:'RPC failure'}})})});
 await assert.rejects(corrupt.lookup(wallet),/lookup failed/);
});
test('public read-only theme endpoint allows website CORS, without multiplayer login',async()=>{
 const room=createCityServer({origins:['https://kaibuzz0.github.io'],
   themeReader:{lookup:async address=>({themeId:address===wallet?'offensive':null,matchedTokens:1,verifiedOwnership:false})}});
 await new Promise((resolve,reject)=>{room.server.once('error',reject);room.server.listen(0,'127.0.0.1',resolve);});
 try{
  const base='http://127.0.0.1:'+room.server.address().port;
  const success=await fetch(base+'/api/city/theme?address='+wallet,{headers:{Origin:'https://kaibuzz0.github.io'}});
  assert.equal(success.status,200);
  assert.equal(success.headers.get('access-control-allow-origin'),'https://kaibuzz0.github.io');
  assert.equal((await success.json()).themeId,'offensive');
  const denied=await fetch(base+'/api/city/theme?address='+wallet,{headers:{Origin:'https://malicious.example'}});
  assert.equal(denied.status,403);
  const missing=await fetch(base+'/api/city/theme?address='+wallet);
  assert.equal(missing.status,200,'no room credentials needed for cosmetic read');
 }finally{
  room.server.closeAllConnections();
  await new Promise(resolve=>room.server.close(resolve));
 }
});
