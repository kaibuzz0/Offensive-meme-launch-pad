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
const html=read('beta.html');
for(const file of ['styles.css','app.js','tokens.js','assets/icon.svg','assets/coins/offensive.webp','launchpad-config.js','trade-core.js','trade.js','share-core.js','social.js','pwa.js','manifest.webmanifest'])assert.ok(html.includes(file),`Missing asset reference: ${file}`);
for(const id of ['token-grid','search','token-dialog','dialog-content','empty','results','toast','platform-buy','platform-mint','reward-state','buy-token','load-swap','offensive-swap-root','swap-status','swap-fallback'])assert.ok(html.includes(`id="${id}"`),`Missing interaction target: ${id}`);
for (const file of ['app.js','launchpad-config.js','trade-core.js','trade.js','share-core.js','social.js','pwa.js','sw.js']) new vm.Script(read(file));
console.log(`PASS: ${tokens.length} unique listings, all artwork, mint format checks, asset references, interaction targets, and JS syntax.`);

for(const file of ['index.html','creators.html']){
 const page=read(file);
 for(const asset of ['launchpad.css','launchpad.js','social.js','pwa.js'])assert.ok(page.includes(asset),`${file}: ${asset}`);
 assert.ok(!page.includes('src="trade.js"'),`${file} should not load trading UI`);
}
new vm.Script(read('launchpad.js'));
console.log('PASS: community pages, lightweight script boundaries, and application JS syntax.');

for(const file of ['city.js','city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-clans.js','city-monk.js','city-room-visuals.js','city-rise-visuals.js','city-visuals.js','city-districts.js','city-network.js','city-room-client.js'])new vm.Script(read(file));
for(const file of ['city.html','city-roadmap.html','city.css','server/city-server.mjs'])assert.ok(fs.existsSync(path.join(root,file)),`Missing city release file: ${file}`);
assert.ok(read('index.html').includes('href="city.html"'),'Homepage must link to the playable city');
const networkContext={window:{}};vm.runInNewContext(read('city-network.js'),networkContext);const network=networkContext.window.MEME_CITY_NETWORK;assert.equal(typeof network.enabled,'boolean');if(network.enabled)assert.ok(/^https:\/\//.test(network.apiBase),'Public room service must use HTTPS');
console.log('PASS: Meme City assets, script syntax, homepage entry and public solo configuration.');

for(const id of ['pause-toggle','fullscreen-toggle','mission-kicker','mission-fill','quick-job','ready-countdown'])assert.ok(read('city.html').includes(`id="${id}"`),`Missing polished game control: ${id}`);
console.log('PASS: Night Shift control targets.');

assert.ok(read('city.html').includes('city-visuals.js'),'Clothing renderer must load before the game');
assert.ok(read('.github/workflows/pages.yml').includes('city-visuals.js'),'Clothing renderer must ship in Pages builds');
console.log('PASS: streetwear renderer and deployment references.');

assert.ok(read('city.html').includes('city-districts.js'),'District renderer must load');
assert.ok(read('.github/workflows/pages.yml').includes('city-districts.js'),'District renderer must deploy');

for(const file of ['city-rise.js','city-interiors.js','city-clans.js','city-monk.js','city-room-visuals.js','city-rise-visuals.js']){assert.ok(read('city.html').includes(file));assert.ok(read('.github/workflows/pages.yml').includes(file));}
console.log('PASS: City Rising simulation and activity renderer ship with the game.');
