/* Read-only token-themed website lookup. Public address != proof of wallet ownership.
 * Uses the backend's configured Solana RPC (SOLANA_RPC_URL) so Phantom/Android
 * browsers do not send CORS-sensitive requests directly to a public RPC node.
 */
import {decode58} from './city-holdings.mjs';
const TOKEN_PROGRAM='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

export function createThemeLookup({tokens,rpc=process.env.SOLANA_RPC_URL||'https://api.mainnet-beta.solana.com',fetcher=fetch,now=Date.now}={}){
 const endpoint=new URL(rpc);
 if(endpoint.protocol!=='https:')throw Error('Token theme RPC must use HTTPS.');
 const byMint=new Map((tokens||[]).filter(t=>t?.mint).map(t=>[t.mint,t.id]));
 const cache=new Map(),ttl=45000,maxCached=160;
 function addressValid(address){
  if(typeof address!=='string'||address.length<32||address.length>44)return false;
  try{return decode58(address).length===32;}catch{return false;}
 }
 async function lookup(address){
  if(!addressValid(address)){const e=Error('Invalid public Solana address.');e.status=400;throw e;}
  const cached=cache.get(address),time=now();
  if(cached&&time<cached.expires)return cached.promise;
  if(cache.size>=maxCached){
   for(const [key,item] of cache)if(now()>=item.expires)cache.delete(key);
   if(cache.size>=maxCached)cache.delete(cache.keys().next().value);
  }
  const promise=(async()=>{
   let response;
   try{response=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    jsonrpc:'2.0',id:1,method:'getTokenAccountsByOwner',
    params:[address,{programId:TOKEN_PROGRAM},{encoding:'jsonParsed',commitment:'confirmed'}]
   }),signal:AbortSignal.timeout(10000)});}
   catch{const e=Error('Solana balance service is temporarily unreachable.');e.status=503;throw e;}
   if(!response.ok){const e=Error('Solana balance provider is busy ('+response.status+').');e.status=503;throw e;}
   const data=await response.json().catch(()=>null);
   if(!Array.isArray(data?.result?.value)||data.error){const e=Error('Token balance lookup failed at the RPC provider.');e.status=503;throw e;}
   const totals=new Map();
   for(const row of data.result.value){
    const info=row.account?.data?.parsed?.info,amount=info?.tokenAmount,id=byMint.get(info?.mint);
    if(!id||info?.owner!==address||!/^[0-9]+$/.test(amount?.amount)||!Number.isInteger(amount?.decimals)||amount.decimals<0||amount.decimals>18)continue;
    const prior=totals.get(id);
    if(prior&&prior.decimals!==amount.decimals)continue;
    totals.set(id,{id,units:(prior?.units||0n)+BigInt(amount.amount),decimals:amount.decimals});
   }
   const sorted=[...totals.values()].filter(x=>x.units>0n).sort((a,b)=>{
    const left=a.units*10n**BigInt(b.decimals),right=b.units*10n**BigInt(a.decimals);
    return left===right?a.id.localeCompare(b.id):left>right?-1:1;
   });
   return {themeId:sorted[0]?.id||null,matchedTokens:sorted.length,source:'solana-mainnet',verifiedOwnership:false};
  })();
  cache.set(address,{promise,expires:time+ttl});
  try{return await promise;}catch(e){cache.delete(address);throw e;}
 }
 return {lookup};
}
