import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {generateKeyPairSync,sign} from 'node:crypto';
import {holdingsService} from '../server/city-holdings.mjs';

const scope={window:{}};
for(const file of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-clans.js'])
 vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),scope);
vm.runInNewContext(fs.readFileSync(new URL('../tokens.js',import.meta.url),'utf8'),scope);
const C=scope.window.MemeCityCore;
const tokens=scope.window.MEME_TOKENS;
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58(bytes){let n=0n;for(const b of bytes)n=n*256n+BigInt(b);let out='';while(n){out=alphabet[Number(n%58n)]+out;n/=58n;}for(const b of bytes){if(b!==0)break;out='1'+out;}return out;}
const keys=generateKeyPairSync('ed25519');
const address=base58(keys.publicKey.export({format:'der',type:'spki'}).subarray(-32));

test('five live beta-token balances signed by same wallet auto-equip only matching skin; revoked balance locks it',async()=>{
 let clock=Date.now(),balance='1';
 const launched=tokens.filter(t=>C.CLAN_SKINS.includes(t.id)&&!!t.mint);
 assert.equal(launched.length,5);
 const mints=Object.fromEntries(launched.map(t=>[t.id,t.mint]));
 const holdings=holdingsService({mints,now:()=>clock,fetcher:async(_url,request)=>{
  const json=JSON.parse(request.body),mint=json.params[1].mint;
  return {ok:true,json:async()=>({result:{value:balance==='0'?[]:[{account:{data:{parsed:{info:{
   owner:address,mint,tokenAmount:{amount:balance,decimals:0}
  }}}}}]}})};
 }});
 const e=new C.Engine(),p=e.join('test','Verified Player','offensive');
 for(const token of launched){
  clock+=16000;balance='1';
  const session={id:'test-'+token.id},challenge=holdings.challenge(session,address);
  const signature=sign(null,Buffer.from(challenge.message),keys.privateKey).toString('base64');
  const result=await holdings.check(session,p,{clan:token.id,signature});
  assert.equal(result.tier,1);
  assert.equal(p.clanSkin,token.id,'positive verified '+token.ticker+' balance automatically wears the skin');
  assert.equal(C.verifiedSkin(p),token.id);
  assert.equal(e.snapshot(p.id).self.clanSkin,token.id);
  // Mismatched balance may not be used as entitlement for another token.
  for(const other of launched)if(other.id!==token.id)assert.throws(()=>e.action(p.id,{type:'clanSkin',skin:other.id}),/Verify a positive balance/);
  clock+=16000;balance='0';
  const sold=await holdings.check(session,p,{clan:token.id});
  assert.equal(sold.tier,0,'zero balance fails closed');
  assert.equal(p.clanSkin,null,'sold tokens immediately unequip');
  assert.equal(C.verifiedSkin(p),null);
 }
 clock+=16000;
 await assert.rejects(()=>holdings.check({id:'mintless'},p,{clan:'rug'}),/Unknown token/,'RUGME has no minted entitlement yet');
});
