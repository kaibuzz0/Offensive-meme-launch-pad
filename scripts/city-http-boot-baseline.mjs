// Reproducible local HTTP boot-transfer inventory (not an Android FPS benchmark).
// Run: node scripts/city-http-boot-baseline.mjs
import {performance} from 'node:perf_hooks';
import {createCityServer} from '../server/city-server.mjs';

const {server}=createCityServer();
const start=performance.now();
const results=[];
const seen=new Set();
try {
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',resolve);
  });
  const base='http://127.0.0.1:'+server.address().port+'/';
  async function measure(relative,kind) {
    const url=new URL(relative,base);
    if(url.origin!==new URL(base).origin)throw Error('Unexpected external asset');
    const canonical=url.pathname;
    if(seen.has(canonical))return;
    seen.add(canonical);
    const begin=performance.now();
    const response=await fetch(url,{headers:{'Accept-Encoding':'identity'}});
    if(!response.ok)throw Error(relative+' returned HTTP '+response.status);
    const bytes=new Uint8Array(await response.arrayBuffer());
    const elapsedMs=performance.now()-begin;
    results.push({path:canonical,kind,status:response.status,bytes:bytes.byteLength,elapsedMs:Number(elapsedMs.toFixed(2))});
    return new TextDecoder().decode(bytes);
  }
  const homepage=await measure('index.html','document');
  const play=homepage.match(/class="[^"]*game-direct-play[^"]*"[^>]*href="([^"]+)"/);
  if(!play)throw Error('Homepage primary Play entry is missing');
  const playTarget=play[1].replace(/&amp;/g,'&');
  const game=await measure(playTarget,'game document');
  const pattern=/<(?:script\b[^>]*\bsrc|link\b[^>]*\bhref)="([^"]+)"/gi;
  for(const [html,kind] of [[homepage,'homepage'],[game,'game']]){
    for(const match of html.matchAll(pattern)){
      const value=match[1].replace(/&amp;/g,'&');
      if(/^(?:https?:|data:|#)/i.test(value))continue;
      const asset=new URL(value,base);
      if(!/\.(?:js|css)(?:$|\?)/i.test(value)||asset.origin!==new URL(base).origin)continue;
      await measure(asset.pathname+asset.search,kind+' asset');
    }
  }
  const total=results.reduce((sum,item)=>sum+item.bytes,0);
  console.log(JSON.stringify({
    source:'local Node HTTP server; sequential identity-encoded transfers; not a real browser network trace',
    entry:'index.html',playTarget,
    elapsedMs:Number((performance.now()-start).toFixed(2)),
    uncompressedBytes:total,requests:results.length,resources:results
  },null,2));
} finally {
  await new Promise(resolve=>server.close(resolve));
}
