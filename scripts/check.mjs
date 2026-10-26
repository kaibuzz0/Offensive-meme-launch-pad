import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const context={window:{}};vm.runInNewContext(read('tokens.js'),context);
const tokens=context.window.MEME_TOKENS;
assert.ok(tokens.length>=10,'At least 10 concepts are required');
assert.equal(new Set(tokens.map(t=>t.id)).size,tokens.length,'Unique token IDs');
for(const token of tokens){
  for(const field of ['id','name','ticker','category','description','context','art'])assert.ok(typeof token[field]==='string'&&token[field].length,`${token.id}: ${field}`);
  assert.ok(/^assets\/coins\/[a-z-]+\.webp$/.test(token.art),'Local artwork only');
  assert.ok(fs.existsSync(path.join(root,token.art)),`Missing art: ${token.art}`);
  assert.ok(token.mint===null||/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(token.mint),'Mint must be null or a Solana address');
}
const html=read('index.html');
for(const file of ['styles.css','app.js','tokens.js','assets/icon.svg','assets/coins/offensive.webp','launchpad-config.js','trade-core.js','trade.js','share-core.js','social.js','pwa.js','manifest.webmanifest'])assert.ok(html.includes(file),`Missing asset reference: ${file}`);
for(const id of ['token-grid','search','token-dialog','dialog-content','empty','results','toast','platform-buy','platform-mint','reward-state','buy-token','load-swap','offensive-swap-root','swap-status','swap-fallback'])assert.ok(html.includes(`id="${id}"`),`Missing interaction target: ${id}`);
for (const file of ['app.js','launchpad-config.js','trade-core.js','trade.js','share-core.js','social.js','pwa.js','sw.js']) new vm.Script(read(file));
console.log(`PASS: ${tokens.length} unique listings, all artwork, mint format checks, asset references, interaction targets, and JS syntax.`);
