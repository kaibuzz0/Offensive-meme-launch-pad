import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const context={window:{},URL};
for(const file of ['tokens.js','launchpad-config.js','share-core.js'])vm.runInNewContext(read(file),context);
const {MEME_TOKENS:catalog,LAUNCHPAD_CONFIG:config,OffensiveShareCore:core}=context.window;
const all=[...catalog,config.platformToken];
test('site shares strip query/fragment state and token shares use unique public pages',()=>{
 const site=core.payload(null,catalog,config.platformToken,config.siteUrl+'?wallet=private#session');
 assert.equal(site.url,config.siteUrl);
 const urls=new Set();
 for(const token of all){
  const p=core.payload(token.id,catalog,config.platformToken,config.siteUrl);
  assert.equal(p.url,`${config.siteUrl}tokens/${token.id}/`);
  assert.ok(p.text.includes(`$${token.ticker}`));
  assert.ok(p.text.includes(token.mint||'Concept / not launched.'));
  urls.add(p.url);
 }
 assert.equal(urls.size,11);
 assert.throws(()=>core.payload('../escape',catalog,config.platformToken,config.siteUrl));
});
test('six social compose URLs preserve encoded token details and exact canonical link',()=>{
 const p=core.payload('redacted',catalog,config.platformToken,config.siteUrl);
 const links=core.links(p);assert.equal(links.length,6);
 for(const [label,href]of links){
  const url=new URL(href);assert.equal(url.protocol,'https:');
  if(label==='X'){assert.equal(url.searchParams.get('text'),p.text);assert.equal(url.searchParams.get('url'),p.url);}
  else if(label==='Facebook')assert.equal(url.searchParams.get('u'),p.url);
  else if(label==='WhatsApp')assert.equal(url.searchParams.get('text'),`${p.text}\n${p.url}`);
  else assert.equal(url.searchParams.get('url'),p.url);
 }
});
test('every generated share page has token-specific metadata, artwork, mint and referral links',()=>{
 for(const token of all){
  const html=read(`tokens/${token.id}/index.html`);
  assert.ok(html.includes(`content="${config.siteUrl}tokens/${token.id}/"`));
  assert.ok(html.includes('property="og:image"'));
  assert.ok(html.includes('name="twitter:card"'));
  assert.ok(html.includes(token.art));
  assert.equal((html.match(/href="https:\/\/pump.fun\/u\/kaibuzz0"/g)||[]).length,2);
  if(token.mint)assert.ok(html.includes(token.mint));
  else assert.ok(html.includes('CONCEPT / NOT LAUNCHED'));
 }
});
test('manifest remains in the GitHub project scope and has real correctly sized PNG icons',()=>{
 const manifest=JSON.parse(read('manifest.webmanifest'));
 assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.id,'./');assert.equal(manifest.display,'standalone');
 for(const size of [192,512])assert.ok(manifest.icons.some(i=>i.sizes===`${size}x${size}`&&i.purpose==='any'));
 for(const icon of manifest.icons){
  const bytes=fs.readFileSync(path.join(root,icon.src));assert.equal(bytes.subarray(1,4).toString(),'PNG');
  const [w,h]=icon.sizes.split('x').map(Number);assert.equal(bytes.readUInt32BE(16),w);assert.equal(bytes.readUInt32BE(20),h);
 }
 const html=read('index.html');assert.ok(html.includes('rel="manifest"'));assert.ok(html.includes('rel="apple-touch-icon"'));
 assert.equal((html.match(/href="https:\/\/pump.fun\/u\/kaibuzz0"/g)||[]).length,2);
});
function worker(fetchImpl){
 const handlers={};const offline={offline:true};
 vm.runInNewContext(read('sw.js'),{URL,self:{registration:{scope:config.siteUrl},location:{origin:new URL(config.siteUrl).origin},clients:{claim:async()=>{}},addEventListener:(name,fn)=>handlers[name]=fn},fetch:fetchImpl,caches:{match:async url=>{assert.equal(url,`${config.siteUrl}offline.html`);return offline;}}});
 return {handlers,offline};
}
test('service worker never intercepts financial scripts, quote APIs or POST requests',()=>{
 const {handlers}=worker(()=>{throw new Error('Unexpected network request');});
 for(const request of [
  {method:'GET',mode:'cors',url:`${config.siteUrl}tokens.js`},
  {method:'GET',mode:'cors',url:`${config.siteUrl}launchpad-config.js`},
  {method:'GET',mode:'cors',url:`${config.siteUrl}trade.js`},
  {method:'GET',mode:'cors',url:'https://api.jup.ag/swap/v1/quote'},
  {method:'POST',mode:'cors',url:`${config.siteUrl}anything`}
 ])handlers.fetch({request,respondWith:()=>assert.fail('Financial/network-only request intercepted')});
});
test('offline navigation returns the offline page instead of stale financial data',async()=>{
 const {handlers,offline}=worker(async()=>{throw new Error('Offline');});let response;
 handlers.fetch({request:{method:'GET',mode:'navigate',url:config.siteUrl},respondWith:p=>response=p});
 assert.equal(await response,offline);
});
